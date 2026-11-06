<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore, MAX_PLAYERS } from '../store';
import { guard } from '../utils/invoke';
import { appAlert } from '../utils/dialog';
import AppIcon from '../components/AppIcon.vue';
import PageNav from '../components/PageNav.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import EmptyState from '../components/EmptyState.vue';

const router = useRouter();
const selectedIds = ref<string[]>([]);
const starting = ref(false);

const canStart = computed(() => selectedIds.value.length >= 2 && !starting.value);
const full = computed(() => selectedIds.value.length >= MAX_PLAYERS);
const allSelected = computed(
  () => selectedIds.value.length === Math.min(gameStore.savedPlayers.length, MAX_PLAYERS) && selectedIds.value.length > 0
);

const orderOf = (id: string) => selectedIds.value.indexOf(id) + 1;
const isSelected = (id: string) => selectedIds.value.includes(id);

const toggleSelect = (id: string) => {
  const i = selectedIds.value.indexOf(id);
  if (i > -1) selectedIds.value.splice(i, 1);
  else if (full.value) appAlert(`一局最多 ${MAX_PLAYERS} 人`, '人数上限');
  else selectedIds.value.push(id);
};

const toggleAll = () => {
  selectedIds.value = allSelected.value ? [] : gameStore.savedPlayers.slice(0, MAX_PLAYERS).map((p) => p.id);
};

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
    <PageNav title="挑选参赛玩家">
      <template #right>
        <span class="chip" :class="{ primary: canStart }">{{ selectedIds.length }} / {{ MAX_PLAYERS }}</span>
      </template>
    </PageNav>

    <template v-if="gameStore.savedPlayers.length === 0">
      <div class="content pad">
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
        <div class="content">
          <div class="hint">
            <AppIcon name="target" :size="15" />
            <span>至少 2 人，最多 {{ MAX_PLAYERS }} 人；选中顺序即初始击球顺序</span>
            <button class="hint-btn" @click="toggleAll">{{ allSelected ? '清空' : '全选' }}</button>
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
              <span v-if="isSelected(p.id)" class="order-badge">{{ orderOf(p.id) }}</span>
              <span v-else class="tick"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="bottom-bar">
        <div class="content">
          <button class="btn btn-primary btn-block" :disabled="!canStart" @click="startGame">
            <AppIcon name="play" :size="19" />
            <span>{{ starting ? '正在开局…' : `开始比赛（${selectedIds.length} 人）` }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pad {
  padding-top: var(--s5);
}
.hint {
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) 0 var(--s4);
  font-size: var(--f-sm);
  color: var(--text-3);
}
.hint :deep(.app-icon) {
  flex: none;
}
.hint-btn {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--primary);
  font-size: var(--f-sm);
  font-weight: 650;
  cursor: pointer;
  padding: var(--s1) var(--s2);
  white-space: nowrap;
}
.hint-btn:active {
  opacity: 0.5;
}
.row.selected {
  background: var(--primary-soft);
}
.order-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: var(--r-full);
  background: var(--primary-grad);
  color: #fff;
  font-size: var(--f-sm);
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}
.tick {
  width: 24px;
  height: 24px;
  border-radius: var(--r-full);
  border: 1.8px solid var(--border-strong);
  flex: none;
}
</style>
