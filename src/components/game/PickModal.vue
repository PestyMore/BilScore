<script setup lang="ts">
import { ref } from 'vue';
import type { Player, SavedPlayer } from '../../types';
import AppIcon from '../AppIcon.vue';
import PlayerAvatar from '../PlayerAvatar.vue';

const props = defineProps<{
  mode: 'add' | 'replace' | 'reorder';
  players: Player[];
  available: SavedPlayer[];
}>();

const emit = defineEmits<{
  pick: [id: string];
  'confirm-order': [ids: string[]];
  close: [];
}>();

const selection = ref<string[]>([]);

const toggle = (id: string) => {
  const i = selection.value.indexOf(id);
  if (i > -1) selection.value.splice(i, 1);
  else selection.value.push(id);
};

const title = () => {
  if (props.mode === 'replace') return '选择替补玩家';
  if (props.mode === 'reorder') return '自定义排序';
  return '加入新玩家';
};
</script>

<template>
  <div class="overlay modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <header class="modal-head">
        <h3>{{ title() }}</h3>
        <p v-if="mode === 'reorder'">按新的击球顺序依次点击</p>
        <p v-else>从玩家库中选择（已在局内的不会显示）</p>
      </header>

      <div class="modal-body scroll">
        <template v-if="mode !== 'reorder'">
          <p v-if="!available.length" class="empty-hint">库中没有其他可用玩家，可先到玩家库添加。</p>
          <div v-for="sp in available" :key="sp.id" class="pick" @click="emit('pick', sp.id)">
            <PlayerAvatar :name="sp.name" :color="sp.avatarColor" :size="36" />
            <span class="pick-name">{{ sp.name }}</span>
            <AppIcon name="chevron-right" :size="18" />
          </div>
        </template>
        <template v-else>
          <div
            v-for="p in players"
            :key="p.id"
            class="pick"
            :class="{ on: selection.includes(p.id) }"
            @click="toggle(p.id)"
          >
            <PlayerAvatar :name="p.name" :color="p.avatarColor" :size="36" />
            <span class="pick-name">{{ p.name }}</span>
            <span v-if="selection.includes(p.id)" class="order-badge">
              {{ selection.indexOf(p.id) + 1 }}
            </span>
            <span v-else class="tick"></span>
          </div>
        </template>
      </div>

      <div class="modal-actions">
        <button class="btn btn-block btn-ghost" @click="emit('close')">取消</button>
        <button
          v-if="mode === 'reorder'"
          class="btn btn-primary btn-block"
          :disabled="selection.length !== players.length"
          @click="emit('confirm-order', selection)"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-head {
  text-align: center;
  margin-bottom: var(--s4);
}
.modal-head h3 {
  font-size: var(--f-lg);
  font-weight: 750;
}
.modal-head p {
  margin-top: var(--s2);
  font-size: var(--f-sm);
  color: var(--text-2);
}
.modal-body {
  max-height: 46dvh;
  min-height: 0;
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
  transition: transform var(--d1) var(--ease), background var(--d1) var(--ease);
}
.pick:active {
  transform: scale(0.98);
}
.pick.on {
  background: var(--primary-soft);
  border-color: var(--primary);
}
.pick-name {
  flex: 1;
  font-size: var(--f-base);
  font-weight: 650;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-badge {
  width: 24px;
  height: 24px;
  border-radius: var(--r-full);
  background: var(--primary-grad);
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
