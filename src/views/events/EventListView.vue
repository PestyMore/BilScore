<script setup lang="ts">
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
const router = useRouter();
</script>

<template>
  <div class="page-container">
    <div class="top-bar">
      <button class="icon-btn" @click="router.push('/')">返回</button>
      <h2>事件规则</h2>
      <button class="icon-btn" style="font-size: 24px;" @click="router.push('/events/new')">+</button>
    </div>
    <div class="list">
      <div v-if="gameStore.customEvents.length === 0" class="empty">暂无自定义事件，请添加。</div>
      <div v-for="event in gameStore.customEvents" :key="event.id" class="list-item" @click="router.push(`/events/${event.id}`)">
        <span class="event-name">{{ event.name }}</span>
        <span class="event-score" :class="{ 'is-plus': event.targetType.includes('take') }">
          {{ event.targetType.includes('take') ? '+' : '-' }}{{ event.score }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.list-item { 
  background: var(--glass); padding: 20px; border-radius: 16px; border: var(--glass-border);
  display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;
}
.list-item:active { transform: scale(0.97); }
.event-name { font-size: 17px; font-weight: 600; }
.event-score { color: var(--danger); font-weight: bold; font-size: 20px; font-family: monospace; }
.event-score.is-plus { color: var(--success); }
.empty { text-align: center; color: var(--text-muted); margin-top: 50px; }
</style>
