<script setup lang="ts">
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { AppConfig } from '../../config';
import AppIcon from '../../components/AppIcon.vue';
import EmptyState from '../../components/EmptyState.vue';

const router = useRouter();
</script>

<template>
  <div class="page">
    <header class="nav-bar">
      <div class="nav-side">
        <button class="icon-btn ghost" @click="router.push('/')" aria-label="返回">
          <AppIcon name="arrow-left" :size="20" />
        </button>
      </div>
      <div class="nav-title">计分规则</div>
      <div class="nav-side right">
        <button class="icon-btn ghost primary" @click="router.push('/events/new')" aria-label="新建">
          <AppIcon name="plus" :size="21" />
        </button>
      </div>
    </header>

    <div class="scroll">
      <template v-if="gameStore.customEvents.length">
        <div class="section-title">共 {{ gameStore.customEvents.length }} 条</div>
        <div class="card list">
          <div
            v-for="event in gameStore.customEvents"
            :key="event.id"
            class="row"
            @click="router.push(`/events/${event.id}`)"
          >
            <div class="row-main">
              <div class="row-title">
                {{ event.name }}
                <span v-if="AppConfig.isPersonal && event.isBuiltIn" class="chip primary">默认</span>
              </div>
            </div>
            <span class="score" :class="{ plus: event.targetType.includes('take') }">
              {{ event.targetType.includes('take') ? '+' : '-' }}{{ event.score }}
            </span>
            <AppIcon name="chevron-right" :size="18" class="trail" />
          </div>
        </div>
      </template>

      <div v-else class="pad">
        <EmptyState icon="sliders-horizontal" title="还没有计分规则" desc="例如「大金 +10」「犯规 -1」，对局中一键触发。">
          <button class="btn btn-primary btn-block" @click="router.push('/events/new')">
            <AppIcon name="plus" :size="18" />
            <span>新建规则</span>
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
.row-title {
  display: flex;
  align-items: center;
  gap: var(--s2);
}
.score {
  font-size: var(--f-lg);
  font-weight: 800;
  color: var(--danger);
  font-variant-numeric: tabular-nums;
  flex: none;
}
.score.plus {
  color: var(--success);
}
.trail {
  color: var(--text-3);
}
.bottom-space {
  height: var(--s6);
}
</style>
