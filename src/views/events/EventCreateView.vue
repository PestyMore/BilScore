<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import type { TargetType } from '../../types';
const router = useRouter();
const name = ref('');
const score = ref<number>(1);
const targetType = ref<TargetType>('take_all');
const isNextRound = ref(true);
const save = () => {
  if (!name.value.trim()) return alert("请输入事件名称");
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

      <div class="form-section">
        <div class="input-group">
          <label>记分规则</label>
          <div class="select-wrapper">
            <select v-model="targetType">
              <option value="take_all">吃所有人分 (Take All)</option>
              <option value="give_all">给所有人分 (Give All)</option>
              <option value="take_prev">吃上家分</option>
              <option value="give_prev">给上家分</option>
              <option value="take_custom">吃指定玩家分</option>
              <option value="give_custom">给指定玩家分</option>
            </select>
            <span class="arrow">▼</span>
          </div>
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
  </div>
</template>
<style scoped>
.form-container { display: flex; flex-direction: column; gap: 24px; margin-top: 10px; }
.form-section { background: var(--glass); border-radius: 12px; overflow: hidden; border: var(--glass-border); }

.input-group { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
.border-top { border-top: 1px solid rgba(128,128,128,0.1); }

label { font-size: 13px; font-weight: 500; color: var(--text-muted); margin-left: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

/* 覆盖全局 input 样式，使其更像列表项 */
input, select {
  background: transparent !important; /* 在卡片内透明 */
  border: none !important;
  box-shadow: none !important;
  padding: 8px 0;
  font-size: 19px;
  font-weight: 500;
  border-radius: 0;
}
input:focus, select:focus { box-shadow: none !important; }

.select-wrapper { position: relative; }
.arrow { position: absolute; right: 0; top: 10px; color: var(--text-muted); font-size: 12px; pointer-events: none; }

/* Toggle */
.toggle-section { padding: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.toggle-section label { font-size: 17px; color: var(--text-main); text-transform: none; letter-spacing: 0; margin: 0; }

.ios-switch { width: 51px; height: 31px; background: rgba(120, 120, 128, 0.16); border-radius: 15.5px; position: relative; transition: 0.3s; }
[data-theme="dark"] .ios-switch { background: rgba(120, 120, 128, 0.32); }
.ios-switch.active { background: var(--success); }
.knob { width: 27px; height: 27px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.3s cubic-bezier(0.25, 0.1, 0.25, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.ios-switch.active .knob { transform: translateX(20px); }
</style>
