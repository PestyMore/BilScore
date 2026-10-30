<script setup lang="ts">
import { ICONS, type IconName } from '../icons';

const props = withDefaults(
  defineProps<{
    name: IconName;
    size?: number | string;
    stroke?: number;
  }>(),
  { size: 22, stroke: 1.75 }
);
</script>

<template>
  <svg
    class="app-icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="ICONS[props.name]"
  />
</template>

<style scoped>
.app-icon {
  display: block;
  flex: none;
  /* 图标跟随文字颜色，主题切换无需任何 filter 反色 */
  color: inherit;
}
</style>
