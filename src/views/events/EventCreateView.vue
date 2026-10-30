<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { appAlert } from '../../utils/dialog';
import type { TargetType } from '../../types';
import AppIcon from '../../components/AppIcon.vue';

const router = useRouter();
const name = ref('');
const score = ref<number>(1);
const targetType = ref<TargetType>('take_all');
const isNextRound = ref(true);
const isDropdownOpen = ref(false);

const options: { value: TargetType; label: string }[] = [
  { value: 'take_all', label: '吃所有人分' },
  { value: 'give_all', label: '给所有人分' },
  { value: 'take_prev', label: '吃上家分' },
  { value: 'give_prev', label: '给上家分' },
  { value: 'take_custom', label: '吃指定玩家分' },
  { value: 'give_custom', label: '给指定玩家分' },
];

const currentOption = computed(() => options.find((o) => o.value === targetType.value));
const canSave = computed(() => name.value.trim().length > 0 && Number.isFinite(score.value));

const selectOption = (val: string) => {
  targetType.value = val as TargetType;
  isDropdownOpen.value = false;
};

const save = async () => {
  if (!name.value.trim()) return appAlert('请输入规则名称', '提示');
  if (!Number.isFinite(score.value)) return appAlert('请输入有效分数', '提示');
  gameStore.addEvent({
    id: Date.now().toString(),
    name: name.value.trim(),
    score: Math.trunc(score.value),
    targetType: targetType.value,
    isNextRound: isNextRound.value,
  });
  router.back();
};
</script>

<template>
  <div class="page">
    <header class="nav-bar">
      <div class="nav-side">
        <button class="text-btn" @click="router.back()">取消</button>
      </div>
      <div class="nav-title">新建规则</div>
      <div class="nav-side right">
        <button class="text-btn strong" :disabled="!canSave" @click="save">保存</button>
      </div>
    </header>

    <div class="scroll">
      <div class="card form">
        <div class="cell">
          <label>规则名称</label>
          <input v-model="name" class="input" placeholder="例如：大金" maxlength="10" />
        </div>

        <div class="cell split">
          <label>记分方式</label>
          <button class="select" @click="isDropdownOpen = !isDropdownOpen">
            <span>{{ currentOption?.label }}</span>
            <AppIcon name="chevron-down" :size="18" :class="{ rotate: isDropdownOpen }" />
          </button>
          <transition name="fade">
            <div v-if="isDropdownOpen" class="menu">
              <button
                v-for="opt in options"
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

        <div class="cell">
          <label>分数变动</label>
          <input v-model.number="score" type="number" min="1" class="input num" />
        </div>
      </div>

      <div class="switch-row" @click="isNextRound = !isNextRound">
        <div>
          <div class="switch-title">换轮并重新洗牌</div>
          <div class="switch-sub">开启后，触发该规则会进入下一轮</div>
        </div>
        <div class="switch" :class="{ on: isNextRound }">
          <span class="knob"></span>
        </div>
      </div>

      <div class="bottom-bar">
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
  margin: var(--s2) var(--s4) var(--s5);
  overflow: visible;
}
.cell {
  position: relative;
  padding: var(--s3) var(--s4);
}
.cell + .cell {
  border-top: 1px solid var(--border);
}
.cell.split {
  overflow: visible;
  z-index: 5;
}
.cell label {
  display: block;
  font-size: var(--f-sm);
  color: var(--text-2);
  margin-bottom: var(--s2);
}
.input {
  width: 100%;
  height: 34px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-1);
  font-size: var(--f-md);
  font-weight: 500;
}
.input::placeholder {
  color: var(--text-3);
}
.input.num {
  font-variant-numeric: tabular-nums;
}
.select {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--text-1);
  font-size: var(--f-md);
  font-weight: 500;
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
  height: 44px;
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
  font-weight: 600;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s4);
  margin: 0 var(--s4);
  padding: var(--s4);
  border-radius: var(--r-md);
  background: var(--surface-1);
  cursor: pointer;
}
.switch-title {
  font-size: var(--f-base);
  font-weight: 600;
}
.switch-sub {
  margin-top: 2px;
  font-size: var(--f-sm);
  color: var(--text-2);
}
.switch {
  width: 51px;
  height: 31px;
  border-radius: var(--r-full);
  background: var(--surface-3);
  position: relative;
  flex: none;
  transition: background var(--d2) var(--ease);
}
.switch.on {
  background: var(--success);
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: var(--r-full);
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform var(--d2) var(--ease);
}
.switch.on .knob {
  transform: translateX(20px);
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 4;
}
.bottom-bar {
  margin-top: var(--s6);
  border-top: none;
}
</style>
