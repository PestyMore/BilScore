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
      <button class="icon-btn" @click="save">保存</button>
    </div>

    <div class="form">
      <div class="form-group">
        <label>事件名称</label>
        <input v-model="name" placeholder="例如：大金" />
      </div>

      <div class="form-group">
        <label>记分规则</label>
        <select v-model="targetType">
          <option value="take_all">吃所有人分 (自己加分，别人扣分)</option>
          <option value="give_all">给所有人分 (自己扣分，别人加分)</option>
          <option value="take_prev">吃上家分</option>
          <option value="give_prev">给上家分</option>
          <option value="take_custom">吃指定玩家分</option>
          <option value="give_custom">给指定玩家分</option>
        </select>
      </div>

      <div class="form-group">
        <label>分数变动值</label>
        <input type="number" v-model.number="score" min="1" />
      </div>

      <div class="form-group toggle-group" @click="isNextRound = !isNextRound">
        <label style="margin: 0;">触发后进入下一轮 (重新洗牌)</label>
        <div class="toggle" :class="{ on: isNextRound }">
          <div class="knob"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
label { font-size: 14px; color: var(--text-muted); font-weight: 500; margin-left: 5px; }

/* iOS 风格 Toggle */
.toggle-group { 
  flex-direction: row; justify-content: space-between; align-items: center; 
  background: var(--glass); padding: 16px; border-radius: 16px; border: var(--glass-border); cursor: pointer;
}
.toggle { width: 50px; height: 30px; background: rgba(255,255,255,0.2); border-radius: 15px; position: relative; transition: 0.3s; }
.toggle.on { background: var(--success); }
.knob { width: 26px; height: 26px; background: white; border-radius: 13px; position: absolute; top: 2px; left: 2px; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
.toggle.on .knob { transform: translateX(20px); }
</style>
