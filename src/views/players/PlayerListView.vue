<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { appConfirm } from '../../utils/dialog';
import AppIcon from '../../components/AppIcon.vue';
import PageNav from '../../components/PageNav.vue';
import PlayerAvatar from '../../components/PlayerAvatar.vue';
import EmptyState from '../../components/EmptyState.vue';

const router = useRouter();
// 一次算好，避免模板里对每一行重复遍历历史
const stats = computed(() => gameStore.playerStats);

const deletePlayer = async (id: string) => {
  const ok = await appConfirm('确定要删除该玩家吗？', '删除玩家');
  if (ok) gameStore.deleteSavedPlayer(id);
};

const editPlayer = (id: string) => router.push(`/players/${id}`);
</script>

<template>
  <div class="page">
    <PageNav title="玩家库" back="/">
      <template #right>
        <button class="icon-btn ghost primary" @click="router.push('/players/new')" aria-label="新建">
          <AppIcon name="plus" :size="21" />
        </button>
      </template>
    </PageNav>

    <div class="scroll">
      <div class="content">
        <template v-if="gameStore.savedPlayers.length">
          <div class="section-title">共 {{ gameStore.savedPlayers.length }} 位球友</div>
          <div class="card list grid-2">
            <div v-for="p in gameStore.savedPlayers" :key="p.id" class="row" @click="editPlayer(p.id)">
              <PlayerAvatar :name="p.name" :color="p.avatarColor" :size="40" />
              <div class="row-main">
                <div class="row-title">{{ p.name }}</div>
                <div class="row-sub">
                  <template v-if="stats[p.id]">
                    {{ stats[p.id].games }} 场 · {{ stats[p.id].wins }} 胜
                  </template>
                  <template v-else>还没有对局记录</template>
                </div>
              </div>
              <button class="icon-btn ghost danger" @click.stop="deletePlayer(p.id)" aria-label="删除">
                <AppIcon name="trash-2" :size="18" />
              </button>
            </div>
          </div>
        </template>

        <div v-else>
          <EmptyState icon="users" title="还没有玩家" desc="添加常用球友，之后开局可以直接勾选。">
            <button class="btn btn-primary btn-block" @click="router.push('/players/new')">
              <AppIcon name="plus" :size="18" />
              <span>新建玩家</span>
            </button>
          </EmptyState>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-2 {
  align-items: start;
}
.danger {
  color: var(--text-3);
}
.danger:active {
  color: var(--danger);
}
</style>
