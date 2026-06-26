import { reactive } from 'vue'

const SIZE = 15

const state = reactive({
  connected: false,
  roomId: '',
  myColor: null,
  turn: 1,
  gameOver: false,
  lastMove: null,
  board: createBoard(),
  inLobby: true,
  lobbyLocked: false,
  restartVoted: false,
  error: '',
  overlay: { show: false, text: '', sub: '', btn: null },
})

let ws = null

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function wsUrl() {
  if (import.meta.env.DEV) return 'ws://localhost:3000'
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}`
}

function send(data) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data))
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'room_created':
      state.error = ''
      state.roomId = msg.roomId
      state.lobbyLocked = true
      break

    case 'game_start':
      state.error = ''
      if (msg.roomId) state.roomId = msg.roomId
      state.myColor = msg.yourColor
      state.turn = 1
      state.gameOver = false
      state.lastMove = null
      state.restartVoted = false
      state.board = createBoard()
      state.inLobby = false
      state.overlay = { show: false, text: '', sub: '', btn: null }
      break

    case 'opponent_move':
      state.board[msg.row][msg.col] = state.myColor === 'black' ? 2 : 1
      state.lastMove = [msg.row, msg.col]
      state.turn = state.turn === 1 ? 2 : 1
      break

    case 'game_over':
      state.gameOver = true
      if (msg.row != null) state.lastMove = [msg.row, msg.col]
      if (msg.winner === 'draw') {
        showOverlay('平局！', '', 'restart')
      } else {
        const won = msg.winner === state.myColor
        const icon = `<span class="stone-icon ${msg.winner}"></span>`
        const label = msg.winner === 'black' ? '黑棋' : '白棋'
        showOverlay(won ? '你赢了！' : '你输了', `${icon} ${label} 获胜`, 'restart')
      }
      break

    case 'opponent_disconnected':
      state.gameOver = true
      showOverlay('对手已离开', '等待对方重新连接...', null)
      break

    case 'restarted':
      state.myColor = msg.yourColor
      state.turn = 1
      state.gameOver = false
      state.lastMove = null
      state.restartVoted = false
      state.board = createBoard()
      state.overlay = { show: false, text: '', sub: '', btn: null }
      break

    case 'opponent_wants_restart':
      if (state.overlay.show && state.overlay.btn === 'restart') {
        state.overlay = { ...state.overlay, sub: '对方已同意，点击确认开始' }
      }
      break

    case 'error':
      state.error = msg.message || ''
  }
}

let reconnectTimer = null

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
  ws = new WebSocket(wsUrl())
  state.error = ''
  ws.onopen = () => {
    state.connected = true
    if (!state.inLobby) {
      state.error = ''
    }
  }
  ws.onclose = () => {
    state.connected = false
    if (!state.inLobby && !state.gameOver) {
      showOverlay('连接已断开', '正在自动重连...', null)
    }
    clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connect, 3000)
  }
  ws.onmessage = (e) => handleMessage(JSON.parse(e.data))
}

function sendAfterConnect(msg) {
  state.error = ''
  if (ws?.readyState === WebSocket.OPEN) {
    send(msg)
    return
  }
  connect()
  const check = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      send(msg)
    } else {
      setTimeout(check, 300)
    }
  }
  check()
}

function createRoom(roomCode) {
  sendAfterConnect({ type: 'create_room', roomCode })
}

function joinRoom(roomId) {
  sendAfterConnect({ type: 'join_room', roomId })
}

function makeMove(row, col) {
  if (state.gameOver) return
  const isMyTurn = (state.myColor === 'black' && state.turn === 1) ||
                   (state.myColor === 'white' && state.turn === 2)
  if (!isMyTurn) return false
  if (state.board[row][col] !== 0) return false

  state.board[row][col] = state.myColor === 'black' ? 1 : 2
  state.lastMove = [row, col]
  state.turn = state.turn === 1 ? 2 : 1
  send({ type: 'move', row, col })
  return true
}

function requestRestart() {
  state.restartVoted = true
  state.overlay = { ...state.overlay, sub: '等待对方确认' }
  send({ type: 'restart' })
}

function leave() {
  clearTimeout(reconnectTimer)
  ws?.close()
  ws = null
  state.connected = false
  state.roomId = ''
  state.myColor = null
  state.turn = 1
  state.gameOver = false
  state.lastMove = null
  state.error = ''
  state.board = createBoard()
  state.inLobby = true
  state.lobbyLocked = false
  state.restartVoted = false
  state.overlay = { show: false, text: '', sub: '', btn: null }
}

function showOverlay(text, sub, btn) {
  state.overlay = { show: true, text, sub, btn }
}

export { SIZE }

export function useGame() {
  return {
    state,
    connect,
    createRoom,
    joinRoom,
    makeMove,
    requestRestart,
    leave,
  }
}
