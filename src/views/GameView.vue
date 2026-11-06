<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore, MAX_PLAYERS } from '../store';
import { appConfirm, appAlert } from '../utils/dialog';
import { guard } from '../utils/invoke';
import { triggerFireworks } from '../utils/fx';
import { useOverlayBack } from '../utils/overlayBack';
import { AppConfig } from '../config';
import type { CustomEvent, Player } from '../types';
import AppIcon from '../components/AppIcon.vue';
import PlayerCard from '../components/game/PlayerCard.vue';
import ActionPanel from '../components/game/ActionPanel.vue';
import PickModal from '../components/game/PickModal.vue';

const router = useRouter();

// 一律按玩家 id 选中：洗牌会重排数组，下标在异步往返期间会指向别人
const selectedPlayerId = ref<string | null>(null);
const sheetOpen = ref(false);
const pickMode = ref<'add' | 'replace' | 'reorder' | null>(null);
// v-if 已保证非空，这里给模板一个确定的联合类型，避免 vue-tsc 对可空 ref 的收窄歧义
const pickModeValue = computed<'add' | 'replace' | 'reorder'>(() => pickMode.value ?? 'add');
const isSubmitting = ref(false);
const isWide = ref(false);

const selectedPlayer = computed<Player | null>(
  () => gameStore.currentPlayers.find((p) => p.id === selectedPlayerId.value) ?? null
);
const availablePlayers = computed(() => {
  const inGame = new Set(gameStore.currentPlayers.map((p) => p.id));
  return gameStore.savedPlayers.filter((sp) => !inGame.has(sp.id));
});

// 事件标签按「规则定义顺序」预计算，规避 Rust HashMap 序列化顺序漂移
const playerTags = computed(() => {
  const map: Record<string, { id: string; name: string; count: number }[]> = {};
  for (const p of gameStore.currentPlayers) {
    const tags: { id: string; name: string; count: number }[] = [];
    for (const e of gameStore.customEvents) {
      const count = p.triggeredEvents?.[e.id];
      if (count) tags.push({ id: e.id, name: e.name, count });
    }
    map[p.id] = tags;
  }
  return map;
});

const leader = computed<Player | null>(() => {
  const ps = gameStore.currentPlayers;
  if (!ps.length) return null;
  return ps.reduce((a, b) => (a.score > b.score ? a : b));
});
const spread = computed(() => {
  const ps = gameStore.currentPlayers;
  if (ps.length < 2) return 0;
  return Math.max(...ps.map((p) => p.score)) - Math.min(...ps.map((p) => p.score));
});

// 分数变化动效：只监听「id:分数」拼成的字符串，避免深度监听整个玩家数组
const previousScores = ref<Record<string, number>>({});
const flashed = ref<Set<string>>(new Set());
let flashTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => gameStore.currentPlayers.map((p) => `${p.id}:${p.score}`).join('|'),
  () => {
    const changed = new Set<string>();
    const next: Record<string, number> = {};
    for (const p of gameStore.currentPlayers) {
      const before = previousScores.value[p.id];
      if (before !== undefined && before !== p.score) changed.add(p.id);
      next[p.id] = p.score;
    }
    previousScores.value = next;
    if (changed.size === 0) return;
    flashed.value = changed;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashed.value = new Set(); }, 460);
  },
  { immediate: true }
);

// 平板 / 大屏用常驻操作台，手机用底部抽屉；这是结构性差异，用 matchMedia 决定
let wideQuery: MediaQueryList | null = null;
const syncWide = () => { isWide.value = window.matchMedia('(min-width: 900px)').matches; };
const onWideChange = () => syncWide();
onMounted(() => {
  wideQuery = window.matchMedia('(min-width: 900px)');
  syncWide();
  if (wideQuery.addEventListener) wideQuery.addEventListener('change', onWideChange);
  else wideQuery.addListener(onWideChange);
});
onUnmounted(() => {
  if (!wideQuery) return;
  if (wideQuery.removeEventListener) wideQuery.removeEventListener('change', onWideChange);
  else wideQuery.removeListener(onWideChange);
});

// Android 返回键：有遮罩时先关遮罩，再由 vue-router 回退
const overlayOpen = computed(() => (!isWide.value && sheetOpen.value) || pickMode.value !== null);
const closeAll = () => {
  sheetOpen.value = false;
  pickMode.value = null;
  selectedPlayerId.value = null;
};
const overlayBack = useOverlayBack(overlayOpen, closeAll);
watch(overlayOpen, (open, wasOpen) => {
  if (open && !wasOpen) overlayBack.push();
  else if (!open && wasOpen) overlayBack.pop();
});

const openFor = (id: string) => {
  selectedPlayerId.value = id;
  if (!isWide.value) sheetOpen.value = true;
};

const tap = () => {
  try { navigator.vibrate?.(12); } catch { /* iOS 无震动 API */ }
};

