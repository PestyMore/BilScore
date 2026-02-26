<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gameStore } from '../store';
import { getRandomColor } from '../utils/avatar';
import type { SavedPlayer } from '../types';

const route = useRoute();
const router = useRouter();

// 从路由参数获取需要输入的人数
const targetCount = Number(route.query.count) || 2;

const currentStep = ref(1);
const currentNameInput = ref('');
const collectedNames = ref<string[]>([]);

const title = computed(() => `输入第 ${currentStep.value} 位玩家名称`);

const nextStep = () => {
  // 如果没有输入，给个默认名
  const name = currentNameInput.value.trim() || `玩家 ${currentStep.value}`;
  collectedNames.value.push(name);
  currentNameInput.value = ''; // 清空输入框

  if (currentStep.value < targetCount) {
    currentStep.value++;
  } else {
    // 修复：将收集到的字符串名字转换为 SavedPlayer 对象
    const players: SavedPlayer[] = collectedNames.value.map((n, index) => ({
      id: `temp_${Date.now()}_${index}`,
      name: n,
      avatarColor: getRandomColor()
    }));

    gameStore.initNewGame(players);
    router.replace('/game'); 
  }
};
</script>

<template>
  <div class="page-container">
    <div class="top-bar">
        <button class="icon-btn" @click="router.back()">返回</button>
    </div>
    
    <div class="progress">
      Step {{ currentStep }} / {{ targetCount }}
    </div>

    <div class="input-area">
      <h2>{{ title }}</h2>
      <input 
        type="text" 
        v-model="currentNameInput" 
        :placeholder="'请输入玩家 ' + currentStep + ' 名称'"
        @keyup.enter="nextStep"
        autofocus
      />
    </div>

    <button class="btn btn-primary btn-next" @click="nextStep">
      {{ currentStep === targetCount ? '开始比赛' : '下一位' }}
    </button>
  </div>
</template>

<style scoped>
.progress {
  text-align: right;
  color: var(--text-muted);
  font-weight: bold;
  margin-bottom: 20px;
}

.input-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

h2 { color: var(--text-main); }

input {
  text-align: center;
  font-size: 20px;
}

.btn-next {
  width: 100%;
  height: 60px;
  margin-bottom: 20px;
  font-size: 18px;
}
</style>
