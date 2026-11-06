<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { appAlert } from '../../utils/dialog';
import { scoreLabel, isPositive } from '../../utils/rules';
import type { CustomEvent, Player, GameLogEntry } from '../../types';
import AppIcon from '../AppIcon.vue';

const props = defineProps<{
  player: Player | null;
  players: Player[];
  events: CustomEvent[];
  log: GameLogEntry[];
  personal: boolean;
  busy: boolean;
  wide: boolean;
}>();

const emit = defineEmits<{
  trigger: [eventId: string, targetId?: string];
  'save-score': [score: number];
  replace: [];
  remove: [];
}>();

const tab = ref<'events' | 'manage' | 'log'>('events');
const pendingEventId = ref<string | null>(null);
const editScore = ref<number>(0);

const positiveEvents = computed(() => props.events.filter(isPositive));
const negativeEvents = computed(() => props.events.filter((e) => !isPositive(e)));
const pendingEvent = computed(() => props.events.find((e) => e.id === pendingEventId.value) ?? null);
const targets = computed(() => props.players.filter((p) => p.id !== props.player?.id));

// 切换玩家时回到计分页并同步分数输入，避免把上一个人的值带到下一次改分
watch(
  () => props.player?.id,
  () => {
    tab.value = 'events';
    pendingEventId.value = null;
    editScore.value = props.player?.score ?? 0;
  },
  { immediate: true }
);

const onEventClick = (id: string) => {
  const ev = props.events.find((e) => e.id === id);
  if (!ev || props.busy) return;
  if (ev.targetType.includes('custom')) pendingEventId.value = id;
  else emit('trigger', id);
};

const onTarget = (id: string) => {
  if (!pendingEventId.value || props.busy) return;
  const eventId = pendingEventId.value;
  // 平板的操作台不会随事件卸载，必须主动退出目标选择页，否则会一直卡在这一屏
  pendingEventId.value = null;
  emit('trigger', eventId, id);
};

const saveScore = () => {
  const value = editScore.value;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    appAlert('请输入有效的整数分数', '提示');
    return;
  }
  emit('save-score', value);
};

const timeOf = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const deltaText = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// 与对局页的烟花条件保持一致：高分换轮事件才点亮
const isFeatured = (ev: CustomEvent) => isPositive(ev) && ev.isNextRound && ev.score >= 7;
</script>