const shouldFireworks = (ev?: CustomEvent) =>
  !!ev && ev.targetType.includes('take') && ev.isNextRound && ev.score >= 7;

/** 窄屏操作完关抽屉；平板保持选中，方便连续记分 */
const finishAction = () => {
  if (!isWide.value) closeAll();
};

const handleTrigger = async (eventId: string, targetId?: string) => {
  const ev = gameStore.customEvents.find((e) => e.id === eventId);
  const playerId = selectedPlayerId.value;
  if (!ev || !playerId || isSubmitting.value) return;

  isSubmitting.value = true;
  const ok = await guard(gameStore.triggerEvent(playerId, eventId, targetId), '触发事件失败，请重试');
  isSubmitting.value = false;
  if (!ok) return;

  tap();
  if (shouldFireworks(ev)) triggerFireworks();
  finishAction();
};

const handleSaveScore = async (score: number) => {
  const playerId = selectedPlayerId.value;
  if (!playerId || isSubmitting.value) return;
  isSubmitting.value = true;
  const ok = await guard(gameStore.updatePlayerScore(playerId, score), '保存分数失败');
  isSubmitting.value = false;
  if (ok) finishAction();
};

const handleReplace = () => {
  sheetOpen.value = false;
  pickMode.value = 'replace';
};

const handleRemove = async () => {
  const playerId = selectedPlayerId.value;
  if (!playerId) return;
  if (gameStore.currentPlayers.length <= 2) return appAlert('最少需要 2 名玩家才能继续！', '提示');
  const confirmed = await appConfirm('确定要将该玩家移出当前对局吗？', '移出玩家');
  if (!confirmed) return;
  const ok = await guard(gameStore.removePlayerMidGame(playerId), '移出玩家失败');
  if (ok) closeAll();
};

const openAdd = () => {
  if (gameStore.currentPlayers.length >= MAX_PLAYERS) return appAlert(`一局最多 ${MAX_PLAYERS} 人`, '人数上限');
  pickMode.value = 'add';
};
const openReorder = () => { pickMode.value = 'reorder'; };

const handlePick = async (id: string) => {
  const sp = gameStore.savedPlayers.find((p) => p.id === id);
  if (!sp || isSubmitting.value) return;
  const oldId = selectedPlayerId.value;
  const replacing = pickMode.value === 'replace' && !!oldId;
  const task = replacing && oldId
    ? gameStore.replacePlayer(oldId, sp)
    : gameStore.addPlayerMidGame(sp);
  isSubmitting.value = true;
  const ok = await guard(task, replacing ? '替换玩家失败' : '添加玩家失败');
  isSubmitting.value = false;
  if (ok) closeAll();
};

const handleConfirmOrder = async (ids: string[]) => {
  const ok = await guard(gameStore.applyCustomOrder(ids), '排序失败');
  if (ok) closeAll();
};

const undoAction = async () => {
  await guard(gameStore.undoLastAction(), '没有可撤销的操作');
};

/** 返回首页但保留这一局：活跃标记立即落盘，首页可直接续玩 */
const goHome = () => {
  closeAll();
  gameStore.flushHistory();
  router.replace('/');
};

const endGame = async () => {
  const confirmed = await appConfirm('确定结束本局并保存记录吗？结束后仍可从历史续玩。', '结束对局');
  if (!confirmed) return;
  gameStore.endAndSaveGame();
  router.replace('/');
};
</script>

