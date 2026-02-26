<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../store';
import { getAvatarText } from '../utils/avatar';

const router = useRouter();

// Modals
const selectedPlayerIndex = ref<number | null>(null);
const isMainModalOpen = ref(false);
const modalTab = ref<'events' | 'manage'>('events');
const editScore = ref(0);
const pendingCustomEventId = ref<string | null>(null);
const isAddPlayerModalOpen = ref(false);
const isReplaceModalOpen = ref(false);
const isReorderModalOpen = ref(false);
const reorderSelection = ref<string[]>([]);

// Event Grouping
const positiveEvents = computed(() => gameStore.customEvents.filter(e => e.targetType.includes('take')));
const negativeEvents = computed(() => gameStore.customEvents.filter(e => e.targetType.includes('give')));

const availablePlayersForReplace = computed(() => {
  const inGameIds = gameStore.currentPlayers.map(p => p.id);
  return gameStore.savedPlayers.filter(sp => !inGameIds.includes(sp.id));
});

const openMainModal = (index: number) => {
  selectedPlayerIndex.value = index;
  editScore.value = gameStore.currentPlayers[index].score;
  modalTab.value = 'events'; pendingCustomEventId.value = null; isMainModalOpen.value = true;
};
const closeAllModals = () => {
  isMainModalOpen.value = false; isAddPlayerModalOpen.value = false; isReplaceModalOpen.value = false; isReorderModalOpen.value = false;
  selectedPlayerIndex.value = null; pendingCustomEventId.value = null;
};
const handleEventClick = (eventId: string) => {
  const ev = gameStore.customEvents.find(e => e.id === eventId);
  if (ev && ev.targetType.includes('custom')) pendingCustomEventId.value = eventId; 
  else { gameStore.triggerEvent(selectedPlayerIndex.value!, eventId); closeAllModals(); }
};
const confirmCustomTarget = (targetIndex: number) => {
  gameStore.triggerEvent(selectedPlayerIndex.value!, pendingCustomEventId.value!, targetIndex); closeAllModals();
};
const saveScoreEdit = () => {
  if (selectedPlayerIndex.value !== null) gameStore.updatePlayerScore(gameStore.currentPlayers[selectedPlayerIndex.value].id, editScore.value);
  closeAllModals();
};
const removeCurrentPlayer = () => {
  if (gameStore.currentPlayers.length <= 2) return alert("最少需要2名玩家才能继续！");
  if (confirm('确定要将该玩家移出当前对局吗？')) { gameStore.removePlayerMidGame(gameStore.currentPlayers[selectedPlayerIndex.value!].id); closeAllModals(); }
};
const confirmReplace = (id: string) => {
  const sp = gameStore.savedPlayers.find(p => p.id === id);
  if (sp) gameStore.replacePlayer(gameStore.currentPlayers[selectedPlayerIndex.value!].id, sp); closeAllModals();
};
const confirmAddMidGame = (id: string) => {
  const sp = gameStore.savedPlayers.find(p => p.id === id);
  if (sp) gameStore.addPlayerMidGame(sp); closeAllModals();
};
const openReorderModal = () => { reorderSelection.value = []; isReorderModalOpen.value = true; };
const toggleReorderSelect = (id: string) => {
  const idx = reorderSelection.value.indexOf(id);
  if (idx === -1) reorderSelection.value.push(id); else reorderSelection.value.splice(idx, 1);
};
const confirmReorder = () => {
  if (reorderSelection.value.length === gameStore.currentPlayers.length) { gameStore.applyCustomOrder(reorderSelection.value); isReorderModalOpen.value = false; }
};
const endGame = () => { if (confirm("确定要结束本局并保存记录吗？")) { gameStore.endAndSaveGame(); router.replace('/'); } };
</script>

