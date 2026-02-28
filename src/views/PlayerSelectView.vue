<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../store';
import { getAvatarText } from '../utils/avatar';

const router = useRouter();
const selectedIds = ref<string[]>([]);

// 只要大于等于2人即可开始
const canStart = computed(() => selectedIds.value.length >= 2);

const toggleSelect = (id: string) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(i => i !== id);
  } else {
    selectedIds.value.push(id);
  }
};

const startGame = () => {
  if (!canStart.value) return;
  const players = selectedIds.value.map(id => gameStore.savedPlayers.find(p => p.id === id)!).filter(Boolean);
  gameStore.initNewGame(players);
  router.replace('/game');
};
</script>

<template>
  <div class="page-container">
    <div class="top-bar">
      <button class="icon-btn" @click="router.back()">返回</button>
      <h2>挑选参赛玩家</h2>
      <div style="width: 40px"></div>
    </div>

    <!-- 玩家库为空警告 -->
    <div v-if="gameStore.savedPlayers.length === 0" class="warning-box">
      <div class="icon">⚠️</div>
      <p>玩家库为空，无法开始比赛。</p>
      <button class="btn btn-primary mt-btn" @click="router.push('/players/new')">去创建玩家</button>
    </div>

    <template v-else>
      <div class="selection-status">
        已选：<span :class="{ 'ready': canStart }">{{ selectedIds.length }} 人</span> (最少2人)
      </div>

      <div class="list">
        <div v-for="p in gameStore.savedPlayers" :key="p.id" 
             class="list-item" :class="{ active: selectedIds.includes(p.id) }" 
             @click="toggleSelect(p.id)">
          <div class="avatar" :style="{ backgroundColor: p.avatarColor }">{{ getAvatarText(p.name) }}</div>
          <span class="name">{{ p.name }}</span>
          <div class="checkbox">
            <span v-if="selectedIds.includes(p.id)">✔️</span>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-start" :disabled="!canStart" @click="startGame">
        开始比赛
      </button>
    </template>
  </div>
</template>

<style scoped>
.warning-box { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); background: var(--glass); border-radius: 20px; padding: 30px; }
.warning-box .icon { font-size: 40px; margin-bottom: 15px; }
.mt-btn { margin-top: 25px; width: 100%; }
.selection-status { text-align: center; font-size: 14px; color: var(--text-muted); margin-bottom: 15px; }
.selection-status .ready { color: var(--success); font-weight: bold; }
.list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-bottom: 20px; }
.list-item { background: var(--glass); padding: 16px; border-radius: 16px; border: 2px solid transparent; display: flex; align-items: center; gap: 15px; transition: 0.2s; cursor: pointer; }
.list-item.active { border-color: var(--primary); background: rgba(0, 168, 255, 0.1); }
.list-item:active { transform: scale(0.98); }
.avatar { width: 40px; height: 40px; border-radius: 20px; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; }
.name { flex: 1; font-size: 17px; font-weight: 500; }
.checkbox { width: 24px; height: 24px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; }
.active .checkbox { background: var(--primary); border-color: var(--primary); }
.btn-start { padding: 18px; border-radius: 16px; font-size: 18px; }
.btn-start:disabled { background: var(--glass); color: var(--text-muted); opacity: 0.6; }
</style>
