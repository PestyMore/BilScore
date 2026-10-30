<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../store';
import { appConfirm, appAlert } from '../utils/dialog';
import { guard } from '../utils/invoke';
import { triggerFireworks } from '../utils/fx';
import { AppConfig } from '../config';
import type { CustomEvent } from '../types';
import AppIcon from '../components/AppIcon.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';

const router = useRouter();
const selectedPlayerIndex = ref<number | null>(null);
// 事件提交锁：invoke 期间禁止再次点击，避免连点造成重复记分
const isSubmitting = ref(false);
const isMainModalOpen = ref(false);
const modalTab = ref<'events' | 'manage'>('events');
const editScore = ref(0);
const pendingCustomEventId = ref<string | null>(null);
const isAddPlayerModalOpen = ref(false);
const isReplaceModalOpen = ref(false);
const isReorderModalOpen = ref(false);
const reorderSelection = ref<string[]>([]);

const positiveEvents = computed(() => gameStore.customEvents.filter((e) => e.targetType.includes('take')));
const negativeEvents = computed(() => gameStore.customEvents.filter((e) => e.targetType.includes('give')));
const availablePlayersForReplace = computed(() => {
  const inGameIds = gameStore.currentPlayers.map((p) => p.id);
  return gameStore.savedPlayers.filter((sp) => !inGameIds.includes(sp.id));
});
const selectedPlayer = computed(() =>
  selectedPlayerIndex.value === null ? null : gameStore.currentPlayers[selectedPlayerIndex.value] ?? null
);

const openMainModal = (index: number) => {
  selectedPlayerIndex.value = index;
  editScore.value = gameStore.currentPlayers[index].score;
  modalTab.value = 'events';
  pendingCustomEventId.value = null;
  isMainModalOpen.value = true;
};

const closeAllModals = () => {
  isMainModalOpen.value = false;
  isAddPlayerModalOpen.value = false;
  isReplaceModalOpen.value = false;
  isReorderModalOpen.value = false;
  selectedPlayerIndex.value = null;
  pendingCustomEventId.value = null;
};

// 只有大金/小金这类高分事件才放烟花，普胜、黄金9 不再每次换轮都铺满全屏粒子
const shouldFireworks = (ev?: CustomEvent) =>
  !!ev && ev.targetType.includes('take') && ev.isNextRound && ev.score >= 7;

// 事件一律按玩家 id 寻址：洗牌会重排数组，用下标在异步往返期间会指向别人
const currentPlayerId = (): string => selectedPlayer.value?.id ?? '';

const handleEventClick = async (eventId: string) => {
  const ev = gameStore.customEvents.find((e) => e.id === eventId);
  if (!ev || isSubmitting.value) return;

  if (ev.targetType.includes('custom')) {
    pendingCustomEventId.value = eventId;
    return;
  }

  const playerId = currentPlayerId();
  if (!playerId) return closeAllModals();

  isSubmitting.value = true;
  const ok = await guard(gameStore.triggerEvent(playerId, eventId), '触发事件失败，请重试');
  isSubmitting.value = false;

  if (!ok) return;
  if (shouldFireworks(ev)) triggerFireworks();
  closeAllModals();
};

const confirmCustomTarget = async (targetId: string) => {
  if (isSubmitting.value) return;
  const ev = gameStore.customEvents.find((e) => e.id === pendingCustomEventId.value);
  const playerId = currentPlayerId();
  const eventId = pendingCustomEventId.value;
  if (!playerId || !eventId) return closeAllModals();

  isSubmitting.value = true;
  const ok = await guard(gameStore.triggerEvent(playerId, eventId, targetId), '触发事件失败，请重试');
  isSubmitting.value = false;

  if (ok && shouldFireworks(ev)) triggerFireworks();
  closeAllModals();
};

const saveScoreEdit = async () => {
  const player = selectedPlayer.value;
  if (!player) return closeAllModals();

  const next = Number(editScore.value);
  // 输入框清空会得到 NaN，直接传下去会让 Rust 侧反序列化失败
  if (!Number.isFinite(next)) return appAlert('请输入有效的分数', '提示');

  await guard(gameStore.updatePlayerScore(player.id, Math.trunc(next)), '保存分数失败');
  closeAllModals();
};