<template>
  <div class="page-container game-bg">
    <div class="game-header">
      <div class="round-display">
        <span class="r-label">Round</span>
        <span class="r-num">{{ gameStore.currentRound }}</span>
      </div>
      <div class="control-actions">
        <button class="icon-text-btn" @click="isAddPlayerModalOpen = true">➕ 加人</button>
        <button class="icon-text-btn" @click="openReorderModal">🔄 排序</button>
        <button class="icon-text-btn" :disabled="gameStore.historySnapshots.length === 0" @click="gameStore.undoLastAction()">↩️ 撤销</button>
        <button class="icon-text-btn danger" @click="endGame">⏹ 结束</button>
      </div>
    </div>

    <!-- Players Grid -->
    <div class="players-grid">
      <div v-for="(player, index) in gameStore.currentPlayers" :key="player.id" class="p-card" @click="openMainModal(index)">
        <div class="p-header">
          <div class="p-rank">#{{ index + 1 }}</div>
          <div class="p-avatar" :style="{ backgroundColor: player.avatarColor }">{{ getAvatarText(player.name) }}</div>
          <div class="p-name">{{ player.name }}</div>
        </div>
        <div class="p-score" :class="{ 'is-negative': player.score < 0 }">{{ player.score }}</div>
        
        <div class="p-tags">
          <span v-for="(count, eventId) in player.triggeredEvents" :key="eventId" class="tag">
            {{ gameStore.customEvents.find(e=>e.id===eventId)?.name || '未知' }} <span class="badge">{{ count }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- MAIN MODAL -->
    <transition name="modal-slide">
      <div v-if="isMainModalOpen" class="sheet-overlay" @click.self="closeAllModals">
        <div class="sheet-content">
          <div class="sheet-handle"></div>
          
          <div v-if="pendingCustomEventId" class="target-mode">
            <h3>指定目标玩家</h3>
            <p>该事件对谁生效？</p>
            <div class="target-grid">
              <button v-for="(p, idx) in gameStore.currentPlayers" :key="p.id" v-show="idx !== selectedPlayerIndex"
                class="btn target-btn" :style="{ borderLeft: `6px solid ${p.avatarColor}` }" @click="confirmCustomTarget(idx)">
                {{ p.name }}
              </button>
            </div>
            <button class="btn btn-cancel" @click="pendingCustomEventId = null">返回上一步</button>
          </div>

          <div v-else>
            <div class="sheet-title">{{ gameStore.currentPlayers[selectedPlayerIndex!].name }}</div>
            <div class="segmented-control">
              <button :class="{ active: modalTab === 'events' }" @click="modalTab = 'events'">触发事件</button>
              <button :class="{ active: modalTab === 'manage' }" @click="modalTab = 'manage'">玩家管理</button>
            </div>
            
            <div v-if="modalTab === 'events'" class="tab-content">
              <!-- 分组渲染事件：得分 (Positive) -->
              <div v-if="positiveEvents.length > 0" class="event-group">
                <div class="group-title">🟩 得分事件 (吃分)</div>
                <div class="event-btn-grid">
                  <button v-for="event in positiveEvents" :key="event.id" class="btn e-btn positive-btn" @click="handleEventClick(event.id)">
                    {{ event.name }} <span class="e-score">+{{ event.score }}</span>
                  </button>
                </div>
              </div>

              <!-- 分组渲染事件：扣分 (Negative) -->
              <div v-if="negativeEvents.length > 0" class="event-group">
                <div class="group-title">🟥 赔分事件 (给分/犯规)</div>
                <div class="event-btn-grid">
                  <button v-for="event in negativeEvents" :key="event.id" class="btn e-btn negative-btn" @click="handleEventClick(event.id)">
                    {{ event.name }} <span class="e-score">-{{ event.score }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div v-if="modalTab === 'manage'" class="tab-content flex-col">
              <div class="edit-box">
                <label>强制修改分数</label>
                <input type="number" v-model.number="editScore" />
                <button class="btn btn-primary" @click="saveScoreEdit" style="margin-top: 10px; width: 100%">保存分数</button>
              </div>
              <button class="btn" @click="isReplaceModalOpen = true; isMainModalOpen = false;">🔄 替换为其他玩家</button>
              <button class="btn btn-danger" @click="removeCurrentPlayer">🗑️ 将其移出对局</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- LIST MODALS -->
    <transition name="fade">
      <div v-if="isReplaceModalOpen || isAddPlayerModalOpen || isReorderModalOpen" class="modal-center-overlay" @click.self="closeAllModals">
        <div class="modal-center-content">
          <h3 v-if="isReplaceModalOpen">选择替补玩家</h3>
          <h3 v-if="isAddPlayerModalOpen">增加新玩家</h3>
          <template v-if="isReorderModalOpen">
            <h3>自定义排序</h3>
            <p class="sub">请依次点击玩家设定顺序</p>
          </template>

          <div class="scroll-list" v-if="!isReorderModalOpen">
            <div v-if="availablePlayersForReplace.length === 0" class="empty-hint">库中没有其他可用玩家。</div>
            <div v-for="sp in availablePlayersForReplace" :key="sp.id" class="list-item" 
                 @click="isReplaceModalOpen ? confirmReplace(sp.id) : confirmAddMidGame(sp.id)">
              <div class="avatar" :style="{ backgroundColor: sp.avatarColor }">{{ getAvatarText(sp.name) }}</div>
              <span>{{ sp.name }}</span>
            </div>
          </div>

          <div class="scroll-list" v-if="isReorderModalOpen">
            <div v-for="player in gameStore.currentPlayers" :key="player.id" class="list-item"
                 :class="{ active: reorderSelection.includes(player.id) }" @click="toggleReorderSelect(player.id)">
              <span>{{ player.name }}</span>
              <span v-if="reorderSelection.includes(player.id)" class="order-badge">{{ reorderSelection.indexOf(player.id) + 1 }}</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn" style="flex:1" @click="closeAllModals">取消</button>
            <button v-if="isReorderModalOpen" class="btn btn-primary" style="flex:1" 
                    :disabled="reorderSelection.length !== gameStore.currentPlayers.length" @click="confirmReorder">确认</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.game-bg { padding: 0; }
.game-header { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: max(20px, env(safe-area-inset-top)) 20px 15px 20px; 
  background: rgba(0,0,0,0.3); backdrop-filter: blur(10px); border-bottom: var(--glass-border);
}
.round-display { display: flex; flex-direction: column; align-items: center; background: rgba(128,128,128,0.1); padding: 5px 12px; border-radius: 12px; }
.r-label { font-size: 10px; color: var(--warning); text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
.r-num { font-size: 22px; font-weight: 900; line-height: 1; }
.control-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.icon-text-btn { background: var(--glass); border: var(--glass-border); color: var(--text-main); padding: 8px 12px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; }
.icon-text-btn:active:not(:disabled) { transform: scale(0.92); }
.icon-text-btn:disabled { opacity: 0.4; }
.danger { color: var(--danger); }

.players-grid { flex: 1; overflow-y: auto; padding: 20px; display: grid; grid-template-columns: 1fr; gap: 16px; align-content: start; }
@media (min-width: 600px) or (orientation: landscape) { .players-grid { grid-template-columns: repeat(2, 1fr); } }

.p-card { background: var(--glass); border: var(--glass-border); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; position: relative; overflow: hidden; transition: 0.2s; }
.p-card:active { transform: scale(0.97); background: rgba(128,128,128,0.1); }
.p-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.p-rank { font-size: 14px; color: var(--text-muted); font-weight: bold; width: 24px; }
.p-avatar { width: 36px; height: 36px; border-radius: 18px; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; }
.p-name { font-size: 18px; font-weight: 600; }
.p-score { font-size: 42px; font-weight: 900; color: var(--success); font-family: -apple-system, BlinkMacSystemFont, monospace; margin: 10px 0 15px 36px; }
.p-score.is-negative { color: var(--danger); }

.p-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-left: 36px; }
.tag { background: rgba(128,128,128,0.1); font-size: 12px; padding: 4px 10px; border-radius: 10px; display: flex; align-items: center; gap: 6px; }
.badge { background: var(--primary); color: white; width: 16px; height: 16px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }

/* 底部抽屉 */
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: flex-end; }
.sheet-content { width: 100%; background: var(--glass-modal); border-top: var(--glass-border); border-radius: 24px 24px 0 0; padding: 15px 20px 30px; box-shadow: 0 -10px 40px rgba(0,0,0,0.5); }
.sheet-handle { width: 40px; height: 5px; background: rgba(128,128,128,0.3); border-radius: 3px; margin: 0 auto 20px; }
.sheet-title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; color: var(--text-main); }

