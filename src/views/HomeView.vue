<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../store';
import { guard } from '../utils/invoke';
import { appConfirm } from '../utils/dialog';
import { readTheme, toggleTheme } from '../utils/theme';
import type { Player } from '../types';
import AppIcon from '../components/AppIcon.vue';
import PageNav from '../components/PageNav.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import EmptyState from '../components/EmptyState.vue';

const router = useRouter();
const isDark = ref(readTheme() === 'dark');
const onToggleTheme = () => { isDark.value = toggleTheme() === 'dark'; };

const active = computed(() => gameStore.activeGame);
const canResume = computed(() => gameStore.canResume);

const startNewGame = () => router.push('/select-players');
const goToEvents = () => router.push('/events');
const goToPlayers = () => router.push('/players');

/** 续玩：优先活跃对局，也可从历史卡指定 id */
const resumeMatch = async (id?: string) => {
  const ok = await guard(gameStore.resumeGame(id), '读取对局失败');
  if (ok && gameStore.currentPlayers.length > 0) router.push('/game');
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

// 预计算日期与得分王，避免模板里对每张卡片重复计算
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
  <div class="page">
    <PageNav :back="false">
      <template #left>
        <span class="brand">
          <AppIcon name="circle-dot" :size="21" />
          <span>BilScore</span>
        </span>
      </template>
      <template #right>
        <button class="icon-btn ghost" @click="onToggleTheme" :aria-label="isDark ? '切换浅色' : '切换深色'">
          <AppIcon :name="isDark ? 'sun' : 'moon'" :size="20" />
        </button>
      </template>
    </PageNav>

    <div class="scroll">
      <div class="content home-content">
        <!-- 断点续玩：活跃对局存在时永远放在第一位 -->
        <button v-if="canResume && active" class="resume-card" @click="resumeMatch()">
          <span class="resume-icon"><AppIcon name="play" :size="21" /></span>
          <span class="resume-main">
            <span class="eyebrow">上一局还没结束</span>
            <strong>继续对局</strong>
            <span class="resume-sub">
              第 {{ active.round }} 轮 · {{ active.players.length }} 人 · {{ formatDate(active.savedAt) }}
            </span>
          </span>
          <AppIcon name="chevron-right" :size="20" class="trail" />
        </button>

        <!-- 主行动 -->
        <button class="start-card" @click="startNewGame">
          <span class="start-ball">8</span>
          <span class="start-text">
            <strong>开始新对局</strong>
            <span>选人 → 开打 → 一键记分</span>
          </span>
          <AppIcon name="chevron-right" :size="20" class="trail" />
        </button>

        <div class="section-title">赛前准备</div>
        <div class="tiles">
          <button class="tile" @click="goToPlayers">
            <span class="tile-icon"><AppIcon name="users" :size="21" /></span>
            <span class="tile-label">玩家库</span>
            <span class="tile-value">{{ gameStore.savedPlayers.length }} 位</span>
          </button>
          <button class="tile" @click="goToEvents">
            <span class="tile-icon"><AppIcon name="sliders-horizontal" :size="21" /></span>
            <span class="tile-label">计分规则</span>
            <span class="tile-value">{{ gameStore.customEvents.length }} 条</span>
          </button>
        </div>

        <div class="section-title">最近对局</div>
        <div v-if="gameStore.history.length === 0">
          <EmptyState icon="history" title="还没有对局记录" desc="建好玩家后开一局，记录会自动保存在这里。">
            <button class="btn btn-primary btn-block" @click="startNewGame">
              <AppIcon name="play" :size="18" />
              <span>开一局</span>
            </button>
          </EmptyState>
        </div>

        <div v-else class="history grid-2">
          <article
            v-for="record in records"
            :key="record.id"
            class="card match"
            @click="resumeMatch(record.id)"
          >
            <div class="match-head">
              <span class="match-date">{{ record.date }}</span>
              <span class="chip gold">第 {{ record.round }} 轮</span>
              <button class="match-del" aria-label="删除记录" @click.stop="removeRecord(record.id)">
                <AppIcon name="trash-2" :size="16" />
              </button>
            </div>

            <div class="match-body">
              <div class="avatars">
                <PlayerAvatar
                  v-for="p in record.players.slice(0, 6)"
                  :key="p.id"
                  :name="p.name"
                  :color="p.avatarColor"
                  :size="32"
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
        </div>

        <p class="footnote">BilScore · 台球追分计分器</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--s2);
  font-size: var(--f-md);
  font-weight: 750;
  letter-spacing: -0.3px;
  color: var(--text-1);
  white-space: nowrap;
}
.brand :deep(.app-icon) {
  color: var(--gold);
}
.trail {
  color: var(--text-3);
  flex: none;
}

