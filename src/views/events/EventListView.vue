<script setup lang="ts">
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { AppConfig } from '../../config';
import { TARGET_LABELS, scoreLabel, isPositive } from '../../utils/rules';
import type { TargetType } from '../../types';
import AppIcon from '../../components/AppIcon.vue';
import PageNav from '../../components/PageNav.vue';
import EmptyState from '../../components/EmptyState.vue';

const router = useRouter();
const labelOf = (t: TargetType) => TARGET_LABELS[t] ?? t;
</script>

<template>
  <div class="page">
    <PageNav title="计分规则" back="/">
      <template #right>
        <button class="icon-btn ghost primary" @click="router.push('/events/new')" aria-label="新建">
          <AppIcon name="plus" :size="21" />
        </button>
      </template>
    </PageNav>

    <div class="scroll">
      <div class="content">
        <template v-if="gameStore.customEvents.length">
          <div class="section-title">共 {{ gameStore.customEvents.length }} 条</div>
          <div class="card list grid-2">
            <div
              v-for="event in gameStore.customEvents"
              :key="event.id"
              class="row"
              @click="router.push(`/events/${event.id}`)"
            >
              <div class="row-main">
                <div class="row-title">
                  {{ event.name }}
                  <span v-if="AppConfig.isPersonal && event.isBuiltIn" class="chip primary">预设</span>
                </div>
                <div class="row-sub">
                  {{ labelOf(event.targetType) }} · {{ event.isNextRound ? '换轮洗牌' : '不换轮' }}
                </div>
              </div>
              <span class="score" :class="{ plus: isPositive(event) }">{{ scoreLabel(event) }}</span>
              <AppIcon name="chevron-right" :size="18" class="trail" />
            </div>
          </div>
          <p class="hint">标注「/家」的规则：每位对手各变动该分值，触发者按人数合计。</p>
        </template>

        <div v-else>
          <EmptyState icon="sliders-horizontal" title="还没有计分规则" desc="例如「大金 +10」「犯规 -1」，对局中一键触发。">
            <button class="btn btn-primary btn-block" @click="router.push('/events/new')">
              <AppIcon name="plus" :size="18" />
              <span>新建规则</span>
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
  white-space: nowrap;
  flex: none;
}
.score.plus {
  color: var(--success);
}
.trail {
  color: var(--text-3);
  flex: none;
}
.hint {
  padding: var(--s3) 0 0;
  font-size: var(--f-xs);
  color: var(--text-3);
  line-height: 1.6;
}
</style>
