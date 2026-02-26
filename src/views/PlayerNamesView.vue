<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gameStore } from '../store';

const route = useRoute();
const router = useRouter();

// 从路由参数获取需要输入的人数
const targetCount = Number(route.query.count) || 2;

const currentStep = ref(1);
const currentNameInput = ref('');
const collectedNames = ref<string[]>([]);

const title = computed(() => `Player ${currentStep.value} Name`);

const nextStep = () => {
  // 如果没有输入，给个默认名
  const name = currentNameInput.value.trim() || `Player ${currentStep.value}`;
  collectedNames.value.push(name);
  currentNameInput.value = ''; // 清空输入框

  if (currentStep.value < targetCount) {
    currentStep.value++;
  } else {
    // 名字收集完毕，存入 Store，进入游戏
    gameStore.initNewGame(collectedNames.value);
    router.replace('/game'); // 使用 replace 防止用户点返回又回到输入名字的最后一步
  }
};
</script>

<template>
  <div class="page-container">
    <div class="progress">
      Step {{ currentStep }} / {{ targetCount }}
    </div>

    <div class="input-area">
      <h2>{{ title }}</h2>
      <input 
        type="text" 
        v-model="currentNameInput" 
        :placeholder="'Enter name for player ' + currentStep"
        @keyup.enter="nextStep"
        autofocus
      />
    </div>

    <button class="btn btn-next" @click="nextStep">
      {{ currentStep === targetCount ? 'START GAME' : 'NEXT' }}
    </button>
  </div>
</template>

<style scoped>
.page-container {
  height: 100vh;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
}

.progress {
  text-align: right;
  color: #718093;
  font-weight: bold;
}

.input-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

input {
  width: 100%;
  padding: 20px;
  font-size: 20px;
  border: 2px solid #dcdde1;
  border-radius: 12px;
  outline: none;
  text-align: center;
}
input:focus {
  border-color: #00a8ff;
}

.btn-next {
  width: 100%;
  height: 60px;
  margin-bottom: 20px;
}
</style>