<template>
  <div class="page game">
    <header class="game-bar">
      <div class="content game-bar-inner">
        <button class="icon-btn ghost" @click="goHome" aria-label="返回首页">
          <AppIcon name="arrow-left" :size="20" />
        </button>

        <div class="round">
          <span class="round-label">ROUND</span>
          <Transition name="round-pop" mode="out-in">
            <span :key="gameStore.currentRound" class="round-num">{{ gameStore.currentRound }}</span>
          </Transition>
        </div>

        <div class="tools">
          <button class="icon-btn" :disabled="gameStore.currentPlayers.length >= MAX_PLAYERS" @click="openAdd" aria-label="加人">
            <AppIcon name="user-plus" :size="19" />
          </button>
          <button class="icon-btn" @click="openReorder" aria-label="排序">
            <AppIcon name="list-ordered" :size="19" />
          </button>
          <button class="icon-btn" :disabled="gameStore.historyLen === 0" @click="undoAction" aria-label="撤销">
            <AppIcon name="undo-2" :size="19" />
          </button>
          <button class="icon-btn" @click="endGame" aria-label="结束对局">
            <AppIcon name="circle-stop" :size="19" />
          </button>
        </div>
      </div>
    </header>

    <div class="game-body" :class="{ 'has-dock': isWide }">
      <div class="scroll">
        <div class="content">
          <div v-if="leader" class="leader">
            <span class="leader-crown"><AppIcon name="crown" :size="16" /></span>
            <span class="leader-text">
              领先 <b>{{ leader.name }}</b> {{ leader.score > 0 ? '+' : '' }}{{ leader.score }}
            </span>
            <span class="chip">分差 {{ spread }}</span>
            <span class="chip gold">{{ gameStore.currentPlayers.length }} 人</span>
          </div>

          <div class="cards">
            <PlayerCard
              v-for="(p, i) in gameStore.currentPlayers"
              :key="p.id"
              :style="{ '--card-i': i }"
              :player="p"
              :index="i"
              :lead="i === 0"
              :selected="p.id === selectedPlayerId"
              :flash="flashed.has(p.id)"
              :tags="playerTags[p.id] || []"
              @select="openFor(p.id)"
            />
          </div>
        </div>
      </div>

      <!-- 平板：操作台常驻，不用反复开抽屉 -->
      <aside v-if="isWide" class="dock">
        <ActionPanel
          wide
          :player="selectedPlayer"
          :players="gameStore.currentPlayers"
          :events="gameStore.customEvents"
          :log="gameStore.gameLog"
          :personal="AppConfig.isPersonal"
          :busy="isSubmitting"
          @trigger="handleTrigger"
          @save-score="handleSaveScore"
          @replace="handleReplace"
          @remove="handleRemove"
        />
      </aside>
    </div>

    <!-- 手机：底部抽屉 -->
    <transition name="fade">
      <div v-if="!isWide && sheetOpen" class="overlay sheet-overlay" @click.self="closeAll">
        <div class="sheet">
          <div class="handle"></div>
          <ActionPanel
            :wide="false"
            :player="selectedPlayer"
            :players="gameStore.currentPlayers"
            :events="gameStore.customEvents"
            :log="gameStore.gameLog"
            :personal="AppConfig.isPersonal"
            :busy="isSubmitting"
            @trigger="handleTrigger"
            @save-score="handleSaveScore"
            @replace="handleReplace"
            @remove="handleRemove"
          />
        </div>
      </div>
    </transition>

    <!-- 加人 / 替换 / 排序 -->
    <transition name="fade">
      <PickModal
        v-if="pickMode"
        :mode="pickModeValue"
        :players="gameStore.currentPlayers"
        :available="availablePlayers"
        @pick="handlePick"
        @confirm-order="handleConfirmOrder"
        @close="closeAll"
      />
    </transition>
  </div>
</template>

<style scoped>
.game-bar {
  flex: none;
  padding-block: var(--s2);
}
.game-bar-inner {
  display: flex;
  align-items: center;
  gap: var(--s3);
  min-height: var(--nav-h);
}
.round {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: var(--s1) var(--s3);
  border-radius: var(--r-md);
  background: var(--gold-soft);
  border: 1px solid var(--border-strong);
  flex: none;
}
.round-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
  color: var(--gold);
}
.round-num {
  display: block;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
}
.round-pop-enter-active {
  transition: transform 220ms var(--ease), opacity 220ms var(--ease);
}
.round-pop-enter-from {
  transform: translateY(-8px) scale(0.82);
  opacity: 0;
}
.round-pop-leave-active {
  transition: transform 140ms var(--ease), opacity 140ms var(--ease);
}
.round-pop-leave-to {
  transform: translateY(8px) scale(0.82);
  opacity: 0;
}
.tools {
  display: flex;
  gap: var(--s2);
  margin-left: auto;
}

.game-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.game-body > .scroll {
  flex: 1;
  min-height: 0;
}
.game-body.has-dock {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--s4);
  padding-right: var(--page-pad);
}
.dock {
  min-height: 0;
  margin: var(--s2) 0 var(--s5);
  padding: var(--s4);
  border-radius: var(--r-lg);
  background: var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-1);
  display: flex;
  flex-direction: column;
}

.leader {
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s3) var(--s4);
  margin-bottom: var(--s3);
  border-radius: var(--r-md);
  background: var(--surface-1);
  border: 1px solid var(--border);
  flex-wrap: wrap;
}
.leader-crown {
  color: var(--gold);
  flex: none;
}
.leader-text {
  font-size: var(--f-sm);
  color: var(--text-2);
  margin-right: auto;
}
.leader-text b {
  color: var(--text-1);
  font-weight: 700;
}

.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s3);
}
@media (min-width: 600px) {
  .cards {
    grid-template-columns: 1fr 1fr;
  }
  .has-dock .cards {
    grid-template-columns: 1fr;
  }
  .game-body.has-dock {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
}
@media (min-width: 1200px) {
  .game-body.has-dock {
    grid-template-columns: minmax(0, 1fr) 380px;
  }
  .has-dock .cards {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 400px) {
  .game-bar-inner {
    gap: var(--s1);
  }
  .game-bar-inner .icon-btn {
    width: 36px;
    height: 36px;
  }
  .tools {
    gap: var(--s1);
  }
  .round {
    min-width: 62px;
    padding: var(--s1) var(--s2);
  }
}
</style>
