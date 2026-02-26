<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gameStore } from '../../store';
import type { CustomEvent } from '../../types';

const route = useRoute();
const router = useRouter();
const eventId = route.params.id as string;
const event = computed(() => gameStore.customEvents.find((e: CustomEvent) => e.id === eventId));

const targetMap = {
  give_prev: '给上家分', take_prev: '吃上家分', give_all: '给所有人分',
  take_all: '吃所有人分', take_custom: '吃指定玩家分', give_custom: '给指定玩家分'
};

const deleteEvent = () => {
  if (confirm('确定要删除此事件吗？')) { gameStore.deleteEvent(eventId); router.back(); }
};
</script>

<template>
  <div class="page-container" v-if="event">
    <div class="top-bar">
      <button class="icon-btn" @click="router.back()">返回</button>
      <h2>事件详情</h2>
      <div style="width: 40px;"></div>
    </div>

    <div class="card">
      <div class="row"><span class="label">名称</span> <span class="val">{{ event.name }}</span></div>
      <div class="row"><span class="label">规则</span> <span class="val">{{ targetMap[event.targetType] }}</span></div>
      <div class="row"><span class="label">分数</span> <span class="val">{{ event.score }}</span></div>
      <div class="row"><span class="label">换轮洗牌</span> <span class="val">{{ event.isNextRound ? '是' : '否' }}</span></div>
    </div>

    <button class="btn btn-danger mt-auto" @click="deleteEvent">删除事件</button>
  </div>
</template>

<style scoped>
.card { background: var(--glass); border-radius: 16px; border: var(--glass-border); padding: 10px 20px; margin-bottom: 30px; }
.row { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 16px; }
.row:last-child { border-bottom: none; }
.label { color: var(--text-muted); }
.val { font-weight: 600; }
.mt-auto { margin-top: auto; }
</style>
