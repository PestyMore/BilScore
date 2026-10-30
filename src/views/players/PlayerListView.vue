<script setup lang="ts">
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { appConfirm } from '../../utils/dialog';
import AppIcon from '../../components/AppIcon.vue';
import PlayerAvatar from '../../components/PlayerAvatar.vue';
import EmptyState from '../../components/EmptyState.vue';

const router = useRouter();

const deletePlayer = async (id: string) => {
  const ok = await appConfirm('确定要删除该玩家吗？', '删除玩家');
  if (ok) gameStore.deleteSavedPlayer(id);
};
</script>

<template>
  <div class="page">
    <header class="nav-bar">
      <div class="nav-side">
        <button class="icon-btn ghost" @click="router.push('/')" aria-label="返回">
          <AppIcon name="arrow-left" :size="20" />
        </button>
      </div>
      <div class="nav-title">玩家库</div>
      <div class="nav-side right">
        <button class="icon-btn ghost primary" @click="router.push('/players/new')" aria-label="新建">
          <AppIcon name="plus" :size="21" />
        </button>
      </div>
    </header>

    <div class="scroll">
      <template v-if="gameStore.savedPlayers.length">
        <div class="section-title">共 {{ gameStore.savedPlayers.length }} 位</div>
        <div class="card list">
          <div v-for="p in gameStore.savedPlayers" :key="p.id" class="row static">
            <PlayerAvatar :name="p.name" :color="p.avatarColor" :size="38" />
            <div class="row-main">
              <div class="row-title">{{ p.name }}</div>
            </div>
            <button class="icon-btn ghost danger" @click="deletePlayer(p.id)" aria-label="删除">
              <AppIcon name="trash-2" :size="19" />
            </button>
          </div>
        </div>
      </template>

      <div v-else class="pad">
        <EmptyState icon="users" title="还没有玩家" desc="添加常用球友，之后开局可以直接勾选。">
          <button class="btn btn-primary btn-block" @click="router.push('/players/new')">
            <AppIcon name="plus" :size="18" />
            <span>新建玩家</span>
          </button>
        </EmptyState>
      </div>

      <div class="bottom-space"></div>
    </div>
  </div>
</template>

<style scoped>
.pad {
  padding: 0 var(--s4);
}
.list {
  margin: 0 var(--s4);
  overflow: hidden;
}
.danger {
  color: var(--danger);
}
.bottom-space {
  height: var(--s6);
}
</style>
