<script setup lang="ts">
import { computed } from 'vue';
import { getAvatarText } from '../utils/avatar';

const props = withDefaults(
  defineProps<{
    name: string;
    color: string;
    size?: number;
  }>(),
  { size: 40 }
);

// 用同色深色做对角渐变，比纯色圆块更有质感，且不额外增加渲染成本
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.4)}px`,
  backgroundImage: `linear-gradient(145deg, ${props.color}, ${shade(props.color)})`,
}));

// 头像颜色是有限的几十种，缓存掉解析与换算，避免每次重渲染都算一遍
const shadeCache = new Map<string, string>();

function shade(hex: string): string {
  const cached = shadeCache.get(hex);
  if (cached) return cached;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const rgb = [1, 2, 3].map((i) => parseInt(m[i], 16));
  const dark = rgb.map((c) => Math.round(c * 0.66));
  const result = `rgb(${dark[0]}, ${dark[1]}, ${dark[2]})`;
  shadeCache.set(hex, result);
  return result;
}
</script>

<template>
  <div class="avatar" :style="style">{{ getAvatarText(props.name) }}</div>
</template>

<style scoped>
.avatar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  user-select: none;
}
</style>
