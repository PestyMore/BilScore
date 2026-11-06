// scripts/ssr-smoke.ts
// 无头冒烟测试：把每个页面用 Vue SSR 渲染一遍，确保组件能被实例化、模板没有崩。
// 存在的意义：移动端白屏（模块加载/模板报错）在本地几乎无法发现，
// 这个脚本能在不开模拟器、不装 APK 的前提下把这类回归拦下来。
// 运行：npm run smoke

import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createRouter, createMemoryHistory } from 'vue-router';
import { ICONS } from '../src/icons';

import HomeView from '../src/views/HomeView.vue';
import PlayerSelectView from '../src/views/PlayerSelectView.vue';
import GameView from '../src/views/GameView.vue';
import EventListView from '../src/views/events/EventListView.vue';
import EventCreateView from '../src/views/events/EventCreateView.vue';
import EventDetailView from '../src/views/events/EventDetailView.vue';
import PlayerListView from '../src/views/players/PlayerListView.vue';
import PlayerCreateView from '../src/views/players/PlayerCreateView.vue';

// 注意：localStorage 的模拟在 scripts/mock-env.mjs 里，
// 通过 `node --import` 在本模块加载前完成（store 模块 import 时就会读它）。

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/select-players', name: 'PlayerSelect', component: PlayerSelectView },
  { path: '/game', name: 'Game', component: GameView },
  { path: '/events', name: 'EventList', component: EventListView },
  { path: '/events/new', name: 'EventCreate', component: EventCreateView },
  { path: '/events/:id', name: 'EventDetail', component: EventDetailView },
  { path: '/players', name: 'PlayerList', component: PlayerListView },
  { path: '/players/new', name: 'PlayerCreate', component: PlayerCreateView },
  { path: '/players/:id', name: 'PlayerEdit', component: PlayerCreateView },
];

const cases: { path: string; expect: string[] }[] = [
  // 首页历史卡只渲染头像文字（"张三" → "三"），所以这里断言结构串而不是全名
  { path: '/', expect: ['BilScore', '开始新对局', '第 3 轮', '7'] },
  { path: '/select-players', expect: ['挑选参赛玩家', '张三'] },
  { path: '/game', expect: ['ROUND'] },
  { path: '/events', expect: ['计分规则', '大金'] },
  { path: '/events/new', expect: ['新建规则'] },
  { path: '/events/e_1', expect: ['规则详情', '大金'] },
  { path: '/players', expect: ['玩家库', '张三'] },
  { path: '/players/new', expect: ['新建玩家'] },
  // 同一个组件靠 :id 切换成编辑模式，这里断言它确实预填了玩家数据
  { path: '/players/u_1', expect: ['编辑玩家', '张三'] },
];

async function main() {
  let failed = 0;

  for (const c of cases) {
    const router = createRouter({ history: createMemoryHistory(), routes });
    const app = createSSRApp({ template: '<router-view />' });
    app.use(router);
    app.config.warnHandler = () => {};

    try {
      await router.push(c.path);
      await router.isReady();
      const html = await renderToString(app);
      const missing = c.expect.filter((s) => !html.includes(s));
      if (missing.length) {
        failed++;
        console.error(`✗ ${c.path} 缺少内容: ${missing.join(', ')}`);
      } else {
        console.log(`✓ ${c.path} (${html.length} 字节)`);
      }
    } catch (e) {
      failed++;
      console.error(`✗ ${c.path} 渲染抛错:`, e);
    }
  }

  // 图标完整性：用到的图标名必须都有矢量数据
  const emptyIcons = Object.entries(ICONS).filter(([, v]) => !v || !v.includes('<'));
  if (emptyIcons.length) {
    failed++;
    console.error('✗ 以下图标没有矢量数据:', emptyIcons.map(([k]) => k).join(', '));
  } else {
    console.log(`✓ 图标数据完整（${Object.keys(ICONS).length} 个）`);
  }

  if (failed > 0) {
    console.error(`\n冒烟测试失败：${failed} 项`);
    process.exit(1);
  }
  console.log('\n冒烟测试全部通过');
}

main();
