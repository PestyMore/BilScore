<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../store';
import { getAvatarText } from '../utils/avatar';

import iconPlayers from '../assets/icons/players.png';
import iconSettings from '../assets/icons/settings.png';

const router = useRouter();
const isDark = ref(true);

onMounted(() => {
  const current = document.documentElement.getAttribute('data-theme');
  isDark.value = current !== 'light';
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  const newTheme = isDark.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('bilscore_theme', newTheme);
};

const startNewGame = () => router.push('/select-players');
const goToEvents = () => router.push('/events');
const goToPlayers = () => router.push('/players');
const resumeMatch = (id: string) => { gameStore.resumeGame(id); router.push('/game'); };

const formatDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getMonth()+1}月${d.getDate()}日 ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};
const getTopScorer = (players: any[]) => players.length === 0 ? 'None' : players.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr).name;
</script>

<template>
  <div class="page-container">
    <div class="top-bar home-nav">
      <button class="nav-btn" @click="goToPlayers">
        <img :src="iconPlayers" class="nav-icon adaptive-icon" />
        <span>玩家库</span>
      </button>
      
      <button class="theme-toggle" @click="toggleTheme">
        <span v-if="isDark">🌙</span>
        <span v-else>☀️</span>
      </button>
      
      <button class="nav-btn" @click="goToEvents">
        <img :src="iconSettings" class="nav-icon adaptive-icon" />
        <span>事件规则</span>
      </button>
    </div>

    <div class="header-hero">
      <button class="btn btn-primary btn-start" @click="startNewGame">
        <span class="icon">🎱</span> 开始新对局
      </button>
    </div>

    <div class="history-section">
      <div class="section-title">最近对局</div>
      <div class="history-list">
        <div v-if="gameStore.history.length === 0" class="empty-state">暂无对局记录，快去开一局吧！</div>
        
        <div v-for="record in gameStore.history" :key="record.id" class="history-card" @click="resumeMatch(record.id)">
          <div class="card-header">
            <span class="date">{{ formatDate(record.lastEdited) }}</span>
            <span class="round-badge">R{{ record.round }}</span>
          </div>
          <div class="card-body">
            <span class="top-player">Top: <b style="color: var(--success)">{{ getTopScorer(record.players) }}</b></span>
          </div>
          <div class="players-preview">
            <div v-for="p in record.players" :key="p.id" class="mini-avatar" :style="{ backgroundColor: p.avatarColor }">
              {{ getAvatarText(p.name) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 使用从 App.vue 拿来的 CSS 变量 */
.adaptive-icon { filter: var(--icon-filter); transition: filter 0.3s ease; }

.home-nav { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 10px; margin-top: 15px; }
.nav-btn { background: transparent; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.nav-btn span { font-size: 12px; font-weight: 600; color: var(--primary); }
.nav-icon { width: 32px; height: 32px; object-fit: contain; }

.theme-toggle { background: var(--glass); border: var(--glass-border); width: 44px; height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; transition: 0.3s; box-shadow: var(--shadow-sm); }
.theme-toggle:active { transform: scale(0.9); }

.header-hero { flex: 0 0 25%; display: flex; align-items: center; justify-content: center; }
.btn-start { width: 85%; height: 75px; font-size: 22px; border-radius: 37px; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 10px 30px rgba(0, 168, 255, 0.3); }
.btn-start .icon { font-size: 26px; }
.history-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-top: 10px; }
.section-title { font-size: 14px; color: var(--text-muted); font-weight: 600; margin-bottom: 12px; padding-left: 5px; }
.history-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px; }

/* 卡片使用动态阴影 */
.history-card { background: var(--glass); border: var(--glass-border); border-radius: 16px; padding: 16px; transition: 0.2s; cursor: pointer; box-shadow: var(--shadow-md); }

.history-card:active { transform: scale(0.97); background: rgba(128,128,128,0.1); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.date { font-size: 13px; color: var(--text-muted); }
.round-badge { background: rgba(128,128,128,0.2); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; color: var(--text-main); }
.card-body { margin-bottom: 12px; font-size: 15px; }
.players-preview { display: flex; gap: 6px; }
.mini-avatar { width: 26px; height: 26px; border-radius: 13px; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; }
.empty-state { text-align: center; color: var(--text-muted); margin-top: 40px; font-size: 14px; }
</style>
