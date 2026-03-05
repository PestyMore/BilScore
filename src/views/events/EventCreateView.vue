<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { appAlert } from '../../utils/dialog';
import type { TargetType } from '../../types';

const router = useRouter();
const name = ref('');
const score = ref<number>(1);
const targetType = ref<TargetType>('take_all');
const isNextRound = ref(true);

const isDropdownOpen = ref(false);

const options = [
  { value: 'take_all', label: '吃所有人分 (Take All)', icon: '🟢' },
  { value: 'give_all', label: '给所有人分 (Give All)', icon: '🔴' },
  { value: 'take_prev', label: '吃上家分', icon: '⬅️' },
  { value: 'give_prev', label: '给上家分', icon: '➡️' },
  { value: 'take_custom', label: '吃指定玩家分', icon: '🎯' },
  { value: 'give_custom', label: '给指定玩家分', icon: '🎁' },
];

const currentOption = computed(() => options.find(o => o.value === targetType.value));

const selectOption = (val: string) => {
  targetType.value = val as TargetType;
  isDropdownOpen.value = false;
};

const save = async () => {
  if (!name.value.trim()) return appAlert("请输入事件名称", "提示");
  gameStore.addEvent({ id: Date.now().toString(), name: name.value.trim(), score: score.value, targetType: targetType.value, isNextRound: isNextRound.value });
  router.back();
};
</script>

<template>
  <div class="page-container">
    <div class="top-bar">
      <button class="icon-btn" @click="router.back()">取消</button>
      <h2>新建事件</h2>
      <button class="icon-btn" style="font-weight: 600;" @click="save">保存</button>
    </div>
    
    <div class="form-container">
      <div class="form-section">
        <div class="input-group">
          <label>事件名称</label>
          <input v-model="name" placeholder="例如：大金" type="text" />
        </div>
      </div>

      <!-- 核心修复：overflow: visible 确保下拉不被切掉，z-index 确保覆盖下方元素 -->
      <div class="form-section" style="overflow: visible; z-index: 10;">
        <div class="input-group">
          <label>记分规则</label>
          <div class="custom-select" @click="isDropdownOpen = !isDropdownOpen">
            <span class="selected-val">
              <span class="opt-icon">{{ currentOption?.icon }}</span> {{ currentOption?.label }}
            </span>
            <span class="arrow" :class="{ rotated: isDropdownOpen }">▼</span>
          </div>
          
          <transition name="fade">
            <div v-if="isDropdownOpen" class="dropdown-menu">
              <div v-for="opt in options" :key="opt.value" 
                   class="dropdown-item" 
                   :class="{ active: opt.value === targetType }"
                   @click.stop="selectOption(opt.value)">
                <span class="opt-icon">{{ opt.icon }}</span>
                <span>{{ opt.label }}</span>
                <span v-if="opt.value === targetType" class="check">✓</span>
              </div>
            </div>
          </transition>
        </div>

        <div class="input-group border-top">
          <label>分数变动</label>
          <input type="number" v-model.number="score" min="1" class="score-input" />
        </div>
      </div>

      <div class="form-section toggle-section" @click="isNextRound = !isNextRound">
        <label>进入下一轮 (重新洗牌)</label>
        <div class="ios-switch" :class="{ active: isNextRound }">
          <div class="knob"></div>
        </div>
      </div>
    </div>
    
    <div v-if="isDropdownOpen" class="fullscreen-mask" @click="isDropdownOpen = false"></div>
  </div>
</template>

<style scoped>
.form-container { display: flex; flex-direction: column; gap: 24px; margin-top: 10px; }
.form-section { background: var(--glass); border-radius: 12px; border: var(--glass-border); position: relative; }
.input-group { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; position: relative; }
.border-top { border-top: 1px solid rgba(128,128,128,0.1); }
label { font-size: 13px; font-weight: 500; color: var(--text-muted); margin-left: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

input { background: transparent !important; border: none !important; box-shadow: none !important; padding: 8px 0; font-size: 19px; font-weight: 500; border-radius: 0; }

.custom-select { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; cursor: pointer; }
.selected-val { font-size: 19px; font-weight: 500; display: flex; align-items: center; gap: 10px; color: var(--text-main); }
.arrow { color: var(--text-muted); font-size: 12px; transition: transform 0.3s; }
.arrow.rotated { transform: rotate(180deg); }
.opt-icon { font-size: 18px; }

/* 下拉菜单样式优化：更高的z-index，背景模糊 */
.dropdown-menu {
  position: absolute; top: 100%; left: -5px; right: -5px; z-index: 999;
  background: var(--glass-modal);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 14px;
  margin-top: 10px;
  padding: 8px;
  box-shadow: 0 15px 50px rgba(0,0,0,0.6);
  display: flex; flex-direction: column; gap: 4px;
}
.dropdown-item {
  padding: 14px; border-radius: 10px; display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 16px; transition: 0.2s;
}
.dropdown-item:active { background: rgba(128,128,128,0.15); }
.dropdown-item.active { background: rgba(0, 122, 255, 0.15); color: var(--primary); font-weight: 600; }
.check { margin-left: auto; font-weight: bold; }

.fullscreen-mask { position: fixed; inset: 0; z-index: 5; }

/* Toggle */
.toggle-section { padding: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.toggle-section label { font-size: 17px; color: var(--text-main); text-transform: none; letter-spacing: 0; margin: 0; }
.ios-switch { width: 51px; height: 31px; background: rgba(120, 120, 128, 0.16); border-radius: 15.5px; position: relative; transition: 0.3s; }
[data-theme="dark"] .ios-switch { background: rgba(120, 120, 128, 0.32); }
.ios-switch.active { background: var(--success); }
.knob { width: 27px; height: 27px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.3s cubic-bezier(0.25, 0.1, 0.25, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.ios-switch.active .knob { transform: translateX(20px); }
</style>