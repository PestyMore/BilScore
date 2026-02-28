<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../store';
import { getAvatarText } from '../utils/avatar';
import { AppConfig } from '../config';

import iconAdd from '../assets/icons/add.png';
import iconSort from '../assets/icons/sort.png';
import iconUndo from '../assets/icons/undo.png';
import iconEnd from '../assets/icons/end.png';
import iconReplace from '../assets/icons/replace.png';
import iconRemove from '../assets/icons/remove.png';

const router = useRouter();
const selectedPlayerIndex = ref<number | null>(null);
const isMainModalOpen = ref(false);
const modalTab = ref<'events' | 'manage'>('events');
const editScore = ref(0);
const pendingCustomEventId = ref<string | null>(null);
const isAddPlayerModalOpen = ref(false);
const isReplaceModalOpen = ref(false);
const isReorderModalOpen = ref(false);
const reorderSelection = ref<string[]>([]);

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
  <div class="game-view-wrapper">
    <div class="game-header">
      <div class="round-display">
        <span class="r-label">Round</span>
        <span class="r-num">{{ gameStore.currentRound }}</span>
      </div>
      <div class="control-actions">
        <button class="img-btn" @click="isAddPlayerModalOpen = true">
          <img :src="iconAdd" alt="加人" class="adaptive-icon" />
        </button>
        <button class="img-btn" @click="openReorderModal">
          <img :src="iconSort" alt="排序" class="adaptive-icon" />
        </button>
        <button class="img-btn" :disabled="gameStore.historySnapshots.length === 0" @click="gameStore.undoLastAction()">
          <img :src="iconUndo" alt="撤销" class="adaptive-icon" />
        </button>
        <button class="img-btn" @click="endGame">
          <img :src="iconEnd" alt="结束" class="adaptive-icon" />
        </button>
      </div>
    </div>

    <div class="players-scroll-area">
      <div class="players-grid-container">
        <div v-for="(player, index) in gameStore.currentPlayers" :key="player.id" class="p-card" @click="openMainModal(index)">
          <div class="p-header">
            <div class="p-info-group">
              <div class="p-rank">#{{ index + 1 }}</div>
              <div class="p-avatar" :style="{ backgroundColor: player.avatarColor }">{{ getAvatarText(player.name) }}</div>
              <div class="p-name">{{ player.name }}</div>
            </div>
            <div class="p-score" :class="{ 'is-negative': player.score < 0 }">{{ player.score }}</div>
          </div>
          <div class="p-tags">
            <span v-for="(count, eventId) in player.triggeredEvents" :key="eventId" class="tag">
              {{ gameStore.customEvents.find(e=>e.id===eventId)?.name || '?' }} <span class="badge">{{ count }}</span>
            </span>
          </div>
        </div>
      </div>
      <div class="safe-bottom-spacer"></div>
    </div>

    <transition name="modal-slide">
      <div v-if="isMainModalOpen" class="sheet-overlay" @click.self="closeAllModals">
        <div class="sheet-content">
          <div class="sheet-handle"></div>
          
          <div v-if="pendingCustomEventId" class="target-mode">
            <h3>指定目标玩家</h3>
            <div class="target-grid">
              <button v-for="(p, idx) in gameStore.currentPlayers" :key="p.id" v-show="idx !== selectedPlayerIndex"
                class="btn target-btn" :style="{ borderLeft: `6px solid ${p.avatarColor}` }" @click="confirmCustomTarget(idx)">{{ p.name }}</button>
            </div>
            <button class="btn btn-cancel" @click="pendingCustomEventId = null">返回</button>
          </div>
          <div v-else>
            <div class="sheet-title">{{ gameStore.currentPlayers[selectedPlayerIndex!].name }}</div>
            <div class="segmented-control">
              <button :class="{ active: modalTab === 'events' }" @click="modalTab = 'events'">触发事件</button>
              <button :class="{ active: modalTab === 'manage' }" @click="modalTab = 'manage'">玩家管理</button>
            </div>
            
            <div v-if="modalTab === 'events'" class="tab-content">
                <template v-if="AppConfig.isPersonal">
                  <div v-if="positiveEvents.length > 0" class="event-group">
                    <div class="group-title">🟩 得分事件</div>
                    <div class="event-btn-grid"><button v-for="event in positiveEvents" :key="event.id" class="btn e-btn positive-btn" @click="handleEventClick(event.id)">{{ event.name }} <span class="e-score">+{{ event.score }}</span></button></div>
                  </div>
                  <div v-if="negativeEvents.length > 0" class="event-group">
                    <div class="group-title">🟥 赔分事件</div>
                    <div class="event-btn-grid"><button v-for="event in negativeEvents" :key="event.id" class="btn e-btn negative-btn" @click="handleEventClick(event.id)">{{ event.name }} <span class="e-score">-{{ event.score }}</span></button></div>
                  </div>
                </template>
                <template v-else>
                  <div v-if="gameStore.customEvents.length === 0" class="empty-hint">暂无自定义事件，请在首页设置中添加。</div>
                  <div class="event-btn-grid">
                    <button v-for="event in gameStore.customEvents" :key="event.id" class="btn e-btn" @click="handleEventClick(event.id)">
                      {{ event.name }} <span class="e-score">{{ event.targetType.includes('take') ? '+' : '-' }}{{ event.score }}</span>
                    </button>
                  </div>
                </template>
            </div>

            <div v-if="modalTab === 'manage'" class="tab-content flex-col">
              <div class="edit-box">
                <label>强制修改分数</label>
                <input type="number" v-model.number="editScore" class="modal-input" />
                <button class="btn btn-primary" @click="saveScoreEdit" style="margin-top:10px;width:100%">保存分数</button>
              </div>
              <button class="btn btn-icon-row" @click="isReplaceModalOpen = true; isMainModalOpen = false;">
                <img :src="iconReplace" class="btn-icon adaptive-icon" /> 替换玩家
              </button>
              <button class="btn btn-icon-row btn-danger" @click="removeCurrentPlayer">
                <img :src="iconRemove" class="btn-icon adaptive-icon" /> 移出对局
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
    
    <transition name="fade">
      <div v-if="isReplaceModalOpen || isAddPlayerModalOpen || isReorderModalOpen" class="modal-center-overlay" @click.self="closeAllModals">
        <div class="modal-center-content">
          <h3 v-if="isReplaceModalOpen">选择替补玩家</h3><h3 v-if="isAddPlayerModalOpen">增加新玩家</h3>
          <template v-if="isReorderModalOpen"><h3>自定义排序</h3><p class="sub">请依次点击设定顺序</p></template>
          <div class="scroll-list" v-if="!isReorderModalOpen">
            <div v-if="availablePlayersForReplace.length === 0" class="empty-hint">库中没有其他可用玩家。</div>
            <div v-for="sp in availablePlayersForReplace" :key="sp.id" class="list-item" @click="isReplaceModalOpen ? confirmReplace(sp.id) : confirmAddMidGame(sp.id)"><div class="avatar" :style="{ backgroundColor: sp.avatarColor }">{{ getAvatarText(sp.name) }}</div><span>{{ sp.name }}</span></div>
          </div>
          <div class="scroll-list" v-if="isReorderModalOpen">
            <div v-for="player in gameStore.currentPlayers" :key="player.id" class="list-item" :class="{ active: reorderSelection.includes(player.id) }" @click="toggleReorderSelect(player.id)"><span>{{ player.name }}</span><span v-if="reorderSelection.includes(player.id)" class="order-badge">{{ reorderSelection.indexOf(player.id) + 1 }}</span></div>
          </div>
          <div class="modal-actions"><button class="btn" style="flex:1" @click="closeAllModals">取消</button><button v-if="isReorderModalOpen" class="btn btn-primary" style="flex:1" :disabled="reorderSelection.length !== gameStore.currentPlayers.length" @click="confirmReorder">确认</button></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* 使用从 App.vue 传来的 CSS 变量，代码极度清爽且不会报错 */
