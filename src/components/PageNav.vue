<script setup lang="ts">
import { useRouter } from 'vue-router';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    /** false = 不显示返回按钮；字符串 = 返回到指定路由；true = router.back() */
    back?: boolean | string;
  }>(),
  { title: '', back: true }
);

const router = useRouter();
const goBack = () => {
  if (typeof props.back === 'string') router.push(props.back);
  else router.back();
};
</script>

<template>
  <header class="nav-bar">
    <div class="content nav-inner">
      <div class="nav-side">
        <button v-if="back" class="icon-btn ghost" @click="goBack" aria-label="返回">
          <AppIcon name="arrow-left" :size="20" />
        </button>
        <slot name="left" />
      </div>
      <div class="nav-title"><slot name="title">{{ title }}</slot></div>
      <div class="nav-side right"><slot name="right" /></div>
    </div>
  </header>
</template>
