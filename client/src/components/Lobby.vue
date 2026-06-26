<script setup>
import { ref } from 'vue'
import { useGame } from '../composables/useGame.js'

const { state, createRoom, joinRoom } = useGame()
const roomCode = ref('')

function handleCreate() {
  createRoom(roomCode.value.trim())
}


function handleJoin() {
  const code = roomCode.value.trim()
  if (!code) return
  joinRoom(code)
}
</script>

<template>
  <div class="lobby">
    <h1>♟ 五子棋</h1>
    <p>联机对战 · 先五子连珠者胜</p>
    <div class="btn-group">
      <input
        v-model="roomCode"
        type="text"
        placeholder="输入房间号（留空自动生成）"
        maxlength="20"
        :disabled="state.lobbyLocked"
        @keydown.enter="handleCreate"
      />
      <div class="row">
        <button class="btn" :disabled="state.lobbyLocked" @click="handleCreate">
          {{ state.lobbyLocked ? '等待对手加入...' : '创建' }}
        </button>
        <button class="btn secondary" :disabled="state.lobbyLocked" @click="handleJoin">加入</button>
      </div>
    </div>
    <div class="status" :class="{ error: state.error }">{{ state.error || (state.roomId ? `房间号：${state.roomId}  等待对手` : '输入房间号创建，或输入已有房间号加入') }}</div>
  </div>
</template>

<style scoped>
.lobby { text-align: center; }
.lobby h1 { font-size: 36px; color: #5c3a1e; margin-bottom: 8px; }
.lobby p { color: #7a5f3e; margin-bottom: 28px; }
.btn-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}
.btn-group input {
  padding: 10px 16px;
  font-size: 18px;
  border: 2px solid #b8956a;
  border-radius: 8px;
  outline: none;
  width: 260px;
  text-align: center;
  background: #f5e6d3;
  color: #5c3a1e;
  font-weight: bold;
}
.btn-group input::placeholder { font-weight: normal; color: #b8956a; }
.row { display: flex; gap: 12px; }
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
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.secondary { background: #b8956a; }
.btn.secondary:hover { background: #c9a87c; }
.status { margin-top: 16px; color: #7a5f3e; font-size: 14px; }
.status.error { color: #c0392b; font-weight: bold; }
</style>
