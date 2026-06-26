<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useGame } from './composables/useGame.js'
import Lobby from './components/Lobby.vue'
import GameBoard from './components/GameBoard.vue'
import GameOverlay from './components/GameOverlay.vue'

const { state, connect, leave } = useGame()

onMounted(() => {
  connect()
})

function handleLeave() {
  leave()
}

watch(() => state.overlay.show, (v) => {
  if (!v) state.restartVoted = false
})
</script>

<template>
  <div class="container">
    <Lobby v-if="state.inLobby" />
    <GameBoard v-else @leave="handleLeave" />
    <GameOverlay />
  </div>
</template>

<style scoped>
.container {
  background: #deb887;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  position: relative;
}
</style>