const removeCurrentPlayer = async () => {
  if (gameStore.currentPlayers.length <= 2) return appAlert('最少需要 2 名玩家才能继续！', '提示');
  const confirmed = await appConfirm('确定要将该玩家移出当前对局吗？', '移出玩家');
  if (!confirmed) return;
  const ok = await guard(gameStore.removePlayerMidGame(selectedPlayer.value!.id), '移出玩家失败');
  if (ok) closeAllModals();
};

const confirmReplace = async (id: string) => {
  const sp = gameStore.savedPlayers.find((p) => p.id === id);
  if (!sp) return;
  await guard(gameStore.replacePlayer(selectedPlayer.value!.id, sp), '替换玩家失败');
  closeAllModals();
};

const confirmAddMidGame = async (id: string) => {
  const sp = gameStore.savedPlayers.find((p) => p.id === id);
  if (!sp) return;
  await guard(gameStore.addPlayerMidGame(sp), '添加玩家失败');
  closeAllModals();
};

const openReorderModal = () => {
  reorderSelection.value = [];
  isReorderModalOpen.value = true;
};
const toggleReorderSelect = (id: string) => {
  const i = reorderSelection.value.indexOf(id);
  if (i === -1) reorderSelection.value.push(id);
  else reorderSelection.value.splice(i, 1);
};
const confirmReorder = async () => {
  if (reorderSelection.value.length !== gameStore.currentPlayers.length) return;
  await guard(gameStore.applyCustomOrder(reorderSelection.value), '排序失败');
  isReorderModalOpen.value = false;
};

const undoAction = async () => {
  await guard(gameStore.undoLastAction(), '没有可撤销的操作');
};

const endGame = async () => {
  const confirmed = await appConfirm('确定要结束本局并保存记录吗？', '结束对局');
  if (confirmed) {
    gameStore.endAndSaveGame();
    router.replace('/');
  }
};
</script>

