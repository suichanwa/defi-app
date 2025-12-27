import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { ChatMessage } from '@app-types/securechat-types/secureChat';

type P2PStatus = 'idle' | 'connecting' | 'connected' | 'error';

type OfferPayload = {
  type: 'offer';
  sdp: string;
  sessionId: string;
  label: string;
};

type AnswerPayload = {
  type: 'answer';
  sdp: string;
  sessionId: string;
  label: string;
};

type IceCandidateInit = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

type CandidatesPayload = {
  type: 'candidates';
  sessionId: string;
  candidates: IceCandidateInit[];
};

type P2PFileMeta = {
  id: string;
  name: string;
  mime: string;
  size: number;
  totalChunks: number;
  isImage: boolean;
  author: string;
  authorId?: string;
  createdAt: string;
};

type IncomingFileState = {
  meta: P2PFileMeta;
  chunks: string[];
  received: number;
};

type UseP2PDirectMessagesArgs = {
  displayLabel: string;
  authorId?: string;
  onMessage: (message: ChatMessage, chatId: string) => void;
  onLog?: (line: string) => void;
};

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const MAX_CHUNK_SIZE = 16000;

const createId = () => Math.random().toString(36).slice(2, 10);

const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));
    reader.readAsDataURL(blob);
  });

const readFileAsBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    if (uri.startsWith('data:')) {
      const comma = uri.indexOf(',');
      return comma >= 0 ? uri.slice(comma + 1) : uri;
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    const dataUrl = await readBlobAsDataUrl(blob);
    const comma = dataUrl.indexOf(',');
    return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
};

