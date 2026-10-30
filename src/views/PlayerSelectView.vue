<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../store';
import { guard } from '../utils/invoke';
import AppIcon from '../components/AppIcon.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import EmptyState from '../components/EmptyState.vue';

const router = useRouter();
const selectedIds = ref<string[]>([]);
const starting = ref(false);

const canStart = computed(() => selectedIds.value.length >= 2 && !starting.value);

const toggleSelect = (id: string) => {
  const i = selectedIds.value.indexOf(id);
  if (i === -1) selectedIds.value.push(id);
  else selectedIds.value.splice(i, 1);
};

const isSelected = (id: string) => selectedIds.value.includes(id);

const startGame = async () => {
  if (!canStart.value) return;
  const players = selectedIds.value
    .map((id) => gameStore.savedPlayers.find((p) => p.id === id))
    .filter(Boolean) as typeof gameStore.savedPlayers;
  starting.value = true;
  const ok = await guard(gameStore.initNewGame(players), '开局失败，请重试');
  starting.value = false;
  if (ok) router.replace('/game');
};
</script>

<template>
  <div class="page">
    <header class="nav-bar">
      <div class="nav-side">
        <button class="icon-btn ghost" @click="router.back()" aria-label="返回">
          <AppIcon name="arrow-left" :size="20" />
        </button>
      </div>
      <div class="nav-title">挑选参赛玩家</div>
      <div class="nav-side right">
        <span class="chip" :class="{ primary: canStart }">已选 {{ selectedIds.length }}</span>
      </div>
    </header>

    <template v-if="gameStore.savedPlayers.length === 0">
      <div class="pad">
        <EmptyState icon="users" title="玩家库还是空的" desc="先添加至少两位玩家，才能开始一局比赛。">
          <button class="btn btn-primary btn-block" @click="router.push('/players/new')">
            <AppIcon name="plus" :size="18" />
            <span>新建玩家</span>
          </button>
        </EmptyState>
      </div>
    </template>

    <template v-else>
      <div class="scroll">
        <div class="hint">
          <AppIcon name="target" :size="14" />
          <span>至少 2 人，选中顺序即为初始击球顺序</span>
        </div>

        <div class="card list">
          <div
            v-for="p in gameStore.savedPlayers"
            :key="p.id"
            class="row"
            :class="{ selected: isSelected(p.id) }"
            @click="toggleSelect(p.id)"
          >
            <PlayerAvatar :name="p.name" :color="p.avatarColor" :size="38" />
            <div class="row-main">
              <div class="row-title">{{ p.name }}</div>
            </div>
            <div class="tick" :class="{ on: isSelected(p.id) }">
              <AppIcon v-if="isSelected(p.id)" name="check" :size="16" :stroke="2.4" />
            </div>
          </div>
        </div>

        <div class="bottom-space"></div>
      </div>

      <div class="bottom-bar">
        <button class="btn btn-primary btn-block" :disabled="!canStart" @click="startGame">
          <AppIcon name="play" :size="19" />
          <span>{{ starting ? '正在开局…' : '开始比赛' }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pad {
  padding: 0 var(--s4);
}
.hint {
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) var(--s5) var(--s4);
  font-size: var(--f-sm);
  color: var(--text-3);
}
.list {
  margin: 0 var(--s4);
  overflow: hidden;
}
.list .row:first-child {
  border-radius: var(--r-md) var(--r-md) 0 0;
}
.list .row:last-child {
  border-radius: 0 0 var(--r-md) var(--r-md);
}
.row.selected {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.tick {
  width: 24px;
  height: 24px;
  border-radius: var(--r-full);
  border: 1.8px solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex: none;
  transition: background var(--d1) var(--ease), border-color var(--d1) var(--ease);
}
.tick.on {
  background: var(--primary);
  border-color: var(--primary);
}
.bottom-space {
  height: var(--s6);
}
</style>
