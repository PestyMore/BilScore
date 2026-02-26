<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
const selectCount = (count: number) => router.push({ path: '/input-names', query: { count } });
</script>

<template>
  <div class="page-container">
    <div class="top-bar">
      <button class="icon-btn" @click="router.back()">返回</button>
      <h2>选择游玩人数</h2>
      <div style="width: 40px"></div>
    </div>
    
    <div class="grid-layout">
      <button class="btn grid-btn" @click="selectCount(2)">2 人</button>
      <button class="btn grid-btn" @click="selectCount(3)">3 人</button>
      <button class="btn grid-btn" @click="selectCount(4)">4 人</button>
      <button class="btn grid-btn" @click="selectCount(5)">5 人</button>
      <button class="btn grid-btn" @click="selectCount(6)">6 人</button>
      <button class="btn grid-btn" @click="selectCount(7)">7 人</button>
      <button class="btn grid-btn" @click="selectCount(8)">8 人</button>
    </div>
  </div>
</template>

<style scoped>
.grid-layout {
  display: grid; grid-template-columns: 1fr 1fr; gap: 15px; flex: 1; align-content: center;
}
.grid-btn { height: 80px; font-size: 20px; border-radius: 20px; }
.grid-btn:nth-child(1) { grid-column: 1 / -1; height: 90px; background: rgba(0, 168, 255, 0.1); color: var(--primary); border: 1px solid rgba(0, 168, 255, 0.3); }
</style>
