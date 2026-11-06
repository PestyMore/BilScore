<script setup lang="ts">
import type { Player } from '../../types';
import PlayerAvatar from '../PlayerAvatar.vue';
import AppIcon from '../AppIcon.vue';

export interface PlayerTag {
  id: string;
  name: string;
  count: number;
}

defineProps<{
  player: Player;
  index: number;
  /** 本轮开球位：只在触发规则重排后变化，第 1 位固定是上一轮赢家 */
  lead: boolean;
  /** 当前点选、正在为其记分的玩家，与开球位是两个独立概念 */
  selected: boolean;
  /** 分数刚发生变化，播放一次缩放动画 */
  flash: boolean;
  tags: PlayerTag[];
}>();

defineEmits<{ select: [] }>();
</script>

<template>
  <article class="p-card" :class="{ lead, selected }" @click="$emit('select')">
    <div class="p-top">
      <PlayerAvatar :name="player.name" :color="player.avatarColor" :size="52" />
      <div class="p-meta">
        <span class="p-rank">#{{ index + 1 }} <template v-if="lead">· 本轮开球</template></span>
        <span class="p-name">{{ player.name }}</span>
      </div>
      <span class="p-score" :class="{ negative: player.score < 0, zero: player.score === 0, flash }">
        {{ player.score > 0 ? '+' : '' }}{{ player.score }}
      </span>
    </div>

    <div v-if="tags.length" class="p-tags">
      <span v-for="tag in tags" :key="tag.id" class="tag">
        {{ tag.name }}<b>{{ tag.count }}</b>
      </span>
    </div>
    <div v-if="selected" class="p-selected">
      <AppIcon name="check" :size="13" :stroke="2.4" />
      <span>正在为 TA 记分</span>
    </div>
  </article>
</template>

<style scoped>
.p-card {
  padding: var(--s4);
  border-radius: var(--r-lg);
  background: var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-1);
  cursor: pointer;
  transition: transform var(--d1) var(--ease), border-color var(--d1) var(--ease),
    background var(--d1) var(--ease);
}
.p-card:active {
  transform: scale(0.97);
}
.p-card.lead {
  border-color: var(--gold);
  background: linear-gradient(120deg, var(--gold-soft), var(--surface-solid) 55%);
}
.p-card.lead::after {
  content: '';
  position: absolute;
  left: 0;
  top: 16%;
  bottom: 16%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--gold);
}
.p-card.selected {
  border-color: var(--primary);
  background: linear-gradient(120deg, var(--primary-soft), var(--surface-solid) 60%);
  box-shadow: var(--shadow-2);
}
.p-top {
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lead .p-rank {
  color: var(--gold);
}
.selected .p-rank {
  color: var(--primary);
}
.p-name {
  display: block;
  font-size: var(--f-md);
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.p-score {
  display: inline-block;
  font-size: var(--f-score);
  font-weight: 800;
  line-height: 1;
  color: var(--success);
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
  flex: none;
  transform-origin: right center;
}
.p-score.negative {
  color: var(--danger);
}
.p-score.zero {
  color: var(--text-2);
}
.p-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
  margin-top: var(--s3);
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  padding: 3px 4px 3px var(--s2);
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
  background: var(--primary-grad);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.p-selected {
  display: flex;
  align-items: center;
  gap: var(--s1);
  margin-top: var(--s3);
  font-size: var(--f-xs);
  font-weight: 650;
  color: var(--primary);
}
</style>
