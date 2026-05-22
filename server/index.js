import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { generateRoomCode } from './roomCode.js';
import { setupWebSocket } from './websocket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const wsBroadcast = setupWebSocket(server);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ─── Serve frontend static files ─────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── Room API ────────────────────────────────────────────

app.post('/api/rooms', (req, res) => {
  let roomId = req.body?.roomId;

  if (roomId) {
    // Custom room ID: validate 6-digit
    if (!/^\d{6}$/.test(roomId)) {
      return res.status(400).json({ error: 'roomId must be 6 digits' });
    }
    if (db.prepare('SELECT id FROM rooms WHERE id = ?').get(roomId)) {
      return res.status(409).json({ error: 'room already exists' });
    }
  } else {
    do {
      roomId = generateRoomCode();
    } while (db.prepare('SELECT id FROM rooms WHERE id = ?').get(roomId));
  }

  db.prepare('INSERT INTO rooms (id) VALUES (?)').run(roomId);
  console.log(`[Room] Created: ${roomId}`);
  res.json({ roomId });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(req.params.roomId);
  res.json({ exists: !!room });
});

// ─── Helper: format todo row ─────────────────────────────

function formatTodo(row) {
  return { id: row.id, text: row.text, done: !!row.done, created_at: row.created_at };
}

// ─── Todo CRUD API (with WebSocket broadcast) ────────────

app.get('/api/rooms/:roomId/todos', (req, res) => {
  const todos = db.prepare(
    'SELECT id, text, done, created_at FROM todos WHERE room_id = ? ORDER BY created_at ASC'
  ).all(req.params.roomId);
  res.json(todos.map(formatTodo));
});

app.post('/api/rooms/:roomId/todos', (req, res) => {
  const { roomId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'room not found' });
  }

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO todos (id, room_id, text) VALUES (?, ?, ?)').run(id, roomId, text.trim());
  const todo = formatTodo(db.prepare('SELECT id, text, done, created_at FROM todos WHERE id = ?').get(id));

  wsBroadcast.broadcast(roomId, { type: 'todo:created', todo });

  res.status(201).json(todo);
});

app.patch('/api/rooms/:roomId/todos/:todoId', (req, res) => {
  const { roomId, todoId } = req.params;
  const { done } = req.body;

  if (typeof done !== 'boolean') {
    return res.status(400).json({ error: 'done (boolean) is required' });
  }

  const result = db.prepare(
    'UPDATE todos SET done = ? WHERE id = ? AND room_id = ?'
  ).run(done ? 1 : 0, todoId, roomId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'todo not found' });
  }

  const todo = formatTodo(db.prepare('SELECT id, text, done, created_at FROM todos WHERE id = ?').get(todoId));
  wsBroadcast.broadcast(roomId, { type: 'todo:updated', todo });

  res.json(todo);
});

app.put('/api/rooms/:roomId/todos/:todoId', (req, res) => {
  const { roomId, todoId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const result = db.prepare(
    'UPDATE todos SET text = ? WHERE id = ? AND room_id = ?'
  ).run(text.trim(), todoId, roomId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'todo not found' });
  }

  const todo = formatTodo(db.prepare('SELECT id, text, done, created_at FROM todos WHERE id = ?').get(todoId));
  wsBroadcast.broadcast(roomId, { type: 'todo:updated', todo });

  res.json(todo);
});

app.delete('/api/rooms/:roomId/todos/:todoId', (req, res) => {
  const { roomId, todoId } = req.params;

  const result = db.prepare('DELETE FROM todos WHERE id = ? AND room_id = ?').run(todoId, roomId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'todo not found' });
  }

  wsBroadcast.broadcast(roomId, { type: 'todo:deleted', todoId });

  res.json({ success: true });
});

// ─── SPA fallback: serve index.html for any non-API route ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── Start Server ───────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] http://localhost:${PORT}`);
});
