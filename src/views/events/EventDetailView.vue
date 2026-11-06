<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { AppConfig } from '../../config';
import { appConfirm, appAlert } from '../../utils/dialog';
import { TARGET_LABELS, isPerOpponent, isValidScore } from '../../utils/rules';
import type { CustomEvent, TargetType } from '../../types';
import AppIcon from '../../components/AppIcon.vue';
import PageNav from '../../components/PageNav.vue';

const route = useRoute();
const router = useRouter();
const eventId = route.params.id as string;
const event = computed(() => gameStore.customEvents.find((e: CustomEvent) => e.id === eventId));
const isBuiltIn = computed(() => !!event.value?.isBuiltIn && AppConfig.isPersonal);
const labelOf = (t: TargetType) => TARGET_LABELS[t] ?? t;

const editScore = ref<number>(1);
onMounted(() => {
  if (event.value) editScore.value = event.value.score;
});

const saveScore = async () => {
  if (!isValidScore(editScore.value)) return appAlert('分值需为 1–999 的整数', '提示');
  gameStore.updateEventScore(eventId, editScore.value);
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
    <PageNav title="规则详情" />

    <div class="scroll">
      <div class="content">
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
            <span class="value">{{ labelOf(event.targetType) }}</span>
          </div>
          <div class="row static">
            <div class="row-main"><div class="row-title">换轮洗牌</div></div>
            <span class="value">{{ event.isNextRound ? '开启' : '关闭' }}</span>
          </div>
          <div class="row static">
            <div class="row-main"><div class="row-title">分数变动</div></div>
            <input v-model.number="editScore" type="number" min="1" max="999" step="1" class="score-input num" aria-label="分数变动" />
          </div>
        </div>

        <p v-if="isPerOpponent(event)" class="hint">
          这条规则按「每位对手」结算：{{ event.score }} 分 × 对手人数，触发者按合计变动。
        </p>

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
      </div>
    </div>
  </div>
</template>

<style scoped>
.list {
  margin-top: var(--s2);
}
.value {
  font-size: var(--f-base);
  font-weight: 650;
  color: var(--text-2);
  flex: none;
}
.score-input {
  width: 96px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface-solid);
  color: var(--text-1);
  font-size: var(--f-md);
  font-weight: 700;
  text-align: center;
  outline: none;
  flex: none;
}
.score-input:focus {
  border-color: var(--primary);
}
.hint {
  padding: var(--s3) 0 0;
  font-size: var(--f-xs);
  color: var(--text-3);
  line-height: 1.6;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  margin-top: var(--s5);
}
</style>
