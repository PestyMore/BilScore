<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { getRandomColor } from '../../utils/avatar';
import AppIcon from '../../components/AppIcon.vue';
import PlayerAvatar from '../../components/PlayerAvatar.vue';

const router = useRouter();
const name = ref('');
// 只生成一次：写在模板里会每次重渲染都换色，输入时头像会闪烁
const color = ref(getRandomColor());

const canSave = () => name.value.trim().length > 0;

const save = () => {
  const value = name.value.trim();
  if (!value) return;
  gameStore.addSavedPlayer({ id: `u_${Date.now()}`, name: value, avatarColor: color.value });
  router.back();
};
</script>

<template>
  <div class="page">
    <header class="nav-bar">
      <div class="nav-side">
        <button class="text-btn" @click="router.back()">取消</button>
      </div>
      <div class="nav-title">新建玩家</div>
      <div class="nav-side right">
        <button class="text-btn strong" :disabled="!canSave()" @click="save">保存</button>
      </div>
    </header>

    <div class="scroll">
      <section class="preview">
        <PlayerAvatar :name="name || '?'" :color="color" :size="76" />
        <p class="preview-hint">写下昵称，头像会自动生成</p>
      </section>

      <div class="card field">
        <input
          v-model="name"
          class="input"
          placeholder="请输入玩家昵称"
          autofocus
          maxlength="12"
          @keyup.enter="save"
        />
      </div>

      <div class="bottom-bar">
        <button class="btn btn-primary btn-block" :disabled="!canSave()" @click="save">
          <AppIcon name="check" :size="19" />
          <span>保存玩家</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--s7) 0 var(--s6);
}
.preview-hint {
  margin-top: var(--s4);
  font-size: var(--f-sm);
  color: var(--text-3);
}
.field {
  margin: 0 var(--s4);
  padding: var(--s1) var(--s4);
}
.input {
  width: 100%;
  height: 54px;
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
.bottom-bar {
  margin-top: var(--s6);
  border-top: none;
}
</style>