.adaptive-icon { 
  filter: var(--icon-filter); 
  transition: filter 0.3s ease; 
}

.game-view-wrapper { height: 100vh; display: flex; flex-direction: column; background: var(--bg-grad); overflow: hidden; }
.game-header { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: calc(var(--safe-top) + 15px) 20px 15px 20px; background: rgba(0,0,0,0.05); backdrop-filter: blur(10px); border-bottom: var(--glass-border); }

/* --- 核心修复：Round UI 使用动态变量 --- */
.round-display { 
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 8px 16px; border-radius: 14px; 
  background: var(--round-bg); 
  border: var(--round-border);
  box-shadow: var(--round-shadow);
  transition: all 0.3s ease;
}
.r-label { font-size: 11px; color: var(--round-label); text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
.r-num { font-size: 24px; color: var(--round-num); font-weight: 900; line-height: 1.1; }

.control-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.icon-text-btn { background: var(--glass); border: var(--glass-border); color: var(--text-main); padding: 10px 14px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.icon-text-btn:active:not(:disabled) { transform: scale(0.92); }
.icon-text-btn:disabled { opacity: 0.4; }
.danger { color: var(--danger); }

/* 图片按钮 */
.img-btn { 
  background: var(--glass); border: var(--glass-border); border-radius: 16px; 
  padding: 10px; width: 50px; height: 50px; 
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.2s;
  box-shadow: var(--shadow-sm); /* 使用动态阴影 */
}
.img-btn img { width: 28px; height: 28px; object-fit: contain; }
.img-btn:active:not(:disabled) { transform: scale(0.9); background: rgba(128,128,128,0.15); }
.img-btn:disabled { opacity: 0.4; filter: grayscale(100%); }

.players-scroll-area { flex: 1; overflow-y: auto; }
.players-grid-container { padding: 20px; display: grid; grid-template-columns: 1fr; gap: 16px; margin: 0 auto; width: 100%; align-content: start; }
@media (min-width: 700px) { .players-grid-container { grid-template-columns: 1fr 1fr; gap: 24px; max-width: 1200px; } }
.safe-bottom-spacer { height: calc(var(--safe-bottom) + 20px); }

/* 玩家卡片 */
.p-card { 
  background: var(--glass); border: var(--glass-border); border-radius: 24px; 
  display: flex; flex-direction: column; cursor: pointer; transition: 0.2s; 
  padding: clamp(20px, 3%, 40px); 
  box-shadow: var(--shadow-md); /* 使用动态阴影 */
}
.p-card:active { transform: scale(0.98); background: rgba(128,128,128,0.1); }
.p-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: clamp(10px, 2%, 20px); }
.p-info-group { display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden; }
.p-rank { font-weight: bold; color: var(--text-muted); font-size: clamp(14px, 1.5vw, 20px); min-width: 24px; }
.p-avatar { border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; width: clamp(40px, 6vw, 72px); height: clamp(40px, 6vw, 72px); font-size: clamp(16px, 2.5vw, 28px); }
.p-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: clamp(18px, 2.5vw, 32px); }
.p-score { font-weight: 900; color: var(--success); font-family: monospace; line-height: 1; margin-left: 10px; font-size: clamp(42px, 7vw, 90px); }
.p-score.is-negative { color: var(--danger); }
.p-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-left: clamp(40px, 6vw, 72px); padding-left: 12px; }
.tag { background: rgba(128,128,128,0.1); display: flex; align-items: center; gap: 6px; border-radius: 12px; padding: clamp(4px, 0.5vw, 8px) clamp(10px, 1vw, 16px); font-size: clamp(12px, 1.2vw, 16px); }
.badge { background: var(--primary); color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 50%; width: clamp(16px, 1.8vw, 24px); height: clamp(16px, 1.8vw, 24px); font-size: clamp(10px, 1vw, 14px); }

