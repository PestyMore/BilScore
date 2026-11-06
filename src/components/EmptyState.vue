<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import type { IconName } from '../icons';

defineProps<{
  icon: IconName;
  title: string;
  desc?: string;
}>();
</script>

<template>
  <div class="empty">
    <div class="empty-icon">
      <AppIcon :name="icon" :size="26" />
    </div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="desc" class="empty-desc">{{ desc }}</div>
    <div class="empty-action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
}
.empty-icon {
  width: 58px;
  height: 58px;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gold-soft);
  color: var(--gold);
  margin-bottom: var(--s4);
}
.empty-title {
  font-size: var(--f-md);
  font-weight: 600;
  color: var(--text-1);
}
.empty-desc {
  margin-top: var(--s2);
  font-size: var(--f-sm);
  color: var(--text-2);
  line-height: 1.6;
  max-width: 260px;
}
.empty-action {
  margin-top: var(--s5);
  width: 100%;
  max-width: 320px;
}
.empty-action:empty {
  display: none;
}
</style>
