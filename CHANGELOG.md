## v1.4.0（2026-10-31）· 玩家编辑 + 应用图标

### ✨ 新功能

- **玩家编辑**：玩家库点任意一行进入编辑（原来只能删除重建），支持改名与换头像颜色；新建页同一组件，靠路由 `:id` 区分，标题与按钮文案随之切换。
- **头像换色**：点击预览头像循环切换色板，色板抽到 `AVATAR_COLORS` 统一维护。

### 🎨 应用图标

- 新增 `app-icon.svg`（8 号球），用 `tauri icon` 重新生成**全平台**图标：桌面 / Windows Store / iOS 全尺寸 / Android mipmap。
- 之前 Android 用的是 Android Studio 的**默认占位图标**（绿色网格 + 机器人前景），现在换成自适应图标：
  - `drawable/ic_launcher_background.xml` → 纯色深底（替换绿色网格）
  - `drawable-v24/ic_launcher_foreground.xml` → 8 号球矢量（按自适应图标 66dp 安全区设计，任何裁切形状都不会切到球）
  - 补齐 `mipmap-*` 各密度的 `ic_launcher.png`（此前 API < 26 的设备完全没有图标）
- 应用名从 `bilscore` 改为 `BilScore`（Android `strings.xml`）。
- `icon.icns` 等体积从约 2.9MB 降到 0.5MB（简洁图形压缩率高得多）。
- 桌面开发窗口的 favicon 换成自有 `public/favicon.svg`，删除默认 `tauri.svg`。

### 🧪 测试

- 冒烟测试新增 `/players/:id` 编辑模式用例，断言标题切换为「编辑玩家」且预填了玩家数据（路由表与真实 app 保持同步）。

---

## v1.3.1（2026-10-31）· 优化打磨

### ⚡ 性能

- **去掉每次点击的全量深拷贝**：`store._updateHistoryList` 原来每次 invoke 都 `JSON.parse(JSON.stringify(...))` 整份玩家列表。Rust 每次都返回全新的 `Player` 对象、不存在原地修改，写盘时 `JSON.stringify` 本身就是快照，所以深拷贝是纯浪费。
- **事件标签改为预计算**：原来在模板里遍历玩家的 `triggeredEvents`，每个标签都要 `customEvents.find()`（O(n)）。现在用 `playerTags` computed 一次算好，并且**按规则定义顺序渲染**——顺带修掉了标签顺序随 Rust `HashMap` 序列化顺序漂移的问题。
- `availablePlayersForReplace` 的 `Array.includes` → `Set.has`（O(n·m) → O(n+m)）。
- 首页历史卡片：把 `formatDate` / `topOf` 从模板里挪进 `records` computed。原来同一张卡片里 `topOf` 就会被算 4 次，每次重渲染又重算一遍。
- `PlayerAvatar` 的深色渐变换算加缓存（头像颜色只有有限几十种）。
- `EventCreateView` / `EventDetailView` 的常量数组与映射表提到模块级，不再每次渲染重建。
- 构建：固定 `target: es2020`、关闭 gzip 体积报告（`reportCompressedSize: false`），构建更快、产物面向 iOS 14+ / Android WebView 基线。

### ✅ 正确性

撤销栈不再被"空操作"污染——以下情况现在**不会**占用一步撤销（否则点撤销会"看起来没反应"）：

- 触发 `take_custom` / `give_custom` 但目标玩家不存在
- 手动改分数但分数没变
- 移除不存在的玩家
- 重排顺序和当前顺序一致

### ✨ 体验

- **首页历史记录可删除**：卡片右上角新增删除按钮（带二次确认），历史不再只能堆到 10 条无法清理。
- **选人页支持全选 / 清空**：人多了不用一个个点。

### 🧪 测试

Rust 单元测试 16 → **18 项**，新增：

- `no_op_operations_do_not_consume_undo`：空操作不消耗撤销步数
- `shuffle_keeps_every_player_exactly_once`：连续 12 次洗牌后玩家不丢不重（覆盖本次洗牌算法重写）

### ♻️ 重构

- `handle_shuffle` 去掉整个数组的 `clone()`，改为"取出赢家/输家 → 剩余就地去重打乱 → 头部插回"，全程零 clone，逻辑也更短。

---

## v1.3.0（2026-10-30）· 视觉重构

一次从「能用的 AI 味界面」到「统一设计系统」的重做。功能逻辑不变，视觉层全换。

### 🎨 图标：PNG + filter 反色 → Lucide 内联 SVG

