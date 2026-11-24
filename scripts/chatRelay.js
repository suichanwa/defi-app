const { WebSocketServer } = require('ws');

const DEFAULT_PORT = 8082;
const DEFAULT_HOST = '127.0.0.1';
let serverInstance = null;

function resolveRelayConfig(portOrOptions, hostArg) {
  const envPort = Number(process.env.CHAT_RELAY_PORT);
  const defaultPort = Number.isFinite(envPort) && envPort > 0 ? envPort : DEFAULT_PORT;
  const defaultHost = process.env.CHAT_RELAY_HOST?.trim() || DEFAULT_HOST;

  if (portOrOptions && typeof portOrOptions === 'object') {
    return {
      port: portOrOptions.port ?? defaultPort,
      host: portOrOptions.host?.trim() || defaultHost,
    };
  }

  return {
    port: typeof portOrOptions === 'number' ? portOrOptions : defaultPort,
    host: (typeof hostArg === 'string' && hostArg.trim()) || defaultHost,
  };
}

function startChatRelay(portOrOptions = DEFAULT_PORT, hostArg) {
  if (serverInstance) {
    return serverInstance;
  }

  const { port, host } = resolveRelayConfig(portOrOptions, hostArg);

  try {
    const wss = new WebSocketServer({ port, host });
    serverInstance = wss;

    // roomId -> Set<WebSocket>
    const rooms = new Map();
    // roomId -> Array<recent messages> (keep last 50)
    const recentMessages = new Map();

    wss.on('connection', (ws, req) => {
      let currentRoom = null;
      let currentUser = null;
      const clientIp = req.socket.remoteAddress;

      ws.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          const action = data.action || data.type;

          if (action === 'join') {
            currentRoom = data.roomId || 'global';
            currentUser = data.user || 'anonymous';
            if (!rooms.has(currentRoom)) {
              rooms.set(currentRoom, new Set());
            }
            rooms.get(currentRoom).add(ws);

            const count = rooms.get(currentRoom).size;
            console.log(`[ChatRelay] Client joined room '${currentRoom}': user='${currentUser}' (total clients in room: ${count})`);

            // Send presence sync to everyone in the room
            const syncMsg = JSON.stringify({ type: 'presence_sync', roomId: currentRoom, count });
            for (const client of rooms.get(currentRoom)) {
              if (client.readyState === 1) {
                client.send(syncMsg);
              }
            }

            // Send recent room messages to the newly joined client
            const history = recentMessages.get(currentRoom) || [];
            for (const msg of history) {
              if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'message', roomId: currentRoom, payload: msg, fromHistory: true }));
              }
            }
            return;
          }

          if (action === 'leave' || action === 'presence_leave') {
            const roomId = data.roomId || currentRoom;
            if (roomId && rooms.has(roomId)) {
              const sockets = rooms.get(roomId);
              sockets.delete(ws);
              const count = sockets.size;
              console.log(`[ChatRelay] Client left room '${roomId}' (remaining: ${count})`);
              const syncMsg = JSON.stringify({ type: 'presence_sync', roomId, count });
              for (const client of sockets) {
                if (client.readyState === 1) {
                  client.send(syncMsg);
                }
              }
            }
            return;
          }

          // Broadcast message or typing to all other clients in the room
          const targetRoom = data.roomId || currentRoom;
          if (targetRoom && rooms.has(targetRoom)) {
            // If it's a chat message, cache it in room history
            if (data.type === 'message' && data.payload) {
              if (!recentMessages.has(targetRoom)) {
                recentMessages.set(targetRoom, []);
              }
              const list = recentMessages.get(targetRoom);
              // Avoid duplicates in history
              if (!list.some(m => m.id === data.payload.id)) {
                list.push(data.payload);
                if (list.length > 50) list.shift();
              }
            }

            const sockets = rooms.get(targetRoom);
            let sentCount = 0;
            for (const client of sockets) {
              if (client !== ws && client.readyState === 1) {
                client.send(raw.toString());
                sentCount++;
              }
            }
            if (data.type === 'message') {
              console.log(`[ChatRelay] Broadcast message in '${targetRoom}' from '${data.payload?.author || currentUser}' to ${sentCount} peer(s)`);
            }
          }
        } catch (e) {
          console.warn('[ChatRelay] Error handling message:', e.message);
        }
      });

      const handleLeave = () => {
        if (currentRoom && rooms.has(currentRoom)) {
          const sockets = rooms.get(currentRoom);
          sockets.delete(ws);
          const count = sockets.size;
          console.log(`[ChatRelay] Client disconnected from room '${currentRoom}' (remaining: ${count})`);
          const syncMsg = JSON.stringify({ type: 'presence_sync', roomId: currentRoom, count });
          for (const client of sockets) {
            if (client.readyState === 1) {
              client.send(syncMsg);
            }
          }
        }
      };

      ws.on('close', handleLeave);
      ws.on('error', (err) => {
        console.warn('[ChatRelay] Socket error:', err.message);
      });
    });

    wss.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[ChatRelay] Port ${port} is already in use.`);
        return;
      }
      console.warn('[ChatRelay] WebSocketServer error:', err.message);
    });

    console.log(`[ChatRelay] Local chat relay server ready on ${host}:${port}`);
    return wss;
  } catch (err) {
    console.warn('[ChatRelay] Failed to start local chat relay:', err.message);
    return null;
  }
}

if (require.main === module) {
  startChatRelay();
}

module.exports = { startChatRelay, resolveRelayConfig };
