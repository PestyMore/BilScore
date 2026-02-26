<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { getRandomColor } from '../../utils/avatar';

const router = useRouter();
const name = ref('');

const save = () => {
  if (!name.value.trim()) return;
  gameStore.addSavedPlayer({ id: `u_${Date.now()}`, name: name.value.trim(), avatarColor: getRandomColor() });
  router.back();
};
</script>

<template>
  <div class="page-container">
    <div class="top-bar">
      <button class="icon-btn" @click="router.back()">取消</button>
      <h2>新建玩家</h2>
      <button class="icon-btn" @click="save">保存</button>
    </div>
    <div class="form">
      <input v-model="name" placeholder="请输入玩家昵称..." autofocus @keyup.enter="save" />
    </div>
  </div>
</template>