const writeBase64ToFile = async (base64: string, name: string): Promise<string> => {
  if (Platform.OS === 'web') {
    return `data:application/octet-stream;base64,${base64}`;
  }
  const fileName = sanitizeName(name || `p2p-${createId()}`);
  const fileUri = `${FileSystem.cacheDirectory ?? ''}p2p-${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
};

const getRTC = () => {
  if (Platform.OS === 'web') {
    const anyGlobal = globalThis as typeof globalThis & {
      RTCPeerConnection?: any;
      RTCSessionDescription?: any;
      RTCIceCandidate?: any;
    };
    return {
      RTCPeerConnection: anyGlobal.RTCPeerConnection,
      RTCSessionDescription: anyGlobal.RTCSessionDescription,
      RTCIceCandidate: anyGlobal.RTCIceCandidate,
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webrtc = require('react-native-webrtc');
  return {
    RTCPeerConnection: webrtc.RTCPeerConnection,
    RTCSessionDescription: webrtc.RTCSessionDescription,
    RTCIceCandidate: webrtc.RTCIceCandidate,
  };
};

export function useP2PDirectMessages({ displayLabel, authorId, onMessage, onLog }: UseP2PDirectMessagesArgs) {
  const [status, setStatus] = useState<P2PStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [peerLabel, setPeerLabel] = useState<string | null>(null);
  const [localOffer, setLocalOffer] = useState<string>('');
  const [localAnswer, setLocalAnswer] = useState<string>('');
  const [localCandidates, setLocalCandidates] = useState<string>('');
  const pcRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const localCandidatesRef = useRef<IceCandidateInit[]>([]);
  const incomingFilesRef = useRef<Record<string, IncomingFileState>>({});

  const chatId = useMemo(() => (sessionId ? `p2p:${sessionId}` : ''), [sessionId]);

  const log = useCallback(
    (line: string) => {
      onLog?.(line);
    },
    [onLog],
  );

  const teardown = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    incomingFilesRef.current = {};
    localCandidatesRef.current = [];
    setLocalCandidates('');
    setLocalOffer('');
    setLocalAnswer('');
    setPeerLabel(null);
    setSessionId(null);
    setStatus('idle');
  }, []);

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const { RTCPeerConnection } = getRTC();
    if (!RTCPeerConnection) {
      setStatus('error');
      throw new Error('WebRTC not available in this environment.');
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      localCandidatesRef.current.push(event.candidate.toJSON());
      setLocalCandidates(
        JSON.stringify({
          type: 'candidates',
          sessionId: sessionId ?? 'unknown',
          candidates: localCandidatesRef.current,
        } satisfies CandidatesPayload),
      );
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setStatus('connected');
        log('P2P connection established.');
      } else if (state === 'failed' || state === 'disconnected') {
        setStatus('error');
        log(`P2P connection ${state}.`);
      }
    };
    pc.ondatachannel = (event) => {
      channelRef.current = event.channel;
      bindChannel(event.channel);
    };
    pcRef.current = pc;
    return pc;
  }, [log, sessionId]);

  const sendControl = useCallback((payload: object) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return false;
    channel.send(JSON.stringify(payload));
    return true;
  }, []);

  const bindChannel = useCallback(
    (channel: any) => {
      channel.onopen = () => {
        setStatus('connected');
        sendControl({ kind: 'hello', label: displayLabel, authorId: authorId ?? null });
      };
      channel.onmessage = async (event) => {
        if (typeof event.data !== 'string') return;
        let payload: any;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!payload?.kind) return;
        if (payload.kind === 'hello') {
          if (payload.label) setPeerLabel(String(payload.label));
          return;
        }
        if (payload.kind === 'text') {
          const message: ChatMessage = {
            id: payload.id ?? createId(),
            chatId,
            author: payload.author ?? 'Peer',
            authorId: payload.authorId ?? undefined,
            content: payload.content ?? '',
            timestamp: new Date(payload.createdAt ?? Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            createdAt: payload.createdAt ?? new Date().toISOString(),
            outgoing: false,
            type: 'text',
          };
          onMessage(message, chatId);
          return;
        }
        if (payload.kind === 'file-meta') {
          const meta: P2PFileMeta = payload.meta;
          incomingFilesRef.current[meta.id] = {
            meta,
            chunks: new Array(meta.totalChunks),
            received: 0,
          };
          return;
        }
        if (payload.kind === 'file-chunk') {
          const state = incomingFilesRef.current[payload.id];
          if (!state) return;
          state.chunks[payload.index] = payload.data;
          state.received += 1;
          if (state.received >= state.meta.totalChunks) {
            const base64 = state.chunks.join('');
            const { meta } = state;
            delete incomingFilesRef.current[payload.id];
            let fileUri = '';
            if (meta.isImage) {
              if (Platform.OS === 'web') {
                fileUri = `data:${meta.mime};base64,${base64}`;
              } else {
                fileUri = await writeBase64ToFile(base64, meta.name);
              }
              const message: ChatMessage = {
                id: meta.id,
                chatId,
                author: meta.author,
                authorId: meta.authorId,
                content: 'Photo',
                timestamp: new Date(meta.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: meta.createdAt,
                outgoing: false,
                type: 'image',
                imageUri: fileUri,
              };
              onMessage(message, chatId);
              return;
            }
            if (Platform.OS === 'web') {
              fileUri = `data:${meta.mime};base64,${base64}`;
            } else {
              fileUri = await writeBase64ToFile(base64, meta.name);
            }
            const message: ChatMessage = {
              id: meta.id,
              chatId,
              author: meta.author,
              authorId: meta.authorId,
              content: `File: ${meta.name}`,
              timestamp: new Date(meta.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt: meta.createdAt,
              outgoing: false,
              type: 'file',
              fileUri,
              fileName: meta.name,
              fileSize: meta.size,
              fileMime: meta.mime,
            };
            onMessage(message, chatId);
          }
          return;
        }
      };
    },
    [authorId, chatId, displayLabel, onMessage, sendControl],
  );

  const createOffer = useCallback(async () => {
    const pc = ensurePeerConnection();
    setStatus('connecting');
    const nextSessionId = createId();
    setSessionId(nextSessionId);
    localCandidatesRef.current = [];
    const channel = pc.createDataChannel('p2p-chat');
    channelRef.current = channel;
    bindChannel(channel);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const payload: OfferPayload = {
      type: 'offer',
      sdp: offer.sdp ?? '',
      sessionId: nextSessionId,
      label: displayLabel,
    };
    const offerJson = JSON.stringify(payload);
    setLocalOffer(offerJson);
    log('Created P2P offer.');
    return offerJson;
  }, [bindChannel, displayLabel, ensurePeerConnection, log]);

  const createAnswer = useCallback(
    async (offerJson: string) => {
      const parsed = JSON.parse(offerJson) as OfferPayload;
      if (!parsed?.sdp) throw new Error('Invalid offer payload.');
      const pc = ensurePeerConnection();
      setStatus('connecting');
      setSessionId(parsed.sessionId);
      setPeerLabel(parsed.label ?? null);
      localCandidatesRef.current = [];
      const offerDesc = { type: 'offer', sdp: parsed.sdp } as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offerDesc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const payload: AnswerPayload = {
        type: 'answer',
        sdp: answer.sdp ?? '',
        sessionId: parsed.sessionId,
        label: displayLabel,
      };
      const answerJson = JSON.stringify(payload);
      setLocalAnswer(answerJson);
      log('Created P2P answer.');
      return answerJson;
    },
    [displayLabel, ensurePeerConnection, log],
  );

  const acceptAnswer = useCallback(
    async (answerJson: string) => {
      const parsed = JSON.parse(answerJson) as AnswerPayload;
      if (!parsed?.sdp) throw new Error('Invalid answer payload.');
      const pc = ensurePeerConnection();
      setPeerLabel(parsed.label ?? null);
      await pc.setRemoteDescription({ type: 'answer', sdp: parsed.sdp } as RTCSessionDescriptionInit);
      log('Applied P2P answer.');
    },
    [ensurePeerConnection, log],
  );

  const addRemoteCandidates = useCallback(
    async (candidatesJson: string) => {
      const parsed = JSON.parse(candidatesJson) as CandidatesPayload;
      if (!parsed?.candidates?.length) return;
      const pc = ensurePeerConnection();
      const { RTCIceCandidate } = getRTC();
      for (const candidate of parsed.candidates) {
        try {
          const ice = RTCIceCandidate ? new RTCIceCandidate(candidate) : candidate;
          await pc.addIceCandidate(ice);
        } catch (error) {
          log(`ICE candidate error: ${error instanceof Error ? error.message : 'unknown'}`);
        }
      }
      log('Remote ICE candidates added.');
    },
    [ensurePeerConnection, log],
  );

  const sendText = useCallback(
    (content: string) => {
      if (!chatId) return null;
      const createdAt = new Date().toISOString();
      const id = createId();
      const payload = {
        kind: 'text',
        id,
        content,
        author: displayLabel,
        authorId,
        createdAt,
      };
      const ok = sendControl(payload);
      if (!ok) return null;
      const message: ChatMessage = {
        id,
        chatId,
        author: displayLabel,
        authorId,
        content,
        timestamp: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt,
        outgoing: true,
        type: 'text',
      };
      return message;
    },
    [authorId, chatId, displayLabel, sendControl],
  );

  const sendFile = useCallback(
    async (args: { uri: string; name: string; mime: string; size: number; isImage: boolean }) => {
      if (!chatId) return null;
      const createdAt = new Date().toISOString();
      const id = createId();
      const base64 = await readFileAsBase64(args.uri);
      const chunks: string[] = [];
      for (let i = 0; i < base64.length; i += MAX_CHUNK_SIZE) {
        chunks.push(base64.slice(i, i + MAX_CHUNK_SIZE));
      }
      const meta: P2PFileMeta = {
        id,
        name: args.name,
        mime: args.mime,
        size: args.size,
        totalChunks: chunks.length,
        isImage: args.isImage,
        author: displayLabel,
        authorId,
        createdAt,
      };
      const ok = sendControl({ kind: 'file-meta', meta });
      if (!ok) return null;
      chunks.forEach((chunk, index) => {
        sendControl({ kind: 'file-chunk', id, index, data: chunk });
      });
      if (args.isImage) {
        const message: ChatMessage = {
          id,
          chatId,
          author: displayLabel,
          authorId,
          content: 'Photo',
          timestamp: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt,
          outgoing: true,
          type: 'image',
          imageUri: args.uri,
        };
        return message;
      }
      const message: ChatMessage = {
        id,
        chatId,
        author: displayLabel,
        authorId,
        content: `File: ${args.name}`,
        timestamp: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt,
        outgoing: true,
        type: 'file',
        fileUri: args.uri,
        fileName: args.name,
        fileSize: args.size,
        fileMime: args.mime,
      };
      return message;
    },
    [authorId, chatId, displayLabel, sendControl],
  );

  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  return {
    status,
    chatId,
    peerLabel,
    localOffer,
    localAnswer,
    localCandidates,
    createOffer,
    createAnswer,
    acceptAnswer,
    addRemoteCandidates,
    reset: teardown,
    sendText,
    sendFile,
  };
}