<template>
  <div class="page game">
    <header class="game-bar">
      <div class="round">
        <span class="round-label">ROUND</span>
        <span class="round-num">{{ gameStore.currentRound }}</span>
      </div>

      <div class="tools">
        <button class="icon-btn" @click="isAddPlayerModalOpen = true" aria-label="加人">
          <AppIcon name="user-plus" :size="19" />
        </button>
        <button class="icon-btn" @click="openReorderModal" aria-label="排序">
          <AppIcon name="arrow-down-up" :size="19" />
        </button>
        <button
          class="icon-btn"
          :disabled="gameStore.historyLen === 0"
          @click="undoAction"
          aria-label="撤销"
        >
          <AppIcon name="undo-2" :size="19" />
        </button>
        <button class="icon-btn" @click="endGame" aria-label="结束对局">
          <AppIcon name="flag" :size="19" />
        </button>
      </div>
    </header>

    <div class="scroll">
      <div class="cards">
        <article
          v-for="(player, index) in gameStore.currentPlayers"
          :key="player.id"
          class="p-card"
          :class="{ current: index === 0 }"
          @click="openMainModal(index)"
        >
          <div class="p-top">
            <PlayerAvatar :name="player.name" :color="player.avatarColor" :size="52" />
            <div class="p-meta">
              <span class="p-rank">#{{ index + 1 }}</span>
              <span class="p-name">{{ player.name }}</span>
            </div>
            <span class="p-score" :class="{ negative: player.score < 0 }">{{ player.score }}</span>
          </div>

          <div v-if="Object.keys(player.triggeredEvents || {}).length" class="p-tags">
            <span
              v-for="(count, eventId) in player.triggeredEvents"
              :key="eventId"
              class="tag"
            >
              {{ gameStore.customEvents.find((e) => e.id === eventId)?.name || '?' }}
              <b>{{ count }}</b>
            </span>
          </div>
        </article>
      </div>
      <div class="bottom-space"></div>
    </div>

    <!-- 底部抽屉：触发事件 / 玩家管理 -->
    <transition name="fade">
      <div v-if="isMainModalOpen" class="sheet-overlay" @click.self="closeAllModals">
        <div class="sheet">
          <div class="handle"></div>

          <template v-if="pendingCustomEventId">
            <h3 class="sheet-title">选择目标玩家</h3>
            <div class="target-grid">
              <button
                v-for="p in gameStore.currentPlayers"
                :key="p.id"
                v-show="p.id !== currentPlayerId()"
                class="btn target-btn"
                :style="{ borderLeft: `4px solid ${p.avatarColor}` }"
                :disabled="isSubmitting"
                @click="confirmCustomTarget(p.id)"
              >
                {{ p.name }}
              </button>
            </div>
            <button class="btn btn-block ghost-btn" @click="pendingCustomEventId = null">
              <AppIcon name="arrow-left" :size="18" />
              <span>返回</span>
            </button>
          </template>

          <template v-else-if="selectedPlayer">
            <h3 class="sheet-title">{{ selectedPlayer.name }}</h3>

            <div class="segmented">
              <button :class="{ on: modalTab === 'events' }" @click="modalTab = 'events'">触发事件</button>
              <button :class="{ on: modalTab === 'manage' }" @click="modalTab = 'manage'">玩家管理</button>
            </div>

            <div class="sheet-body">
              <template v-if="modalTab === 'events'">
                <template v-if="AppConfig.isPersonal">
                  <div v-if="positiveEvents.length" class="ev-group">
                    <div class="ev-group-title">得分</div>
                    <div class="ev-grid">
                      <button
                        v-for="event in positiveEvents"
                        :key="event.id"
                        class="ev-btn plus"
                        :disabled="isSubmitting"
                        @click="handleEventClick(event.id)"
                      >
                        <span class="ev-name">{{ event.name }}</span>
                        <span class="ev-score">+{{ event.score }}</span>
                      </button>
                    </div>
                  </div>
                  <div v-if="negativeEvents.length" class="ev-group">
                    <div class="ev-group-title">扣/赔分</div>
                    <div class="ev-grid">
                      <button
                        v-for="event in negativeEvents"
                        :key="event.id"
                        class="ev-btn minus"
                        :disabled="isSubmitting"
                        @click="handleEventClick(event.id)"
                      >
                        <span class="ev-name">{{ event.name }}</span>
                        <span class="ev-score">-{{ event.score }}</span>
                      </button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <p v-if="!gameStore.customEvents.length" class="empty-hint">
                    暂无计分规则，请在首页「计分规则」里添加。
                  </p>
                  <div class="ev-grid">
                    <button
                      v-for="event in gameStore.customEvents"
                      :key="event.id"
                      class="ev-btn"
                      :class="event.targetType.includes('take') ? 'plus' : 'minus'"
                      :disabled="isSubmitting"
                      @click="handleEventClick(event.id)"
                    >
                      <span class="ev-name">{{ event.name }}</span>
                      <span class="ev-score">
                        {{ event.targetType.includes('take') ? '+' : '-' }}{{ event.score }}
                      </span>
                    </button>
                  </div>
                </template>
              </template>

              <template v-else>
                <div class="score-edit">
                  <label>手动修正分数</label>
                  <input v-model.number="editScore" type="number" class="score-input" />
                  <button class="btn btn-primary btn-block" @click="saveScoreEdit">
                    <AppIcon name="check" :size="18" />
                    <span>保存</span>
                  </button>
                </div>
                <button class="btn btn-block" @click="isReplaceModalOpen = true; isMainModalOpen = false">
                  <AppIcon name="repeat" :size="18" />
                  <span>替换玩家</span>
                </button>
                <button class="btn btn-block btn-danger" @click="removeCurrentPlayer">
                  <AppIcon name="user-minus" :size="18" />
                  <span>移出对局</span>
                </button>
              </template>
            </div>
          </template>
        </div>
      </div>
    </transition>

    <!-- 居中弹窗：加人 / 替换 / 排序 -->
    <transition name="fade">
      <div
        v-if="isReplaceModalOpen || isAddPlayerModalOpen || isReorderModalOpen"
        class="modal-overlay"
        @click.self="closeAllModals"
      >
        <div class="modal">
          <header class="modal-head">
            <h3 v-if="isReplaceModalOpen">选择替补玩家</h3>
            <h3 v-if="isAddPlayerModalOpen">加入新玩家</h3>
            <template v-if="isReorderModalOpen">
              <h3>自定义排序</h3>
              <p>按新的击球顺序依次点击</p>
            </template>
          </header>

          <div class="modal-body scroll">
            <template v-if="!isReorderModalOpen">
              <p v-if="!availablePlayersForReplace.length" class="empty-hint">库中没有其他可用玩家。</p>
              <div
                v-for="sp in availablePlayersForReplace"
                :key="sp.id"
                class="pick"
                @click="isReplaceModalOpen ? confirmReplace(sp.id) : confirmAddMidGame(sp.id)"
              >
                <PlayerAvatar :name="sp.name" :color="sp.avatarColor" :size="36" />
                <span class="pick-name">{{ sp.name }}</span>
                <AppIcon name="chevron-right" :size="18" />
              </div>
            </template>
            <template v-else>
              <div
                v-for="player in gameStore.currentPlayers"
                :key="player.id"
                class="pick"
                :class="{ on: reorderSelection.includes(player.id) }"
                @click="toggleReorderSelect(player.id)"
              >
                <PlayerAvatar :name="player.name" :color="player.avatarColor" :size="36" />
                <span class="pick-name">{{ player.name }}</span>
                <span v-if="reorderSelection.includes(player.id)" class="order-badge">
                  {{ reorderSelection.indexOf(player.id) + 1 }}
                </span>
                <span v-else class="tick"></span>
              </div>
            </template>
          </div>

          <div class="modal-actions">
            <button class="btn btn-block ghost-btn" @click="closeAllModals">取消</button>
            <button
              v-if="isReorderModalOpen"
              class="btn btn-primary btn-block"
              :disabled="reorderSelection.length !== gameStore.currentPlayers.length"
              @click="confirmReorder"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.game {
  padding-top: var(--safe-top);
}