.btn-icon-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
.btn-icon { width: 24px; height: 24px; object-fit: contain; }

.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet-content { width: 100%; background: var(--glass-modal); border-radius: 24px 24px 0 0; padding: 15px 20px; padding-bottom: calc(var(--safe-bottom) + 30px); }
.sheet-handle { width: 40px; height: 5px; background: rgba(128,128,128,0.3); border-radius: 3px; margin: 0 auto 20px; }
.sheet-title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; color: var(--text-main); }
.segmented-control { display: flex; background: rgba(128,128,128,0.2); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
.segmented-control button { flex: 1; padding: 10px; border: none; background: transparent; color: var(--text-muted); font-size: 14px; }
.segmented-control button.active { background: rgba(128,128,128,0.2); color: var(--text-main); font-weight: bold; border-radius: 10px; }
.tab-content { max-height: 50vh; overflow-y: auto; padding-bottom: 10px; }
.event-group { margin-bottom: 20px; }
.group-title { font-size: 13px; font-weight: bold; color: var(--text-muted); margin-bottom: 10px; padding-left: 5px; }
.event-btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.e-btn { display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding: 12px 15px; }
.e-score { background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 8px; font-size: 13px; color: var(--warning); }
.positive-btn { background: rgba(91, 255, 138, 0.1); border: 1px solid rgba(91, 255, 138, 0.3); }
.positive-btn .e-score { color: var(--success); font-weight: bold; }
.negative-btn { background: rgba(255, 91, 91, 0.1); border: 1px solid rgba(255, 91, 91, 0.3); }
.negative-btn .e-score { color: var(--danger); font-weight: bold; }
.flex-col { display: flex; flex-direction: column; gap: 12px; }
.edit-box { background: rgba(128,128,128,0.1); padding: 15px; border-radius: 16px; margin-bottom: 5px; }
.edit-box label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
.modal-input { font-size: 24px; text-align: center; font-weight: bold; background: var(--input-bg) !important; color: var(--primary) !important; }
.target-mode h3 { text-align: center; font-size: 18px; margin-bottom: 5px; color: var(--text-main); }
.target-mode p { text-align: center; font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
.target-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; max-height: 40vh; overflow-y: auto; }
.target-btn { background: rgba(128,128,128,0.1); justify-content: flex-start; }
.btn-cancel { width: 100%; background: rgba(128,128,128,0.2); }
.empty-hint { text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 14px; }
.modal-center-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.modal-center-content { background: var(--glass-modal); border: var(--glass-border); width: 100%; max-width: 340px; border-radius: 24px; padding: 25px 20px; }
.modal-center-content h3 { text-align: center; font-size: 18px; margin-bottom: 15px; color: var(--text-main); }
.sub { text-align: center; font-size: 13px; color: var(--text-muted); margin-top: -10px; margin-bottom: 15px; }
.scroll-list { max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.list-item { background: rgba(128,128,128,0.1); padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; border: 2px solid transparent; cursor: pointer; color: var(--text-main); }
.list-item.active { border-color: var(--primary); background: rgba(0, 168, 255, 0.1); }
.avatar { width: 32px; height: 32px; border-radius: 16px; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; }
.order-badge { margin-left: auto; background: var(--primary); color: white; width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; }
.modal-actions { display: flex; gap: 12px; }
.modal-slide-enter-active, .modal-slide-leave-active { transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.modal-slide-enter-from, .modal-slide-leave-to { transform: translateY(100%); }
</style>
