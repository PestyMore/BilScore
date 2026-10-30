<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gameStore } from '../../store';
import { getRandomColor, AVATAR_COLORS } from '../../utils/avatar';
import AppIcon from '../../components/AppIcon.vue';
import PlayerAvatar from '../../components/PlayerAvatar.vue';

const router = useRouter();
const route = useRoute();

// 有 :id 就是编辑模式，否则是新建
const editId = (route.params.id as string) || '';
const existing = editId ? gameStore.savedPlayers.find((p) => p.id === editId) : undefined;
const isEdit = !!existing;

const name = ref(existing?.name ?? '');
// 只生成一次：写在模板里会每次重渲染都换色，输入时头像会闪烁
const color = ref(existing?.avatarColor ?? getRandomColor());

const canSave = computed(() => name.value.trim().length > 0);

// 点头像换个颜色：比给一整排色块更省地方，也更好玩
const cycleColor = () => {
  const i = AVATAR_COLORS.indexOf(color.value);
  color.value = AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length];
};

const save = () => {
  const value = name.value.trim();
  if (!value) return;
  if (isEdit) {
    gameStore.updateSavedPlayer(editId, { name: value, avatarColor: color.value });
  } else {
    gameStore.addSavedPlayer({ id: `u_${Date.now()}`, name: value, avatarColor: color.value });
  }
  router.back();
};
</script>

<template>
  <div class="page">
    <header class="nav-bar">
      <div class="nav-side">
        <button class="text-btn" @click="router.back()">取消</button>
      </div>
      <div class="nav-title">{{ isEdit ? '编辑玩家' : '新建玩家' }}</div>
      <div class="nav-side right">
        <button class="text-btn strong" :disabled="!canSave" @click="save">保存</button>
      </div>
    </header>

    <div class="scroll">
      <section class="preview">
        <button class="avatar-btn" @click="cycleColor" :aria-label="'更换头像颜色'">
          <PlayerAvatar :name="name || '?'" :color="color" :size="76" />
          <span class="avatar-badge">
            <AppIcon name="repeat" :size="13" />
          </span>
        </button>
        <p class="preview-hint">
          {{ isEdit ? '写下昵称，点头像可以换颜色' : '写下昵称，头像会自动生成' }}
        </p>
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
        <button class="btn btn-primary btn-block" :disabled="!canSave" @click="save">
          <AppIcon name="check" :size="19" />
          <span>{{ isEdit ? '保存修改' : '保存玩家' }}</span>
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
.avatar-btn {
  position: relative;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: var(--r-full);
  transition: transform var(--d1) var(--ease);
}
.avatar-btn:active {
  transform: scale(0.94);
}
.avatar-badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 26px;
  height: 26px;
  border-radius: var(--r-full);
  background: var(--surface-solid);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-2);
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
