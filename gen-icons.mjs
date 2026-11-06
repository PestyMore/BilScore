// 工具：从 lucide-static 抽取所需图标的内部矢量数据，生成 src/icons.ts
// 图标已内联进 src/icons.ts，运行时零依赖，所以 lucide-static 平时不安装。
// 需要新增图标时：
//   npm i -D lucide-static
//   在下方 names 数组里加上图标名
//   node gen-icons.mjs
//   npm uninstall -D lucide-static
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

const names = [
  'arrow-down-up', 'arrow-left', 'check', 'chevron-down', 'chevron-right',
  'circle-dot', 'circle-stop', 'crown', 'flag', 'history', 'list-ordered',
  'moon', 'pencil', 'play', 'plus', 'repeat', 'rotate-ccw',
  'sliders-horizontal', 'sparkles', 'sun', 'target', 'trophy', 'trash-2',
  'triangle-alert', 'undo-2', 'user-minus', 'user-plus', 'user-round',
  'users', 'x',
];

const out = [];
let failed = [];

for (const name of names) {
  const file = join(root, 'node_modules', 'lucide-static', 'icons', `${name}.svg`);
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    failed.push(name);
    continue;
  }
  const m = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  if (!m) { failed.push(name); continue; }
  const inner = m[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  out.push(`  ${JSON.stringify(name)}: ${JSON.stringify(inner)},`);
}

if (failed.length) {
  console.error('缺失图标：', failed.join(', '));
  process.exit(1);
}

const content = `// src/icons.ts
// Lucide 图标（lucide-icons 开源项目，ISC 许可）的内联矢量数据。
// 直接内联而不是引入组件库的原因：零运行时依赖、零额外请求、
// 且可以用 currentColor 直接跟随主题色，比原来的 PNG + filter 反色方案更小更快。
// 由 gen-icons.mjs 从 lucide-static 生成，请勿手工编辑。

export type IconName =
${names.map((n) => `  | '${n}'`).join('\n')};

export const ICONS: Record<IconName, string> = {
${out.join('\n')}
};
`;

writeFileSync(join(root, 'src', 'icons.ts'), content, 'utf8');
console.log(`生成 src/icons.ts，共 ${names.length} 个图标`);