<template>
  <div class="panel" :class="{ wide }">
    <template v-if="!player">
      <div class="panel-empty">
        <span class="panel-empty-icon"><AppIcon name="target" :size="24" /></span>
        <strong>点选一位玩家</strong>
        <span>选择要记的事件，分数会立即结算</span>
      </div>
    </template>

    <template v-else>
      <div class="panel-head">
        <div class="panel-head-main">
          <span class="eyebrow">当前操作</span>
          <strong>{{ player.name }}</strong>
        </div>
        <span class="panel-score" :class="{ negative: player.score < 0 }">
          {{ player.score > 0 ? '+' : '' }}{{ player.score }}
        </span>
      </div>

      <div class="segmented">
        <button :class="{ on: tab === 'events' }" @click="tab = 'events'">计分</button>
        <button :class="{ on: tab === 'manage' }" @click="tab = 'manage'">管理</button>
        <button :class="{ on: tab === 'log' }" @click="tab = 'log'">流水</button>
      </div>

      <div class="panel-body">
        <template v-if="pendingEvent">
          <h3 class="sub-title">选择目标玩家 · {{ pendingEvent.name }}</h3>
          <div class="target-grid">
            <button
              v-for="p in targets"
              :key="p.id"
              class="btn target-btn"
              :style="{ borderLeft: `4px solid ${p.avatarColor}` }"
              :disabled="busy"
              @click="onTarget(p.id)"
            >
              {{ p.name }}
            </button>
          </div>
          <button class="btn btn-block btn-ghost" @click="pendingEventId = null">
            <AppIcon name="arrow-left" :size="18" />
            <span>返回</span>
          </button>
        </template>

        <template v-else-if="tab === 'events'">
          <template v-if="personal">
            <div v-if="positiveEvents.length" class="ev-group">
              <div class="ev-group-title">得分</div>
              <div class="ev-grid">
                <button
                  v-for="ev in positiveEvents"
                  :key="ev.id"
                  class="ev-btn plus"
                  :disabled="busy"
                  @click="onEventClick(ev.id)"
                >
                  <AppIcon v-if="isFeatured(ev)" name="sparkles" :size="13" class="ev-spark" />
                  <span class="ev-name">{{ ev.name }}</span>
                  <span class="ev-score">{{ scoreLabel(ev) }}</span>
                </button>
              </div>
            </div>
            <div v-if="negativeEvents.length" class="ev-group">
              <div class="ev-group-title">扣 / 赔分</div>
              <div class="ev-grid">
                <button
                  v-for="ev in negativeEvents"
                  :key="ev.id"
                  class="ev-btn minus"
                  :disabled="busy"
                  @click="onEventClick(ev.id)"
                >
                  <AppIcon v-if="isFeatured(ev)" name="sparkles" :size="13" class="ev-spark" />
                  <span class="ev-name">{{ ev.name }}</span>
                  <span class="ev-score">{{ scoreLabel(ev) }}</span>
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <p v-if="!events.length" class="empty-hint">暂无计分规则，请在首页「计分规则」里添加。</p>
            <div class="ev-grid">
              <button
                v-for="ev in events"
                :key="ev.id"
                class="ev-btn"
                :class="isPositive(ev) ? 'plus' : 'minus'"
                :disabled="busy"
                @click="onEventClick(ev.id)"
              >
                <AppIcon v-if="isFeatured(ev)" name="sparkles" :size="13" class="ev-spark" />
                <span class="ev-name">{{ ev.name }}</span>
                <span class="ev-score">{{ scoreLabel(ev) }}</span>
              </button>
            </div>
          </template>
          <p class="panel-note">「/家」表示每位对手各变动该分值。</p>
        </template>

        <template v-else-if="tab === 'manage'">
          <div class="score-edit">
            <label class="field-label" for="manual-score">手动修正分数（可为负）</label>
            <input id="manual-score" v-model.number="editScore" type="number" step="1" class="score-input num" />
            <button class="btn btn-primary btn-block btn-sm" :disabled="busy" @click="saveScore">
              <AppIcon name="check" :size="18" />
              <span>保存分数</span>
            </button>
          </div>
          <button class="btn btn-block" :disabled="busy" @click="emit('replace')">
            <AppIcon name="repeat" :size="18" />
            <span>替换玩家</span>
          </button>
          <button class="btn btn-block btn-danger" :disabled="busy" @click="emit('remove')">
            <AppIcon name="user-minus" :size="18" />
            <span>移出对局</span>
          </button>
          <p class="panel-note">一局 2–8 人；替换后新玩家不继承前任的事件统计。</p>
        </template>

        <template v-else>
          <p v-if="!log.length" class="empty-hint">本局还没有记分记录。</p>
          <div v-else class="log-list">
            <div v-for="entry in log" :key="entry.seq" class="log-item">
              <div class="log-main">
                <span class="log-round">R{{ entry.round }} · {{ timeOf(entry.at) }}</span>
                <span class="log-text">
                  <b>{{ entry.actor || '对局' }}</b> · {{ entry.label }}
                  <template v-if="entry.detail"> → {{ entry.detail }}</template>
                </span>
              </div>
              <span v-if="entry.delta !== 0" class="log-delta" :class="{ negative: entry.delta < 0 }">
                {{ deltaText(entry.delta) }}
              </span>
            </div>
          </div>
          <p class="panel-note">撤销一步会同时回退一条流水。</p>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  min-height: 0;
}
.panel.wide {
  height: 100%;
}
.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s2);
  padding: var(--s7) var(--s4);
  text-align: center;
  color: var(--text-3);
  font-size: var(--f-sm);
}
.panel-empty strong {
  color: var(--text-1);
  font-size: var(--f-md);
}
.panel-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: var(--r-full);
  background: var(--gold-soft);
  color: var(--gold);
  margin-bottom: var(--s2);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s1) var(--s1) 0;
}
.panel-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.panel-head-main strong {
  font-size: var(--f-lg);
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panel-score {
  font-size: 28px;
  font-weight: 800;
  color: var(--success);
  font-variant-numeric: tabular-nums;
  flex: none;
}
.panel-score.negative {
  color: var(--danger);
}
.panel-body {
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  max-height: 52dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.wide .panel-body {
  flex: 1;
  max-height: none;
}
.sub-title {
  font-size: var(--f-base);
  font-weight: 700;
  text-align: center;
}
.ev-group-title {
  font-size: var(--f-xs);
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-3);
  margin-bottom: var(--s2);
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
  min-height: 50px;
  padding: 0 var(--s3);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface-1);
  color: var(--text-1);
  font-size: var(--f-base);
  font-weight: 650;
  cursor: pointer;
  transition: transform var(--d1) var(--ease), background var(--d1) var(--ease);
}
.ev-btn:active:not(:disabled) {
  transform: scale(0.97);
  background: var(--surface-3);
}
.ev-btn:disabled {
  opacity: 0.45;
}
.ev-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ev-spark {
  color: var(--gold);
  flex: none;
}
.ev-score {
  font-variant-numeric: tabular-nums;
  font-size: var(--f-sm);
  font-weight: 700;
  white-space: nowrap;
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
  max-height: 42dvh;
  overflow-y: auto;
}
.target-btn {
  min-height: 54px;
  font-size: var(--f-base);
  justify-content: flex-start;
}
.score-edit {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
  padding: var(--s4);
  border-radius: var(--r-md);
  background: var(--surface-2);
}
.score-input {
  width: 100%;
  height: 50px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface-solid);
  color: var(--text-1);
  font-size: var(--f-xl);
  font-weight: 700;
  text-align: center;
  outline: none;
}
.score-input:focus {
  border-color: var(--primary);
}
.panel-note {
  font-size: var(--f-xs);
  color: var(--text-3);
  line-height: 1.6;
}
.log-list {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
}
.log-item {
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s3);
  border-radius: var(--r-sm);
  background: var(--surface-1);
}
.log-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.log-round {
  font-size: var(--f-xs);
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.log-text {
  font-size: var(--f-sm);
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-text b {
  color: var(--text-1);
  font-weight: 650;
}
.log-delta {
  font-size: var(--f-base);
  font-weight: 800;
  color: var(--success);
  font-variant-numeric: tabular-nums;
  flex: none;
}
.log-delta.negative {
  color: var(--danger);
}
@media (max-width: 399px) {
  .ev-spark {
    display: none;
  }
}
@media (max-width: 359px) {
  .ev-grid,
  .target-grid {
    grid-template-columns: 1fr;
  }
}
</style>
