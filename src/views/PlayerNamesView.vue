<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gameStore } from '../store';
import { getRandomColor } from '../utils/avatar';
import type { SavedPlayer } from '../types';
const route = useRoute();
const router = useRouter();
const targetCount = Number(route.query.count) || 2;
const currentStep = ref(1);
const currentNameInput = ref('');
const collectedNames = ref<string[]>([]);
const title = computed(() => `输入第 ${currentStep.value} 位玩家`);
const nextStep = () => {
  const name = currentNameInput.value.trim() || `玩家 ${currentStep.value}`;
  collectedNames.value.push(name);
  currentNameInput.value = '';
  if (currentStep.value < targetCount) {
    currentStep.value++;
  } else {
    const players: SavedPlayer[] = collectedNames.value.map((n, index) => ({
      id: `temp_${Date.now()}_${index}`,
      name: n,
      avatarColor: getRandomColor()
    }));
    gameStore.initNewGame(players);
    router.replace('/game'); 
  }
};
</script>
<template>
  <div class="page-container">
    <div class="top-bar">
        <button class="icon-btn" @click="router.back()">返回</button>
        <div class="progress">{{ currentStep }} / {{ targetCount }}</div>
        <div style="width: 40px"></div>
    </div>
    
    <div class="input-area">
      <h2 class="hero-title">{{ title }}</h2>
      <div class="input-wrapper">
        <input 
          type="text" 
          v-model="currentNameInput" 
          placeholder="点击输入昵称"
          class="hero-input"
          @keyup.enter="nextStep"
          autofocus
        />
      </div>
    </div>

    <button class="btn btn-primary btn-next" @click="nextStep">
      {{ currentStep === targetCount ? '开始比赛' : '下一位' }}
    </button>
  </div>
</template>
<style scoped>
.progress { color: var(--text-muted); font-weight: 600; font-family: monospace; }
.input-area { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px; margin-bottom: 20%; }
.hero-title { font-size: 24px; color: var(--text-muted); font-weight: 500; }

.input-wrapper { width: 100%; max-width: 320px; }
.hero-input {
  text-align: center; font-size: 32px; font-weight: 700; height: 80px;
  background: var(--glass) !important;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05) !important;
}
.hero-input:focus { transform: translateY(-2px); box-shadow: 0 15px 40px rgba(0, 122, 255, 0.15) !important; border-color: var(--primary) !important; }

.btn-next { width: 100%; height: 60px; font-size: 20px; box-shadow: 0 10px 20px rgba(0, 122, 255, 0.2); }
</style>
