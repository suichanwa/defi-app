import type { ChatMessage } from '@app-types/securechat-types/secureChat';

export type TypingPayload = {
  chatId: string;
  senderId?: string;
  authorId?: string;
  author?: string;
  isTyping: boolean;
};

export type RoomTransportCallbacks = {
  roomId: string;
  presenceKey: string;
  presencePayload?: Record<string, unknown>;
  onIncomingMessage: (message: ChatMessage) => void;
  onTyping?: (payload: TypingPayload) => void;
  onSubscribed?: () => void;
  onError?: () => void;
  onPresenceChange?: (count: number) => void;
};

function getLocalRelayUrls(): string[] {
  const urls: string[] = [];
  try {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname;
      urls.push(`ws://${host}:8082`);
      if (host === 'localhost') {
        urls.push('ws://127.0.0.1:8082');
      } else if (host === '127.0.0.1') {
        urls.push('ws://localhost:8082');
      }
    }
  } catch {}
  if (!urls.includes('ws://localhost:8082')) {
    urls.push('ws://localhost:8082');
  }
  if (!urls.includes('ws://127.0.0.1:8082')) {
    urls.push('ws://127.0.0.1:8082');
  }
  return urls;
}

export class DecentralizedRoomTransport {
  private roomId: string;
  private presenceKey: string;
  private presencePayload?: Record<string, unknown>;
  private callbacks: RoomTransportCallbacks;

  private seenMessageIds = new Set<string>();
  private peerPresences = new Map<string, number>(); // presenceKey -> last seen ts
  private serverReportedCount: number | null = null;
  private currentParticipantCount = 0;

  private localSocket: WebSocket | null = null;
  private broadcastChannel: any = null;
  private pendingQueue: string[] = [];

  private pingTimer: any = null;
  private pruneTimer: any = null;
  private reconnectTimer: any = null;
  private isDestroyed = false;
  private hasReportedSubscribed = false;

  constructor(callbacks: RoomTransportCallbacks) {
    this.callbacks = callbacks;
    this.roomId = callbacks.roomId || 'global';
    this.presenceKey = callbacks.presenceKey || 'anonymous';
    this.presencePayload = callbacks.presencePayload;

    this.init();
  }

  private init() {
    this.initBroadcastChannel();
    this.connectLocalRelay();

    // Broadcast presence periodically and prune stale peers
    this.pingTimer = setInterval(() => this.broadcastPresence(), 10000);
    this.pruneTimer = setInterval(() => this.pruneStalePeers(), 4000);

    // Initial ping and subscribed report
    setTimeout(() => {
      this.broadcastPresence();
      this.notifySubscribed();
    }, 200);
  }

  private notifySubscribed() {
    if (this.hasReportedSubscribed || this.isDestroyed) return;
    this.hasReportedSubscribed = true;
    this.callbacks.onSubscribed?.();
    this.updateParticipantCount();
  }

  private updateParticipantCount() {
    if (this.isDestroyed) return;
    const peerCount = this.peerPresences.size;
    const computed = Math.max(1, peerCount + 1);
    const finalCount = this.serverReportedCount !== null ? Math.max(computed, this.serverReportedCount) : computed;

    if (finalCount !== this.currentParticipantCount) {
      this.currentParticipantCount = finalCount;
      this.callbacks.onPresenceChange?.(finalCount);
    }
  }

  private pruneStalePeers() {
    const now = Date.now();
    let changed = false;
    for (const [peer, lastSeen] of this.peerPresences.entries()) {
      if (now - lastSeen > 26000) {
        this.peerPresences.delete(peer);
        changed = true;
      }
    }
    if (changed) {
      this.updateParticipantCount();
    }
  }

  private handleIncomingPayload(rawPayload: any, source: string) {
    if (this.isDestroyed || !rawPayload) return;

    // 1. Presence Sync from relay server
    if (rawPayload.type === 'presence_sync') {
      const count = Number(rawPayload.count);
      if (!Number.isNaN(count) && count > 0) {
        this.serverReportedCount = count;
        this.updateParticipantCount();
      }
      return;
    }

    // 2. Ephemeral Presence Ping
    if (rawPayload.type === 'presence' || rawPayload.event === 'presence') {
      const user = rawPayload.user || rawPayload.presenceKey;
      if (user && user !== this.presenceKey) {
        this.peerPresences.set(user, Date.now());
        this.updateParticipantCount();
      }
      return;
    }

    // 3. Ephemeral Presence Leave
    if (rawPayload.type === 'presence_leave' || rawPayload.event === 'presence_leave') {
      const user = rawPayload.user || rawPayload.presenceKey;
      if (user && this.peerPresences.has(user)) {
        this.peerPresences.delete(user);
        this.updateParticipantCount();
      }
      return;
    }

    // 4. Typing indicator
    if (rawPayload.type === 'typing' || rawPayload.event === 'typing') {
      const payload: TypingPayload = rawPayload.payload || rawPayload;
      if (payload && payload.chatId) {
        this.callbacks.onTyping?.(payload);
      }
      return;
    }

    // 5. Chat message
    const msg: ChatMessage = rawPayload.payload || rawPayload;
    if (msg && msg.id && msg.content !== undefined) {
      if (this.seenMessageIds.has(msg.id)) return;
      this.seenMessageIds.add(msg.id);

      // Register presence for the sender as well
      const sender = msg.authorId || msg.author;
      if (sender && sender !== this.presenceKey) {
        this.peerPresences.set(sender, Date.now());
        this.updateParticipantCount();
      }

      console.log(`[RoomTransport] Received message from ${msg.author}: ${msg.content.slice(0, 30)}`);
      this.callbacks.onIncomingMessage(msg);
    }
  }