- 引入 [Lucide](https://lucide.dev)（ISC 开源图标集）共 **27 个图标**，由 `gen-icons.mjs` 从 `lucide-static` 抽取后**内联**进 `src/icons.ts`。
- 为什么内联而不是装组件库：运行时零依赖、零额外网络请求，而且用 `currentColor` 直接跟随主题色，**彻底删掉了原来 `filter: brightness(0) invert(1)` 的反色黑科技**。
- 新增 `AppIcon.vue`，统一 `stroke-width 1.75` 的细线风格。
- 删除 `src/assets/icons/` 下 8 个 PNG（约 59KB），产物更小、任意分辨率都不糊。

### 🧱 设计系统

在 `App.vue` 建立完整 token，替换掉原来到处随机取值的写法：

| 类别 | token |
| --- | --- |
| 圆角 | `--r-xs ~ --r-xl`、`--r-full` |
| 间距 | `--s1 ~ --s7` |
| 字号 | `--f-xs ~ --f-xl` |
| 动效 | `--ease`（iOS 曲线）、`--d1/--d2` |
| 层级 | `--surface-solid / --surface-1/2/3`、`--border / --border-strong` |
| 文本 | `--text-1/2/3` 三级灰阶 |
| 阴影 | `--shadow-1/2/3`（暗色模式自动关闭） |

配套全局类：`.page` `.nav-bar` `.btn/.btn-primary/.btn-danger` `.icon-btn` `.text-btn` `.card` `.row` `.chip` `.section-title` `.bottom-bar` `.scroll`。

### ✨ 各页重做

- **首页**：品牌头 + 主题切换（太阳/月亮图标）；主行动按钮；玩家库/计分规则两个快捷入口（带数量）；最近对局卡片改为「日期 + 轮次徽章 + 头像组 + 得分王（皇冠）」；空状态用图标 + 文案 + 行动按钮。
- **选人页**：顶部显示已选数量；勾选改为描边圆 → 主色填充 + 对勾；底部固定「开始比赛」按钮（带安全区）。
- **对局页**：Round 改为金色胶囊；工具栏 4 个图标按钮（加人/排序/撤销/结束）；玩家卡改为「头像 + 排名 + 名字 + 大号等宽分数」，当前击球位保留流光并加左侧金色指示条；抽屉与弹窗全部重做。
- **玩家库 / 规则列表**：统一分组列表 + 行尾操作图标 + 空状态。
- **新建玩家**：加实时头像预览。
- **新建规则**：下拉菜单改用 `chevron-down` + 勾选态，开关改为带副标题的说明行。
- **弹窗**：`utils/dialog.ts` 迁移到新 token，去掉毛玻璃（移动端 GPU 开销大），改为实心卡片 + iOS 曲线动效。
- **全局**：清掉所有 emoji 图标（🎱⚠️✔️🟢🔴⬅️➡️🎯🎁🟩🟥）。

### ⚡ 性能

- 删除 8 个 PNG 请求；图标改为内联 SVG，随主题变色无需 CSS filter（filter 会触发额外合成）。
- 字体数字统一 `font-variant-numeric: tabular-nums`，分数跳动时不再抖。
- 弹窗去掉 `backdrop-filter`；流光动画仍只保留在「当前击球位」一张卡上。
- 浅色模式阴影分三级，暗色模式自动置 `none`（暗色投影在移动端是纯浪费）。

### 🧪 新增无头冒烟测试

- `npm run smoke`：用 Vue SSR 把 7 个路由全部渲染一遍并断言关键内容，同时校验 27 个图标数据完整。
- 目的：移动端白屏（模块加载 / 模板报错）在本地几乎不可能发现，这个脚本能在不开模拟器、不装 APK 的前提下拦住这类回归。
- 附带 `scripts/mock-env.mjs`（用 `node --import` 提前模拟 localStorage）。

### 🐛 顺手修的

- `PlayerCreateView` 头像颜色原来写在模板里调用 `getRandomColor()`，每次按键都会换色闪烁 → 改为只生成一次。

---

## v1.2.1（2026-10-29）

一次以「**让 CI 能跑通、让真机能装上、让长时间对局不卡**」为目标的维护版本。
依据 [advice.md](./advice.md) 的评估结论，按 [CHANGEPLAN.md](./CHANGEPLAN.md) 逐步落地。

### 🔴 阻塞级修复（不修则 CI 必然失败）

- **修复 `.gitignore` 吞掉全部 Android XML**：原来的 `*.xml` 规则把 `AndroidManifest.xml`、`res/values/*.xml`、`res/xml/file_paths.xml` 全部忽略了，仓库里一个 XML 都没有，CI 拉完代码后 Android 工程直接不可用。改为只忽略根目录的 `/repomix-output.xml`，并补提交全部 Android 资源。
- **轮换签名密钥**：`bilscore.jks` 曾被提交进仓库、口令为 `123456`，视为已泄露。已 `git rm --cached` 出库并生成新密钥（有效期至 2056 年），`key.properties` / `*.jks` 加入忽略规则，CI 改为从 Secrets 注入。
- **`build.gradle.kts` 签名块空值保护**：缺少 `key.properties` 时 `as String` 会抛 NPE，导致连 debug 都编不过。现在无密钥也能构建（出未签名包）。
- **补齐 Android CI**：新增 `.github/workflows/build-android.yml`，支持 public/personal、ABI 拆分 APK、tag 时额外出 AAB、自动建 Release。
- **iOS 产物可安装性**：`build-ios.yml` 去掉会吞错误的 `|| true`；新增可选的「仓库 Secrets 真机签名」路径，未配置时退回未签名 IPA（可用 AltStore / SideStore 侧载）。

### ✨ 正确性修复

- **事件改为按玩家 id 寻址**（原来用数组下标）。洗牌会重排数组，异步往返期间前端持有的下标会失效，连点时会记错人；同时加了提交锁 `isSubmitting`，invoke 期间禁止重复点击。
- **跳转前 await**：`initNewGame` / `resumeGame` 现在等 Rust 侧返回后再进 `/game`，首帧不再空白或残留旧数据。
- **撤销按钮状态真实化**：`GameState` 新增 `historyLen`，撤销按钮按 Rust 撤销栈的真实长度禁用，删掉了原来「长度为 1 的假数组」。
- **持久化防抖**：历史记录写盘从「每次点击同步 `localStorage.setItem`」改为 500ms 防抖，结束对局与页面隐藏时立即落盘。
- **健壮性**：`JSON.parse` 全量 try/catch（脏数据不再白屏）；`getTopScorer` 空数组保护；分数输入 NaN 校验；所有 `invoke` 走 `guard()` 兜底，失败弹原生提示而非静默。
- **Android 返回键**：`MainActivity` 打开 `handleBackNavigation`（wry 支持，Tauri 默认关闭），返回键回上一页而不是直接退出应用。
- **iOS 安全区**：`index.html` 补 `viewport-fit=cover`，否则 `env(safe-area-inset-*)` 恒为 0，刘海和底部横条会挡住内容。
- **`100vh` → `100dvh`**，iOS 上高度更准。

### ⚡ 性能与体积

- **流光边框收敛**：原来 8 张玩家卡同时跑 4s 无限旋转动画，低端机持续掉帧发热。现在只有「当前击球位（#1）」保留流光，其余为静态描边，并支持 `prefers-reduced-motion`。
- **去掉常驻 `backdrop-filter`**：`.game-header` 从毛玻璃改为不透明玻璃底（弹窗仍保留毛玻璃）。
- **烟花克制化**：仅大金/小金（≥7 分）触发，1.5s 节流，按 DPR 缩放（上限 2x），尊重 reduced-motion，切后台立即回收 canvas。
- **Rust release 配置**：`opt-level="s"` + `lto` + `strip` + `codegen-units=1` + `panic="abort"`。
- **减依赖**：删除零引用的 `thiserror`、`serde_json`，以及前端从未 import 的 `tauri-plugin-opener`（Cargo.lock 减少约 520 行依赖树）。

### 🧹 清理

- 删除死代码 `PlayerCountView.vue`、`PlayerNamesView.vue`（路由已无引用）、`public/vite.svg`。
- 删除 `GameSnapshot` 类型与 `historySnapshots`（撤销栈下沉 Rust 后的遗留物）。
- 配置 CSP（`default-src 'self'`，移动端加固）。
- 更新日志从 README 迁出到本文件；版本号统一到 1.2.1。

### 🧪 测试

- 为 `GameCore` 补充 **16 项单元测试**：6 种 targetType 计分、上家/全场/指定目标转账、洗牌胜负排序、撤销回滚（含顺序回滚）、撤销栈 50 上限、加人/换人/移出/排序、单人局不会重复玩家、resume 清空撤销栈。
- 运行方式：`npm run test:rust`。

### 🛠 新增文件

| 文件 | 用途 |
| --- | --- |
| `.github/workflows/build-android.yml` | Android 打包 CI |
| `dev-android.bat` | 一键：无窗口启动 AVD → scrcpy 画面 → `tauri android dev` 热更 |
| `src/utils/invoke.ts` | invoke 统一错误兜底 |
| `CHANGEPLAN.md` | 本次改造的执行计划 |
| `advice.md` | 项目评估与优化建议 |

---

## v1.2.0
- 🚀 **性能革命**：核心计分算法、数据状态与洗牌逻辑下沉至 Rust，彻底告别 JS 深拷贝造成的卡顿。
- ✨ **视觉进化**：新增对局卡片流光边框；重写全局弹窗为原生玻璃态。
- 🎆 **粒子特效**：触发正分换轮事件时，新增烟花庆祝特效。
- 🎨 **布局优化**：全面升级“指定目标”和“自定义排序”选择界面，加入动态选中样式与圆环指示器。

## v1.1.1
- ✂️ 移除人数选择功能，简化操作流程
- 🎨 优化 UI 布局，提升视觉一致性与交互体验
- 🆕 全面启用新图标资源，风格统一，更贴合 iOS 视觉规范

## v1.1.0
- 🎨 **UI 优化**：按键放大以及横屏显示处理
- 🎱 **Personal 版规则扩展**：新增 **黄金 9** 相关计分规则
- ⚙️ **逻辑优化**：统一为 **main 单分支**，通过 `.env` 文件控制 **Personal** 与 **Public** 版本的切换

## v1.0.0
- 🚀 **Initial Commit**：项目基础框架搭建完成
