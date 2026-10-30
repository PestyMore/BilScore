<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../store';
import { guard } from '../utils/invoke';
import { appConfirm } from '../utils/dialog';
import type { Player } from '../types';
import AppIcon from '../components/AppIcon.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import EmptyState from '../components/EmptyState.vue';

const router = useRouter();
const isDark = ref(true);

onMounted(() => {
  isDark.value = document.documentElement.getAttribute('data-theme') !== 'light';
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  const next = isDark.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bilscore_theme', next);
};

const startNewGame = () => router.push('/select-players');
const goToEvents = () => router.push('/events');
const goToPlayers = () => router.push('/players');

const resumeMatch = async (id: string) => {
  const ok = await guard(gameStore.resumeGame(id), '读取对局失败');
  if (ok) router.push('/game');
};

const formatDate = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return sameDay ? `今天 ${time}` : `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
};

const topOf = (players: Player[]): Player | null => {
  if (!players || players.length === 0) return null;
  return players.reduce((a, b) => (a.score > b.score ? a : b));
};

interface HistoryRow {
  id: string;
  date: string;
  round: number;
  players: Player[];
  extra: number;
  top: Player | null;
}

// 预计算日期与得分王：直接在模板里调 formatDate/topOf 会在每次重渲染时
// 对每张卡片重复算好几遍（同一条记录里 topOf 就被调了 4 次）
const records = computed<HistoryRow[]>(() =>
  gameStore.history.map((h) => ({
    id: h.id,
    date: formatDate(h.lastEdited),
    round: h.round,
    players: h.players,
    extra: h.players.length > 6 ? h.players.length - 6 : 0,
    top: topOf(h.players),
  }))
);

const removeRecord = async (id: string) => {
  const ok = await appConfirm('确定删除这条对局记录？', '删除记录');
  if (ok) gameStore.deleteHistory(id);
};
</script>

<template>
  <div class="page home">
    <header class="nav-bar">
      <div class="nav-side">
        <span class="brand">
          <AppIcon name="circle-dot" :size="20" />
          <span>BilScore</span>
        </span>
      </div>
      <div class="nav-title"></div>
      <div class="nav-side right">
        <button class="icon-btn ghost" @click="toggleTheme" :aria-label="isDark ? '切换浅色' : '切换深色'">
          <AppIcon :name="isDark ? 'sun' : 'moon'" :size="20" />
        </button>
      </div>
    </header>

    <div class="scroll">
      <!-- 主行动 -->
      <section class="hero">
        <button class="btn btn-primary btn-block start-btn" @click="startNewGame">
          <AppIcon name="play" :size="20" />
          <span>开始新对局</span>
        </button>
      </section>

      <!-- 快捷入口 -->
      <section class="tiles">
        <button class="tile" @click="goToPlayers">
          <AppIcon name="users" :size="22" />
          <span class="tile-label">玩家库</span>
          <span class="tile-value">{{ gameStore.savedPlayers.length }}</span>
        </button>
        <button class="tile" @click="goToEvents">
          <AppIcon name="sliders-horizontal" :size="22" />
          <span class="tile-label">计分规则</span>
          <span class="tile-value">{{ gameStore.customEvents.length }}</span>
        </button>
      </section>

      <!-- 最近对局 -->
      <div class="section-title">最近对局</div>

      <div v-if="gameStore.history.length === 0" class="pad">
        <EmptyState icon="history" title="还没有对局记录" desc="建好玩家后开一局，记录会自动保存在这里。">
          <button class="btn btn-primary btn-block" @click="startNewGame">
            <AppIcon name="play" :size="18" />
            <span>开一局</span>
          </button>
        </EmptyState>
      </div>

      <section v-else class="history">
        <article
          v-for="record in records"
          :key="record.id"
          class="card match"
          @click="resumeMatch(record.id)"
        >
          <div class="match-head">
            <span class="match-date">{{ record.date }}</span>
            <span class="chip">第 {{ record.round }} 轮</span>
            <button
              class="match-del"
              aria-label="删除记录"
              @click.stop="removeRecord(record.id)"
            >
              <AppIcon name="trash-2" :size="16" />
            </button>
            <AppIcon name="chevron-right" :size="18" />
          </div>

          <div class="match-body">
            <div class="avatars">
              <PlayerAvatar
                v-for="p in record.players.slice(0, 6)"
                :key="p.id"
                :name="p.name"
                :color="p.avatarColor"
                :size="32"
                class="avatars-item"
              />
              <span v-if="record.extra" class="avatars-more">+{{ record.extra }}</span>
            </div>
            <div v-if="record.top" class="match-top">
              <AppIcon name="crown" :size="15" />
              <span class="match-top-name">{{ record.top.name }}</span>
              <span class="match-top-score" :class="{ negative: record.top.score < 0 }">
                {{ record.top.score }}
              </span>
            </div>
          </div>
        </article>
      </section>

      <div class="bottom-space"></div>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding-top: var(--safe-top);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--s2);
  font-size: var(--f-base);
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--text-1);
  padding-left: var(--s2);
}
.brand :deep(.app-icon) {
  color: var(--primary);
}

.hero {
  padding: var(--s2) var(--s4) var(--s5);
}
.start-btn {
  height: 58px;
  font-size: var(--f-lg);
  border-radius: var(--r-lg);
}

.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s3);
  padding: 0 var(--s4) var(--s6);
}
.tile {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s4);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--surface-solid);
  color: var(--text-1);
  cursor: pointer;
  box-shadow: var(--shadow-1);
  transition: transform var(--d1) var(--ease), background var(--d1) var(--ease);
}
.tile:active {
  transform: scale(0.975);
  background: var(--surface-2);
}
.tile :deep(.app-icon) {
  color: var(--primary);
}
.tile-label {
  font-size: var(--f-base);
  font-weight: 600;
}
.tile-value {
  margin-left: auto;
  font-size: var(--f-sm);
  font-weight: 700;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.pad {
  padding: 0 var(--s4);
}

.history {
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  padding: 0 var(--s4);
}
.match {
  padding: var(--s4);
  cursor: pointer;
  transition: transform var(--d1) var(--ease), border-color var(--d1) var(--ease);
}
.match:active {
  transform: scale(0.985);
  border-color: var(--border-strong);
}
.match-head {
  display: flex;
  align-items: center;
  gap: var(--s3);
  color: var(--text-3);
}
.match-date {
  font-size: var(--f-sm);
  color: var(--text-2);
}
.match-head .chip {
  margin-left: auto;
}
.match-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--r-full);
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  flex: none;
}
.match-del:active {
  background: var(--surface-2);
  color: var(--danger);
}
.match-body {
  display: flex;
  align-items: center;
  gap: var(--s3);
  margin-top: var(--s4);
}
.avatars {
  display: flex;
  align-items: center;
  gap: var(--s2);
  flex-wrap: wrap;
}
.avatars-more {
  font-size: var(--f-sm);
  color: var(--text-3);
  font-weight: 600;
}
.match-top {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) var(--s3);
  border-radius: var(--r-full);
  background: color-mix(in srgb, var(--gold) 16%, transparent);
  color: var(--gold);
  flex: none;
}
.match-top-name {
  font-size: var(--f-sm);
  font-weight: 600;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.match-top-score {
  font-size: var(--f-sm);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.match-top-score.negative {
  color: var(--danger);
}

.bottom-space {
  height: var(--s6);
}
</style>