.segmented-control { display: flex; background: rgba(128,128,128,0.2); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
.segmented-control button { flex: 1; padding: 10px; border: none; background: transparent; color: var(--text-muted); font-size: 14px; font-weight: 600; border-radius: 8px; transition: 0.2s; }
.segmented-control button.active { background: rgba(255,255,255,0.15); color: var(--text-main); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

.tab-content { max-height: 50vh; overflow-y: auto; padding-bottom: 10px; }
.event-group { margin-bottom: 20px; }
.group-title { font-size: 13px; font-weight: bold; color: var(--text-muted); margin-bottom: 10px; padding-left: 5px; }

.event-btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.e-btn { display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding: 12px 15px; }

/* 核心：得分/赔分按钮特殊颜色区分 */
.positive-btn { background: rgba(91, 255, 138, 0.1); border: 1px solid rgba(91, 255, 138, 0.3); }
.positive-btn .e-score { color: var(--success); font-weight: bold; }
.negative-btn { background: rgba(255, 91, 91, 0.1); border: 1px solid rgba(255, 91, 91, 0.3); }
.negative-btn .e-score { color: var(--danger); font-weight: bold; }

.flex-col { display: flex; flex-direction: column; gap: 12px; }
.edit-box { background: rgba(128,128,128,0.1); padding: 15px; border-radius: 16px; margin-bottom: 5px; }
.edit-box label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }

.target-mode h3 { text-align: center; font-size: 18px; margin-bottom: 5px; color: var(--text-main); }
.target-mode p { text-align: center; font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
.target-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; max-height: 40vh; overflow-y: auto; }
.target-btn { background: rgba(128,128,128,0.1); justify-content: flex-start; }
.btn-cancel { width: 100%; background: rgba(128,128,128,0.2); }

/* Center Modal */
.modal-center-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.modal-center-content { background: var(--glass-modal); border: var(--glass-border); width: 100%; max-width: 340px; border-radius: 24px; padding: 25px 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
.modal-center-content h3 { text-align: center; font-size: 18px; margin-bottom: 15px; color: var(--text-main); }
.sub { text-align: center; font-size: 13px; color: var(--text-muted); margin-top: -10px; margin-bottom: 15px; }
.scroll-list { max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.list-item { background: rgba(128,128,128,0.1); padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; font-weight: 500; border: 2px solid transparent; transition: 0.2s; cursor: pointer; color: var(--text-main); }
.list-item.active { border-color: var(--primary); background: rgba(0, 168, 255, 0.1); }
.avatar { width: 32px; height: 32px; border-radius: 16px; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; }
.order-badge { margin-left: auto; background: var(--primary); color: white; width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; }
.modal-actions { display: flex; gap: 12px; }

.modal-slide-enter-active, .modal-slide-leave-active { transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.modal-slide-enter-from, .modal-slide-leave-to { transform: translateY(100%); }
</style>
