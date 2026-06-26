const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const SIZE = 15;

// ---- HTTP Server: serve built Vue app ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'client', 'dist', filePath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(__dirname, 'client', 'dist', 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---- WebSocket ----
const wss = new WebSocketServer({ server });

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function checkWin(board, row, col, player) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let dir = -1; dir <= 1; dir += 2) {
      let nr = row + dr * dir, nc = col + dc * dir;
      while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
        count++;
        nr += dr * dir;
        nc += dc * dir;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}

function isBoardFull(board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

// roomId -> { players: [ws, ws], board, turn, state: 'waiting'|'playing'|'ended' }
const rooms = new Map();
let roomCounter = 0;

function generateRoomId() {
  roomCounter++;
  return String(roomCounter).padStart(4, '0');
}

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function handleMessage(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }

  if (msg.type === 'create_room') {
    const roomId = generateRoomId();
    rooms.set(roomId, {
      players: [ws],
      board: createBoard(),
      turn: 1,
      state: 'waiting',
    });
    ws.roomId = roomId;
    ws.playerIndex = 0;
    send(ws, { type: 'room_created', roomId });
    return;
  }

  if (msg.type === 'join_room') {
    const room = rooms.get(msg.roomId);
    if (!room) {
      send(ws, { type: 'error', message: '房间不存在' });
      return;
    }
    if (room.state !== 'waiting') {
      send(ws, { type: 'error', message: '房间已满或游戏已开始' });
      return;
    }
    room.players.push(ws);
    ws.roomId = msg.roomId;
    ws.playerIndex = 1;
    room.state = 'playing';

    // Notify both players
    send(room.players[0], { type: 'game_start', yourColor: 'black', opponentJoined: true });
    send(room.players[1], { type: 'game_start', yourColor: 'white' });
    return;
  }

  if (msg.type === 'move') {
    const room = rooms.get(ws.roomId);
    if (!room || room.state !== 'playing') return;
    const player = room.players.indexOf(ws);
    if (player === -1) return;
    // 1 = black, 2 = white, black goes first (playerIndex 0)
    const expectedPlayer = player === 0 ? 1 : 2;
    if (room.turn !== expectedPlayer) {
      send(ws, { type: 'error', message: '还没轮到你' });
      return;
    }

    const { row, col } = msg;
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE || room.board[row][col] !== 0) {
      send(ws, { type: 'error', message: '无效落子' });
      return;
    }

    room.board[row][col] = room.turn;
    const opponent = room.players[player === 0 ? 1 : 0];

    // Send move to opponent
    send(opponent, { type: 'opponent_move', row, col });

    // Check win
    if (checkWin(room.board, row, col, room.turn)) {
      room.state = 'ended';
      const winner = room.turn === 1 ? 'black' : 'white';
      send(room.players[0], { type: 'game_over', winner, row, col });
      send(room.players[1], { type: 'game_over', winner, row, col });
      return;
    }

    if (isBoardFull(room.board)) {
      room.state = 'ended';
      send(room.players[0], { type: 'game_over', winner: 'draw', row, col });
      send(room.players[1], { type: 'game_over', winner: 'draw', row, col });
      return;
    }

    room.turn = room.turn === 1 ? 2 : 1;
    return;
  }

  if (msg.type === 'restart') {
    const room = rooms.get(ws.roomId);
    if (!room) return;
    // If both players agree, restart
    if (!room.restartVotes) room.restartVotes = new Set();
    room.restartVotes.add(ws.playerIndex);
    if (room.restartVotes.size >= 2) {
      room.board = createBoard();
      room.turn = 1;
      room.state = 'playing';
      room.restartVotes = undefined;
      send(room.players[0], { type: 'restarted', yourColor: 'black' });
      send(room.players[1], { type: 'restarted', yourColor: 'white' });
    } else {
      const opponent = room.players[ws.playerIndex === 0 ? 1 : 0];
      send(opponent, { type: 'opponent_wants_restart' });
    }
    return;
  }
}

function handleDisconnect(ws) {
  const roomId = ws.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const opponent = room.players.find(p => p !== ws);
  if (opponent && opponent.readyState === 1) {
    send(opponent, { type: 'opponent_disconnected' });
  }
  rooms.delete(roomId);
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => handleMessage(ws, raw));
  ws.on('close', () => handleDisconnect(ws));
});

server.listen(PORT, () => {
  console.log(`五子棋服务启动：http://localhost:${PORT}`);
});
