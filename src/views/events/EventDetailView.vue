<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { AppConfig } from '../../config';
import { appConfirm } from '../../utils/dialog';
import type { CustomEvent } from '../../types';
import AppIcon from '../../components/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const eventId = route.params.id as string;
const event = computed(() => gameStore.customEvents.find((e: CustomEvent) => e.id === eventId));
const TARGET_LABELS: Record<string, string> = {
  give_prev: '给上家分',
  take_prev: '吃上家分',
  give_all: '给所有人分',
  take_all: '吃所有人分',
  take_custom: '吃指定玩家分',
  give_custom: '给指定玩家分',
};
const editScore = ref(0);
const isBuiltIn = computed(() => !!event.value?.isBuiltIn && AppConfig.isPersonal);

onMounted(() => {
  if (event.value) editScore.value = event.value.score;
});

const saveScore = () => {
  const next = Number(editScore.value);
  if (!Number.isFinite(next)) return;
  gameStore.updateEventScore(eventId, Math.trunc(next));
  router.back();
};

const deleteEvent = async () => {
  const ok = await appConfirm('确定要删除此规则吗？', '删除规则');
  if (ok) {
    gameStore.deleteEvent(eventId);
    router.back();
  }
};
</script>

<template>
  <div class="page" v-if="event">
    <header class="nav-bar">
      <div class="nav-side">
        <button class="icon-btn ghost" @click="router.back()" aria-label="返回">
          <AppIcon name="arrow-left" :size="20" />
        </button>
      </div>
      <div class="nav-title">规则详情</div>
      <div class="nav-side right"></div>
    </header>

    <div class="scroll">
      <div class="card list">
        <div class="row static">
          <div class="row-main">
            <div class="row-title">
              {{ event.name }}
              <span v-if="isBuiltIn" class="chip primary">系统预设</span>
            </div>
          </div>
        </div>
        <div class="row static">
          <div class="row-main"><div class="row-title">结算方式</div></div>
          <span class="value">{{ TARGET_LABELS[event.targetType] || event.targetType }}</span>
        </div>
        <div class="row static">
          <div class="row-main"><div class="row-title">换轮洗牌</div></div>
          <span class="value">{{ event.isNextRound ? '开启' : '关闭' }}</span>
        </div>
        <div class="row static">
          <div class="row-main"><div class="row-title">分数变动</div></div>
          <input v-model.number="editScore" type="number" class="score-input" />
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary btn-block" @click="saveScore">
          <AppIcon name="check" :size="19" />
          <span>保存修改</span>
        </button>
        <button v-if="!isBuiltIn" class="btn btn-danger btn-block" @click="deleteEvent">
          <AppIcon name="trash-2" :size="19" />
          <span>删除规则</span>
        </button>
      </div>

      <div class="bottom-space"></div>
    </div>
  </div>
</template>

<style scoped>
.list {
  margin: var(--s2) var(--s4) var(--s6);
  overflow: hidden;
}
.value {
  font-size: var(--f-base);
  font-weight: 600;
  color: var(--text-2);
}
.score-input {
  width: 92px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface-solid);
  color: var(--text-1);
  font-size: var(--f-md);
  font-weight: 700;
  text-align: center;
  outline: none;
  font-variant-numeric: tabular-nums;
}
.score-input:focus {
  border-color: var(--primary);
}
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  padding: 0 var(--s4);
}
.bottom-space {
  height: var(--s6);
}
</style>
