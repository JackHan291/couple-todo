import { WebSocketServer } from 'ws';

// roomId -> Set of WebSocket connections
const rooms = new Map();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('[WS] New connection');

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Client must send "join" message first to identify their room
        if (msg.type === 'join') {
          const roomId = msg.roomId;
          if (!roomId) return;

          ws.roomId = roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId).add(ws);
          console.log(`[WS] Client joined room ${roomId} (${rooms.get(roomId).size} clients)`);
        }
      } catch (e) {
        console.error('[WS] Invalid message:', e.message);
      }
    });

    ws.on('close', () => {
      if (ws.roomId) {
        const room = rooms.get(ws.roomId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            rooms.delete(ws.roomId);
          }
          console.log(`[WS] Client left room ${ws.roomId} (${room.size || 0} clients)`);
        }
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
    });
  });

  return {
    /**
     * Broadcast a message to all OTHER clients in the same room (not the sender)
     */
    broadcast(roomId, message, excludeWs) {
      const room = rooms.get(roomId);
      if (!room) return;

      const payload = JSON.stringify(message);
      for (const client of room) {
        if (client !== excludeWs && client.readyState === WebSocketServer.OPEN) {
          client.send(payload);
        }
      }
      console.log(`[WS] Broadcast to room ${roomId}: ${JSON.stringify(message)}`);
    },

    /**
     * Broadcast to ALL clients in the room (including sender)
     */
    broadcastAll(roomId, message) {
      const room = rooms.get(roomId);
      if (!room) return;

      const payload = JSON.stringify(message);
      for (const client of room) {
        if (client.readyState === WebSocketServer.OPEN) {
          client.send(payload);
        }
      }
      console.log(`[WS] Broadcast to all in room ${roomId}: ${JSON.stringify(message)}`);
    }
  };
}