/* ---------- 顶栏 ---------- */
.game-bar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  padding: var(--s2) var(--s4) var(--s3);
}
.round {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  padding: var(--s2) var(--s3);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--gold) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--gold) 28%, transparent);
}
.round-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
  color: var(--gold);
}
.round-num {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
}
.tools {
  display: flex;
  gap: var(--s2);
}

/* ---------- 玩家卡 ---------- */
.cards {
  display: grid;
  gap: var(--s3);
  padding: var(--s2) var(--s4) 0;
}
@media (min-width: 720px) {
  .cards {
    grid-template-columns: 1fr 1fr;
    max-width: 1100px;
    margin: 0 auto;
  }
}

.p-card {
  position: relative;
  padding: var(--s4);
  border-radius: var(--r-lg);
  background: var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-1);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--d1) var(--ease), border-color var(--d1) var(--ease);
}
.p-card:active {
  transform: scale(0.985);
}
/* 只有当前击球位保留流光，其余静态描边 —— 8 张卡同时跑动画会持续掉帧 */
.p-card.current {
  border-color: color-mix(in srgb, var(--gold) 45%, transparent);
  box-shadow: var(--shadow-2), 0 0 0 1px color-mix(in srgb, var(--gold) 20%, transparent);
}
.p-card.current::before {
  content: '';
  position: absolute;
  inset: -60%;
  background: conic-gradient(transparent, var(--gold), transparent 22%);
  opacity: 0.16;
  animation: sweep 5s linear infinite;
  pointer-events: none;
}
.p-card.current::after {
  content: '';
  position: absolute;
  left: 0;
  top: 18%;
  bottom: 18%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--gold);
}
@keyframes sweep {
  to {
    transform: rotate(1turn);
  }
}
@media (prefers-reduced-motion: reduce) {
  .p-card.current::before {
    animation: none;
  }
}

