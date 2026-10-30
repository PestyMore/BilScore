// scripts/mock-env.mjs
// 在 SSR 冒烟测试里最小模拟浏览器环境。
// 必须用 `node --import` 先加载：store 模块在被 import 时就会读 localStorage，
// 如果放在测试文件里赋值会被 ESM 的 import 提升抢先执行。

const store = new Map();

const players = [
  { id: 'u_1', name: '张三', avatarColor: '#ff4757' },
  { id: 'u_2', name: '李四', avatarColor: '#1e90ff' },
  { id: 'u_3', name: 'Wang', avatarColor: '#2ed573' },
];

store.set('bilscore_players', JSON.stringify(players));
store.set(
  'bilscore_events',
  JSON.stringify([
    { id: 'e_1', name: '大金', targetType: 'take_all', score: 10, isNextRound: true },
    { id: 'e_2', name: '犯规', targetType: 'give_prev', score: 1, isNextRound: false },
  ])
);
store.set(
  'bilscore_history',
  JSON.stringify([
    {
      id: 'game_smoke',
      lastEdited: Date.now(),
      round: 3,
      players: players.map((p) => ({ ...p, score: 7, triggeredEvents: { e_1: 2 } })),
    },
  ])
);

globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
};
