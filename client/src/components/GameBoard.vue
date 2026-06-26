<script setup>
import { ref, watch, onMounted } from 'vue'
import { useGame, SIZE } from '../composables/useGame.js'

const emit = defineEmits(['leave'])

const { state, makeMove } = useGame()

const CELL = 36
const PADDING = 30
const STONE_RADIUS = 14
const BOARD_SIZE = CELL * (SIZE - 1) + PADDING * 2

const canvas = ref(null)
let ctx = null

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  draw()
})

watch(() => state.board, draw, { deep: true })
watch(() => state.lastMove, draw, { deep: true })

function draw() {
  if (!ctx) return
  const W = BOARD_SIZE, H = BOARD_SIZE
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#deb887'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = '#5c3a1e'
  ctx.lineWidth = 1
  for (let i = 0; i < SIZE; i++) {
    const p = PADDING + i * CELL
    ctx.beginPath(); ctx.moveTo(PADDING, p); ctx.lineTo(PADDING + (SIZE-1)*CELL, p); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(p, PADDING); ctx.lineTo(p, PADDING + (SIZE-1)*CELL); ctx.stroke()
  }

  const stars = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]]
  ctx.fillStyle = '#5c3a1e'
  for (const [r,c] of stars) {
    ctx.beginPath()
    ctx.arc(PADDING + c*CELL, PADDING + r*CELL, 3, 0, Math.PI*2)
    ctx.fill()
  }

  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (state.board[r][c] !== 0)
        drawStone(r, c, state.board[r][c])

  if (state.lastMove) {
    const [lr, lc] = state.lastMove
    const x = PADDING + lc*CELL, y = PADDING + lr*CELL
    ctx.fillStyle = state.board[lr][lc] === 1 ? '#fff' : '#000'
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill()
  }
}

function drawStone(row, col, player) {
  const x = PADDING + col*CELL, y = PADDING + row*CELL
  const g = ctx.createRadialGradient(x-4, y-4, 2, x, y, STONE_RADIUS)
  if (player === 1) { g.addColorStop(0,'#555'); g.addColorStop(1,'#000') }
  else { g.addColorStop(0,'#fff'); g.addColorStop(1,'#bbb') }
  ctx.beginPath(); ctx.arc(x, y, STONE_RADIUS, 0, Math.PI*2)
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = player === 1 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1; ctx.stroke()
}

function isMyTurn() {
  return (state.myColor === 'black' && state.turn === 1) ||
         (state.myColor === 'white' && state.turn === 2)
}

function handleClick(e) {
  if (state.gameOver || !state.connected) return
  if (!isMyTurn()) return

  const rect = canvas.value.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height
  const mx = (e.clientX - rect.left) * scaleX
  const my = (e.clientY - rect.top) * scaleY
  const col = Math.round((mx - PADDING) / CELL)
  const row = Math.round((my - PADDING) / CELL)
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return

  makeMove(row, col)
}
</script>

<template>
  <div class="game">
    <div class="header">
      <div class="header-left">
        <span class="room-badge">房间 {{ state.roomId }}</span>
        <div class="turn-indicator">
          <span v-if="state.gameOver">游戏结束</span>
          <span v-else-if="!isMyTurn()">对方思考中</span>
          <span v-else>你的回合</span>
          <span
            class="stone-preview"
            :class="isMyTurn() && !state.gameOver ? state.myColor : state.turn === 1 ? 'black' : 'white'"
          ></span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="conn-status">
          <span class="conn-dot" :class="{ disconnected: !state.connected }"></span>
          {{ state.connected ? '已连接' : '断开' }}
        </div>
        <button class="btn btn-sm" @click="$emit('leave')">退出</button>
      </div>
    </div>
    <canvas
      ref="canvas"
      :width="BOARD_SIZE"
      :height="BOARD_SIZE"
      @click="handleClick"
    ></canvas>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.room-badge {
  background: #5c3a1e;
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  cursor: pointer;
  user-select: all;
}
.room-badge:hover { background: #7a4f2e; }
.turn-indicator {
  color: #5c3a1e;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}
.stone-preview {
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(0,0,0,0.2);
}
.stone-preview.black { background: radial-gradient(circle at 35% 35%, #555, #000); }
.stone-preview.white { background: radial-gradient(circle at 35% 35%, #fff, #ccc); }
canvas {
  display: block;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.15);
  max-width: 100%;
  height: auto;
}
.conn-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #7a5f3e;
}
.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
}
.conn-dot.disconnected { background: #f44336; }
.btn {
  padding: 10px 28px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  background: #5c3a1e;
  color: #fff;
}
.btn:hover { background: #7a4f2e; }
.btn-sm { padding: 6px 16px; font-size: 13px; }
</style>
