<script setup>
import { useGame } from '../composables/useGame.js'

const { state, requestRestart } = useGame()
</script>

<template>
  <Transition name="fade">
    <div v-if="state.overlay.show" class="overlay">
      <div class="overlay-text" v-html="state.overlay.text"></div>
      <div class="sub" v-html="state.overlay.sub"></div>
      <button
        v-if="state.overlay.btn === 'restart'"
        class="btn"
        :disabled="state.restartVoted"
        @click="requestRestart"
      >
        {{ state.restartVoted ? '等待对方确认...' : '再来一局' }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 16px;
  z-index: 10;
}
.overlay-text {
  font-size: 36px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 4px 20px rgba(0,0,0,0.5);
  text-align: center;
  line-height: 1.4;
}
.overlay-text :deep(.stone-icon) {
  display: inline-block;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  vertical-align: middle;
  margin: 0 6px;
  border: 2px solid rgba(255,255,255,0.3);
}
.overlay-text :deep(.stone-icon.black) { background: radial-gradient(circle at 35% 35%, #555, #000); }
.overlay-text :deep(.stone-icon.white) { background: radial-gradient(circle at 35% 35%, #fff, #ccc); }
.sub { font-size: 14px; color: #ddd; }
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
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
