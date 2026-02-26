<script setup lang="ts">
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { getAvatarText } from '../../utils/avatar';

const router = useRouter();
const deletePlayer = (id: string) => {
  if (confirm('确定要删除该玩家吗？')) gameStore.deleteSavedPlayer(id);
};
</script>

<template>
  <div class="page-container">
    <div class="top-bar">
      <button class="icon-btn" @click="router.push('/')">返回</button>
      <h2>玩家管理</h2>
      <button class="icon-btn" style="font-size: 24px;" @click="router.push('/players/new')">+</button>
    </div>

    <div class="list">
      <div v-if="gameStore.savedPlayers.length === 0" class="empty">暂无玩家，请点击右上角添加。</div>
      <div v-for="p in gameStore.savedPlayers" :key="p.id" class="list-item">
        <div class="player-info">
          <div class="avatar" :style="{ backgroundColor: p.avatarColor }">{{ getAvatarText(p.name) }}</div>
          <span class="name">{{ p.name }}</span>
        </div>
        <button class="del-btn" @click="deletePlayer(p.id)">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.list-item { background: var(--glass); padding: 15px; border-radius: 16px; border: var(--glass-border); display: flex; justify-content: space-between; align-items: center; }
.player-info { display: flex; align-items: center; gap: 15px; }
.avatar { width: 44px; height: 44px; border-radius: 22px; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; }
.name { font-size: 17px; font-weight: 500; }
.del-btn { background: rgba(255, 91, 91, 0.15); color: var(--danger); border: none; padding: 8px 16px; border-radius: 10px; font-weight: 600; }
.empty { text-align: center; color: var(--text-muted); margin-top: 50px; }
</style>