.resume-card {
  display: flex;
  align-items: center;
  gap: var(--s3);
  width: 100%;
  margin-top: var(--s3);
  padding: var(--s4);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-lg);
  background: var(--gold-soft);
  color: var(--text-1);
  text-align: left;
  cursor: pointer;
  transition: transform var(--d1) var(--ease);
}
.resume-card:active {
  transform: scale(0.985);
}
.resume-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: var(--r-full);
  background: var(--gold);
  color: #14251c;
}
.resume-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.resume-main strong {
  font-size: var(--f-md);
  font-weight: 700;
}
.resume-sub {
  font-size: var(--f-sm);
  color: var(--text-2);
}

.start-card {
  display: flex;
  align-items: center;
  gap: var(--s4);
  width: 100%;
  height: 92px;
  margin-top: var(--s3);
  padding: 0 var(--s5);
  border: none;
  border-radius: var(--r-lg);
  background: var(--primary-grad);
  color: #fff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(20, 120, 84, 0.26);
  transition: transform var(--d1) var(--ease);
}
.start-card:active {
  transform: scale(0.985);
}
.start-card .trail {
  color: rgba(255, 255, 255, 0.75);
}
.start-ball {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex: none;
  border-radius: var(--r-full);
  background: #0d1a15;
  border: 2px solid rgba(255, 255, 255, 0.8);
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  box-shadow: inset -6px -6px 12px rgba(0, 0, 0, 0.4);
}
.start-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.start-text strong {
  font-size: var(--f-lg);
  font-weight: 750;
}
.start-text > span {
  font-size: var(--f-sm);
  color: rgba(255, 255, 255, 0.82);
}

.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s3);
}
.tile {
  display: flex;
  align-items: center;
  gap: var(--s2);
  min-height: 68px;
  padding: var(--s3) var(--s4);
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
.tile-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: var(--r-sm);
  background: var(--primary-soft);
  color: var(--primary);
}
.tile-label {
  font-size: var(--f-base);
  font-weight: 650;
  white-space: nowrap;
}
.tile-value {
  margin-left: auto;
  font-size: var(--f-sm);
  font-weight: 700;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.history {
  align-items: start;
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
  gap: var(--s2);
  color: var(--text-3);
}
.match-date {
  font-size: var(--f-sm);
  color: var(--text-2);
  margin-right: auto;
}
.match-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--r-full);
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  flex: none;
}
.match-del:active {
  background: var(--danger-soft);
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
  gap: var(--s1);
  padding: var(--s2) var(--s3);
  border-radius: var(--r-full);
  background: var(--gold-soft);
  color: var(--gold);
  flex: none;
}
.match-top-name {
  font-size: var(--f-sm);
  font-weight: 650;
  max-width: 80px;
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
.footnote {
  text-align: center;
  padding: var(--s6) 0 var(--s4);
  font-size: var(--f-xs);
  color: var(--text-3);
}
@media (min-width: 900px) {
  .start-card {
    height: 108px;
  }
  .tiles {
    gap: var(--s4);
  }
}
</style>