.p-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--s3);
}
.p-meta {
  flex: 1;
  min-width: 0;
}
.p-rank {
  display: block;
  font-size: var(--f-xs);
  font-weight: 700;
  color: var(--text-3);
  letter-spacing: 0.6px;
}
.p-name {
  display: block;
  font-size: var(--f-md);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.p-score {
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
  color: var(--success);
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
  flex: none;
}
.p-score.negative {
  color: var(--danger);
}
.p-tags {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
  margin-top: var(--s3);
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  padding: 3px var(--s2) 3px var(--s3);
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: var(--f-xs);
}
.tag b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--r-full);
  background: var(--primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.bottom-space {
  height: var(--s6);
}

/* ---------- 抽屉 ---------- */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}
.sheet {
  width: 100%;
  max-height: 86vh;
  overflow-y: auto;
  background: var(--surface-solid);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  border-top: 1px solid var(--border);
  padding: var(--s2) var(--s4) calc(var(--s4) + var(--safe-bottom));
  box-shadow: var(--shadow-3);
  animation: rise var(--d2) var(--ease);
}
@keyframes rise {
  from {
    transform: translateY(14%);
    opacity: 0.4;
  }
}
.handle {
  width: 38px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-strong);
  margin: 0 auto var(--s4);
}
.sheet-title {
  font-size: var(--f-lg);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--s4);
}
.segmented {
  display: flex;
  padding: 3px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
  margin-bottom: var(--s4);
}
.segmented button {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-2);
  font-size: var(--f-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--d1) var(--ease), color var(--d1) var(--ease);
}
.segmented button.on {
  background: var(--surface-solid);
  color: var(--text-1);
  box-shadow: var(--shadow-1);
}
.sheet-body {
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  max-height: 52vh;
  overflow-y: auto;
}

.ev-group-title {
  font-size: var(--f-xs);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: var(--s2);
  padding-left: var(--s1);
}
.ev-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s2);
}
.ev-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s2);
  min-height: 48px;
  padding: 0 var(--s3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface-1);
  color: var(--text-1);
  font-size: var(--f-base);
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--d1) var(--ease), background var(--d1) var(--ease);
}
.ev-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.ev-btn:disabled {
  opacity: 0.5;
}
.ev-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ev-score {
  font-variant-numeric: tabular-nums;
  font-size: var(--f-sm);
  font-weight: 700;
  flex: none;
}
.ev-btn.plus .ev-score {
  color: var(--success);
}
.ev-btn.minus .ev-score {
  color: var(--danger);
}

.target-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s2);
  max-height: 46vh;
  overflow-y: auto;
  margin-bottom: var(--s4);
}
.target-btn {
  min-height: 54px;
  font-size: var(--f-base);
  justify-content: flex-start;
}

.ghost-btn {
  background: var(--surface-2);
}

.score-edit {
  padding: var(--s4);
  border-radius: var(--r-md);
  background: var(--surface-2);
}
.score-edit label {
  display: block;
  font-size: var(--f-sm);
  color: var(--text-2);
  margin-bottom: var(--s3);
}
.score-input {
  width: 100%;
  height: 52px;
  margin-bottom: var(--s3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface-solid);
  color: var(--text-1);
  font-size: var(--f-xl);
  font-weight: 700;
  text-align: center;
  outline: none;
  font-variant-numeric: tabular-nums;
}
.score-input:focus {
  border-color: var(--primary);
}

.empty-hint {
  text-align: center;
  color: var(--text-3);
  font-size: var(--f-sm);
  padding: var(--s5) 0;
}

/* ---------- 居中弹窗 ---------- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--s5);
  z-index: 200;
}
.modal {
  width: 100%;
  max-width: 380px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: var(--s5) var(--s4) var(--s4);
  box-shadow: var(--shadow-3);
}
.modal-head {
  text-align: center;
  margin-bottom: var(--s4);
}
.modal-head h3 {
  font-size: var(--f-lg);
  font-weight: 700;
}
.modal-head p {
  margin-top: var(--s2);
  font-size: var(--f-sm);
  color: var(--text-2);
}
.modal-body {
  max-height: 46vh;
  display: flex;
  flex-direction: column;
  gap: var(--s2);
}
.pick {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s3);
  border-radius: var(--r-md);
  background: var(--surface-1);
  border: 1px solid transparent;
  color: var(--text-3);
  cursor: pointer;
  transition: transform var(--d1) var(--ease), background var(--d1) var(--ease),
    border-color var(--d1) var(--ease);
}
.pick:active {
  transform: scale(0.98);
}
.pick.on {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-color: var(--primary);
}
.pick-name {
  flex: 1;
  font-size: var(--f-base);
  font-weight: 600;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-badge {
  width: 22px;
  height: 22px;
  border-radius: var(--r-full);
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.tick {
  width: 22px;
  height: 22px;
  border-radius: var(--r-full);
  border: 1.6px solid var(--border-strong);
  flex: none;
}
.modal-actions {
  display: flex;
  gap: var(--s2);
  margin-top: var(--s4);
}
</style>