  /* ---------------- BroadcastChannel (Same-Browser Multi-Tab) ---------------- */
  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new window.BroadcastChannel(`defi_chat_room_${this.roomId}`);
        bc.onmessage = (event: MessageEvent) => {
          this.handleIncomingPayload(event.data, 'broadcast-channel');
        };
        this.broadcastChannel = bc;
      }
    } catch {}
  }

  /* ---------------- Local WebSocket Relay (Local Network / Multi-Browser) ---------------- */
  private connectLocalRelay() {
    if (this.isDestroyed) return;
    const urls = getLocalRelayUrls();

    let connected = false;

    const tryConnect = (index: number) => {
      if (connected || this.isDestroyed || index >= urls.length) return;
      const targetUrl = urls[index];

      try {
        const ws = new WebSocket(targetUrl);

        ws.onopen = () => {
          if (this.isDestroyed) {
            ws.close();
            return;
          }
          connected = true;
          this.localSocket = ws;
          console.log(`[RoomTransport] Connected to local chat relay at ${targetUrl}`);
          this.notifySubscribed();

          // Send join message
          ws.send(
            JSON.stringify({
              action: 'join',
              roomId: this.roomId,
              user: this.presenceKey,
              presencePayload: this.presencePayload,
            }),
          );

          // Flush any messages queued before open
          while (this.pendingQueue.length > 0) {
            const queued = this.pendingQueue.shift();
            if (queued && ws.readyState === 1) {
              ws.send(queued);
            }
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);
            this.handleIncomingPayload(data, 'local-relay');
          } catch {}
        };

        ws.onerror = () => {
          if (!connected) {
            tryConnect(index + 1);
          }
        };

        ws.onclose = () => {
          if (this.localSocket === ws) {
            this.localSocket = null;
            this.serverReportedCount = null;
            this.updateParticipantCount();
            // Schedule auto-reconnect
            if (!this.isDestroyed && !this.reconnectTimer) {
              this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.connectLocalRelay();
              }, 2500);
            }
          }
        };
      } catch {
        tryConnect(index + 1);
      }
    };

    tryConnect(0);
  }

  /* ---------------- Outgoing Dispatches ---------------- */
  public async sendBroadcast(message: ChatMessage): Promise<void> {
    if (this.isDestroyed) return;
    this.seenMessageIds.add(message.id);

    const wirePayload = {
      type: 'message',
      roomId: this.roomId,
      payload: message,
    };
    const wireJson = JSON.stringify(wirePayload);

    // 1. BroadcastChannel (instant for other tabs in same browser)
    try {
      this.broadcastChannel?.postMessage(wirePayload);
    } catch {}

    // 2. Local WebSocket Relay (cross-browser / LAN)
    if (this.localSocket && this.localSocket.readyState === 1) {
      try {
        this.localSocket.send(wireJson);
      } catch (err) {
        console.warn('[RoomTransport] Failed to send to local relay:', err);
      }
    } else {
      // Queue until socket opens
      this.pendingQueue.push(wireJson);
    }
  }

  public async sendTyping(payload: TypingPayload): Promise<void> {
    if (this.isDestroyed) return;

    const wirePayload = {
      type: 'typing',
      roomId: this.roomId,
      payload,
    };
    const wireJson = JSON.stringify(wirePayload);

    try {
      this.broadcastChannel?.postMessage(wirePayload);
    } catch {}

    if (this.localSocket && this.localSocket.readyState === 1) {
      try {
        this.localSocket.send(wireJson);
      } catch {}
    }
  }

  private broadcastPresence() {
    if (this.isDestroyed) return;

    const wirePayload = {
      type: 'presence',
      roomId: this.roomId,
      user: this.presenceKey,
      payload: this.presencePayload,
      ts: Date.now(),
    };
    const wireJson = JSON.stringify(wirePayload);

    try {
      this.broadcastChannel?.postMessage(wirePayload);
    } catch {}

    if (this.localSocket && this.localSocket.readyState === 1) {
      try {
        this.localSocket.send(wireJson);
      } catch {}
    }
  }

  public getParticipantCount(): number {
    return Math.max(1, this.currentParticipantCount);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // Send presence leave
    try {
      const leavePayload = {
        type: 'presence_leave',
        roomId: this.roomId,
        user: this.presenceKey,
      };
      const leaveJson = JSON.stringify(leavePayload);
      this.broadcastChannel?.postMessage(leavePayload);
      if (this.localSocket && this.localSocket.readyState === 1) {
        this.localSocket.send(leaveJson);
      }
    } catch {}

    try {
      this.broadcastChannel?.close();
    } catch {}

    try {
      this.localSocket?.close();
    } catch {}
    this.localSocket = null;
  }
}
