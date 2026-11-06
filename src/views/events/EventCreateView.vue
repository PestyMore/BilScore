<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { appAlert } from '../../utils/dialog';
import { newId } from '../../utils/id';
import { TARGET_OPTIONS, TARGET_LABELS, isValidScore } from '../../utils/rules';
import type { TargetType } from '../../types';
import AppIcon from '../../components/AppIcon.vue';
import PageNav from '../../components/PageNav.vue';

const router = useRouter();
const name = ref('');
const score = ref<number>(1);
const targetType = ref<TargetType>('take_all');
const isNextRound = ref(true);
const isDropdownOpen = ref(false);

const canSave = computed(() => name.value.trim().length > 0 && isValidScore(score.value));

const selectOption = (val: TargetType) => {
  targetType.value = val;
  isDropdownOpen.value = false;
};

const save = async () => {
  if (!name.value.trim()) return appAlert('请输入规则名称', '提示');
  if (!isValidScore(score.value)) return appAlert('分值需为 1–999 的整数', '提示');
  gameStore.addEvent({
    id: newId('e'),
    name: name.value.trim(),
    score: score.value,
    targetType: targetType.value,
    isNextRound: isNextRound.value,
  });
  router.back();
};
</script>

<template>
  <div class="page">
    <PageNav title="新建规则" :back="false">
      <template #left>
        <button class="text-btn muted" @click="router.back()">取消</button>
      </template>
      <template #right>
        <button class="text-btn" :disabled="!canSave" @click="save">保存</button>
      </template>
    </PageNav>

    <div class="scroll">
      <div class="content">
        <div class="card form">
          <div class="field">
            <label class="field-label" for="event-name">规则名称</label>
            <input id="event-name" v-model="name" class="input" placeholder="例如：大金" maxlength="10" />
          </div>

          <div class="field cell-menu">
            <label class="field-label">记分方式</label>
            <button class="select" @click="isDropdownOpen = !isDropdownOpen">
              <span>{{ TARGET_LABELS[targetType] }}</span>
              <AppIcon name="chevron-down" :size="18" :class="{ rotate: isDropdownOpen }" />
            </button>
            <transition name="fade">
              <div v-if="isDropdownOpen" class="menu">
                <button
                  v-for="opt in TARGET_OPTIONS"
                  :key="opt.value"
                  class="menu-item"
                  :class="{ on: opt.value === targetType }"
                  @click.stop="selectOption(opt.value)"
                >
                  <span>{{ opt.label }}</span>
                  <AppIcon v-if="opt.value === targetType" name="check" :size="16" :stroke="2.4" />
                </button>
              </div>
            </transition>
          </div>

          <div class="field">
            <label class="field-label" for="event-score">分数变动</label>
            <input id="event-score" v-model.number="score" type="number" min="1" max="999" step="1" class="input num" />
            <span class="field-hint">
              1–999 的整数。吃/给所有人分时，每位对手各变动此分值。
            </span>
          </div>
        </div>

        <div class="switch-row" @click="isNextRound = !isNextRound">
          <div>
            <div class="switch-title">换轮并重新洗牌</div>
            <div class="switch-sub">开启后，触发该规则会进入下一轮</div>
          </div>
          <div class="switch" :class="{ on: isNextRound }"><span class="knob"></span></div>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="content">
        <button class="btn btn-primary btn-block" :disabled="!canSave" @click="save">
          <AppIcon name="check" :size="19" />
          <span>保存规则</span>
        </button>
      </div>
    </div>

    <div v-if="isDropdownOpen" class="mask" @click="isDropdownOpen = false"></div>
  </div>
</template>

<style scoped>
.form {
  margin-top: var(--s2);
  overflow: visible;
}
.cell-menu {
  position: relative;
  overflow: visible;
  z-index: 5;
}
.select {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  border: none;
  background: transparent;
  color: var(--text-1);
  font-size: var(--f-md);
  font-weight: 600;
  cursor: pointer;
}
.select :deep(.app-icon) {
  color: var(--text-3);
  transition: transform var(--d1) var(--ease);
}
.select :deep(.app-icon.rotate) {
  transform: rotate(180deg);
}
.menu {
  position: absolute;
  left: var(--s3);
  right: var(--s3);
  top: calc(100% - var(--s1));
  z-index: 20;
  padding: var(--s1);
  border-radius: var(--r-md);
  background: var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 var(--s3);
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-1);
  font-size: var(--f-base);
  cursor: pointer;
}
.menu-item:active {
  background: var(--surface-2);
}
.menu-item.on {
  color: var(--primary);
  font-weight: 650;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s4);
  margin-top: var(--s5);
  padding: var(--s4);
  border-radius: var(--r-md);
  background: var(--surface-1);
  cursor: pointer;
}
.switch-title {
  font-size: var(--f-base);
  font-weight: 650;
}
.switch-sub {
  margin-top: 2px;
  font-size: var(--f-sm);
  color: var(--text-2);
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 4;
}
</style>
