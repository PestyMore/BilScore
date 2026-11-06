# BilScore 改造执行计划（CHANGEPLAN）

> 制度依据：[DOCS.md](./DOCS.md)　基线：v1.4.0　目标版本：**v2.0.0**
> 制定日期：2026-11-06　执行方式：按 `CP-01 → CP-08` 顺序推进，每完成一项立即回填 [CHANGELOG.md](./CHANGELOG.md)

---

## 一、产品判断（深度思考的结论）

**使用场景**：球房里 2–8 人打追分，一个人拿着手机或平板记分，一晚上点几百次，全程无网络，中途会被消息、电话、锁屏打断。

由此推出四条设计准则，后续所有取舍都以此为准：

1. **一次记分不超过两次点击**：选人 → 点规则，不能藏在二级菜单后。
2. **分数永远可读**：任何尺寸下，谁领先、领先多少，一眼可见。
3. **数据不能丢**：切后台、杀进程、误点返回，都不该丢失当前这一局。
4. **手机与平板是两种产品**：手机靠底部抽屉节省空间；平板应把操作台常驻在右侧，而不是把手机布局拉宽。

**明确不做**（避免过度工程）：不引入 UI 组件库、状态管理库、路由守卫框架、数据库、持久化插件；不新增 Rust 依赖；不做桌面端分发；不做云同步、账号、多语言。

## 二、功能矩阵

| 类型 | 内容 |
| --- | --- |
| 保留（一个都不能少） | 玩家库增删改 + 文字头像换色；选人开局（选中顺序 = 击球顺序）；6 种结算方式；内置 10 条规则（personal 版）/ 自定义规则（public 版）；换轮洗牌；50 步撤销；手动修正分数；中途加人 / 替换 / 移出 / 自定义排序；最近 10 条历史与续玩 / 删除；明暗主题；高分事件烟花；public / personal 双构建模式；Rust 侧 18+ 项单测 |
| 修正 | 分数空输入被当成 0；规则分值可为负数 / 0；`*_all` 分值口径显示为「每家」；`Date.now()` 作 id 会碰撞；抽屉按下标选人会在洗牌后指错人；未知结算方式静默消耗撤销步数；人数无上下限；换人后继承前任事件统计；Android 状态栏遮挡；`color-mix()` 旧 WebView 不兼容；浅色主题首帧闪暗；表单底部按钮不是真固定；返回键直接退出 App |
| 新增（高价值） | 断点续玩：活跃对局独立标记，首页置顶「继续上一局」，对局页可直接返回首页而不结束；本局计分流水（谁、什么事件、分数变化），撤销同步回退；玩家库历史战绩（场次 / 胜场）；记分轻震动反馈（Android）；平板常驻操作台 |
| 入口顺序调整 | 首页：继续上一局（有则置顶）→ 开始新对局 → 玩家库 / 计分规则 → 最近对局；对局页顶栏新增「返回首页（保留对局）」，把「结束对局」从唯一出口降级为显式操作 |

## 三、UI 体系：Felt Table（台呢）

- 暗色（默认）：墨绿 / 炭黑背景、台呢绿强调、黄铜金高亮、象牙白文字；正分绿、负分红。
- 浅色：奶油白背景、深墨绿文字、同色系强调。
- 全部用显式 `rgba()` 变量，**移除 `color-mix()`**（Android minSdk 24 允许老旧 WebView）。
- 圆角 / 间距 / 字号 / 动效沿用现有 token 命名，不另起一套；动效只保留点击态、页面淡入、抽屉上升。
- 数字统一 `tabular-nums`；分数用大号等宽数字。

**响应式断点**（对齐主流尺寸）：

| 断点 | 典型设备 | 布局 |
| --- | --- | --- |
| `< 360px` | 小屏手机 | 导航侧列收窄、字号降档、事件按钮单列 |
| `360–599px` | 手机竖屏（主流） | 单列、内容满宽、底部抽屉、固定底栏 |
| `600–899px` | 大屏手机 / 手机横屏 / 小平板 | 内容限宽居中，玩家卡双列，历史双列 |
| `900–1199px` | iPad / 平板竖屏 | 对局页 `玩家卡 + 右侧常驻操作台`，首页限宽双栏 |
| `>= 1200px` | iPad Pro / 平板横屏 | 玩家卡三列，整体限宽 1200px 居中 |
| `横屏且高度 < 500px` | 手机横屏 | 压缩顶栏与卡片内边距，抽屉改侧边 |

安全区：iOS 继续用 `env(safe-area-inset-*)`；Android 移除 `enableEdgeToEdge()`，由系统栏占位，主题里固定系统栏颜色 —— 这样不需要 JS 注入 insets，也不依赖任何插件。

## 四、批次计划

状态口径：`待办` / `进行中` / `完成` / `取消`。验收标准均为静态可检查项；命令验证统一在 CP-08 执行一次（见 DOCS.md 第 5 节）。

### CP-01　配置基线与仓库卫生　`完成`

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 版本号统一 2.0.0 | `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`gen/android/app/tauri.properties` | 四处一致 |
| 桌面开发窗口改手机比例 | `src-tauri/tauri.conf.json` | 393 × 852 |
| 补齐双模式环境文件 | `.env.public`（新建）、`.env.personal`（新建） | 各含一行 `VITE_APP_MODE`，`*:per` 脚本可打出 personal 版 |
| 去除 Android 生成副本里的硬编码局域网 IP 与旧版本号 | `gen/android/app/src/main/assets/tauri.conf.json` | 无 `10.112.66.215`，版本 2.0.0 |
| Android 主题与模板残留清理 | `MainActivity.kt`、`values/themes.xml`、`values-night/themes.xml`、`values/colors.xml`、`layout/activity_main.xml` | 无 `enableEdgeToEdge`、无 `Hello World!`、系统栏有明确颜色 |
| 删除根目录乱码命名的 0 字节残留文件 | 根目录 | 文件不存在 |

### CP-02　计分核心与数据正确性　`完成`

> **计划调整（2026-11-06）**：表单页面会在 CP-05 整体重写、`GameView.vue` 会在 CP-06 整体重写，
> 因此这些文件里的输入校验 / id 替换 / 分值口径 / 人数上限统一并入 CP-05、CP-06 一次做完，
> 避免同一文件在相邻批次被改两遍。规则载入写回随 CP-03 的 store 重写一起完成。

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| Rust：人数边界 2–8、未知结算方式为纯 no-op、换人重置事件统计 | `src-tauri/src/game_core.rs` | 越界操作不入撤销栈；新增 3 项单测（共 21 项） |
| 公共 id 工具 | `src/utils/id.ts`（新建） | 提供 `newId(prefix)`，非安全上下文有回退 |

### CP-03　状态层：断点续玩 / 流水 / 战绩　`完成`

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 新增类型 `GameLogEntry`、`ActiveGame` | `src/types/index.ts` | 字段包含轮次、操作者、事件、分数变化、时间 |
| 活跃对局标记 `bilscore_active`，状态变化防抖写入，结束对局清除 | `src/store/index.ts` | 切后台 / 杀进程后首页仍可续玩 |
| 计分流水：事件 / 改分 / 阵容调整记录，撤销回退一条，上限 100 条 | `src/store/index.ts` | 随活跃对局持久化 |
| 玩家战绩统计（历史场次 / 胜场） | `src/store/index.ts` | computed 映射，模板无重复遍历 |
| `resumeGame` 支持从活跃标记或历史 id 恢复 | `src/store/index.ts`、`HomeView.vue` | 两条续玩路径都可用 |
| SSR 冒烟环境补齐新键的兜底 | `scripts/mock-env.mjs` | 无 `localStorage` 报错 |

### CP-04　设计系统重构　`完成`

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| Felt Table 明暗主题 token，移除全部 `color-mix()` | `src/App.vue` | 全仓搜索 `color-mix` 无命中 |
| 首帧主题无闪烁、theme-color 同步 | `index.html`、`src/main.ts`、`src/utils/theme.ts`（新建） | 主题在 Vue 挂载前设置；light 首帧无暗底 |
| 页面骨架 / 导航 / 卡片 / 按钮 / 底栏统一，含 4 档响应式 + 横屏规则 | `src/App.vue`、`src/components/PageNav.vue`（新建） | 断点齐全、底栏真固定 |
| 输入控件允许选中文本 | `src/App.vue` | `input` 上 `user-select: text` |
| 统一弹窗外观 | `src/utils/dialog.ts` | 跟随新 token |

### CP-05　页面重构　`完成`

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 首页：继续上一局置顶、新入口顺序、历史卡双列（平板） | `src/views/HomeView.vue` | 活跃对局存在时显示续玩主卡 |
| 选人页：上限 8、已选顺序可视化 | `src/views/PlayerSelectView.vue` | 选中项显示序号 |
| 玩家库：显示场次 / 胜场徽章 | `src/views/players/PlayerListView.vue` | 战绩来自 CP-03 |
| 玩家 / 规则表单：固定底栏、统一 PageNav、校验 | `src/views/players/PlayerCreateView.vue`、`src/views/events/*.vue` | `.bottom-bar` 在 `.scroll` 之外 |
| 规则列表 / 详情：口径说明与校验 | `src/views/events/*.vue` | 无负数分值 |
| 输入校验：规则分值 1–999 整数、改分拒绝空值；实体 id 改用 `newId()` | `src/views/events/*.vue`、`src/views/players/PlayerCreateView.vue` | 空值不再变 0；无 `Date.now()` 作 id |
| 分值口径：`*_all` 显示「N/家」并附说明 | `EventListView.vue`、`EventDetailView.vue` | 与 Rust 的 `score * (n-1)` 一致 |
| 选人上限 8、显示已选顺序 | `src/views/PlayerSelectView.vue` | 与 Rust 一致 |

### CP-06　对局主界面重构　`完成`

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 拆分 `GameView.vue`（865 行）为容器 + 3 个组件 | `src/views/GameView.vue`、`src/components/game/*.vue`（新建） | 单文件 < 400 行 |
| 抽屉三 tab：计分 / 管理 / 流水；平板改为右侧常驻操作台 | `GameView.vue`、`ActionPanel.vue` | `>= 900px` 无遮罩、直接操作 |
| 按 id 选中玩家，避免洗牌后错人 | `GameView.vue` | 无 `selectedPlayerIndex` |
| Android 返回键优先关闭遮罩，再由路由回退 | `src/utils/overlayBack.ts`（新建）、`GameView.vue` | pushState / popstate 成对 |
| 返回首页（保留对局）+ 震动反馈 | `GameView.vue` | 不清除活跃标记 |
| 手动改分拒绝空值、加人上限 8、`*_all` 分值显示「N/家」 | `GameView.vue`、`ActionPanel.vue` | 与 Rust / CP-05 口径一致 |
| 顶栏、领先者摘要、玩家卡网格、烟花触发保持 | `GameView.vue`、`PlayerCard.vue` | 功能不回退 |

### CP-07　CI 与发布　`完成`

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 新增轻量 verify 工作流（前端构建 + 冒烟 + 版本号一致性 + Rust 单测） | `.github/workflows/verify.yml`（新建） | push / PR 触发 |
| Android tag 构建合并为一次编译出 APK + AAB | `.github/workflows/build-android.yml` | 无重复全量编译 |
| iOS 补 tag 触发与 Release 上传 | `.github/workflows/build-ios.yml` | 与 Android 发布节奏对齐 |
| README 更新为 2.0.0 的功能与命令说明 | `README.md` | 链接包含 DOCS.md |

### CP-08　统一验证与收尾　`完成`

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 本机一次最轻量验证 | — | `npm run build` 与 `npm run smoke` 各跑 **1 次**，全绿 |
| 修正验证暴露的问题并复验（必要时才第二次） | 相关文件 | 记录次数与原因 |
| CHANGELOG 回填全部 CP、计划状态改「完成」 | `CHANGELOG.md`、`CHANGEPLAN.md` | 编号一一对应 |

### CP-09　发布前复核与收尾完善　`完成`

> 提交 / 打 tag 之前再做一次全面复核，修掉只在真实使用场景里暴露的细节。

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 平板操作台连记体验 | `src/components/game/ActionPanel.vue` | 指定目标类事件提交后退出目标选择页，不再卡住 |
| 浅色主题零闪帧 | `public/theme.js`（新建）、`index.html`、`src/main.ts` | 首帧同步写入 `data-theme`，CSP 仍允许 |
| iOS 构建参数显式化 | `src-tauri/tauri.conf.json` | `bundle.iOS.minimumSystemVersion=14.0`、`bundle.android.minSdkVersion=24` |
| 未签名 IPA 产出确定性 | `.github/workflows/build-ios.yml` | `.app` 搜索有 DerivedData 回退与失败诊断 |
| 复核前 8 个 CP 无回退 | 全仓 | 构建、冒烟、静态检查全绿 |

### CP-10　双端构建失败修复　`完成`

> 依据 `v2.0.0` tag 的 Actions 日志：iOS 链接期报 Swift 兼容库未定义符号，Android 在 SDK 安装阶段就失败。

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| iOS 链接找到 Swift 兼容库 | `scripts/patch-ios-project.py`（新建）、`build-ios.yml` | 生成的 `project.pbxproj` 含 toolchain Swift 搜索路径；CI 无 `__swift_FORCE_LOAD_` 未定义符号 |
| 避开 Xcode 26 新 SDK 限制 | `build-ios.yml` | 有 Xcode 16 时通过 `DEVELOPER_DIR` 选用 |
| 未签名 IPA 可靠产出 | `build-ios.yml` | DerivedData 回退查找、清除签名残留、产物可供本地重签 |
| Android 不再被废弃包卡住 | `build-android.yml` | 移除 `setup-android@v3`，显式安装 SDK / NDK |
| 重新触发构建 | 版本号 + `v2.0.1` tag | 三处版本一致，tag 推送后双端自动重跑 |

### CP-11　iOS Swift 兼容库链接（第二次）　`完成`

> `v2.0.1` 日志显示 `$(TOOLCHAIN_DIR)` 在 Xcode 26 展开为未挂载 cryptex 路径，上一轮修复落空。

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 不再依赖会展开错的变量 | `scripts/patch-ios-project.py` | 只注入 CI 探测到的绝对路径 |
| 兼容库对链接器可见 | `build-ios.yml` | 复制到 `Externals/arm64/release` 且绝对路径进 `LIBRARY_SEARCH_PATHS` |
| 从源头减少 force-load 符号 | `src-tauri/tauri.conf.json` | iOS 部署目标 16.0 |
| 避开 Xcode 26 镜像缺陷 | `build-ios.yml` | runner 固定 `macos-15`，Xcode 16/15 优先 |
| 重新触发构建 | 版本号 + `v2.0.2` tag | tag 推送后双端自动重跑 |

### CP-12　跳过必然失败的 exportArchive　`完成`

> 完整日志显示 build 已成功，失败发生在 Tauri CLI 追加的签名导出阶段。

| 目标 | 涉及文件 | 验收标准 |
| --- | --- | --- |
| 导出失败不再判死构建 | `build-ios.yml` | 捕获退出码，校验 `.app` 完整后继续 |
| 未签名 IPA 可靠产出 | `build-ios.yml` | `APP_FALLBACK` 优先，打包与清理逻辑不变 |
| 保留已生效的链接修复 | 全仓 | 不回退 Xcode 16 / iOS 16 / 绝对路径三层 |
| 重新触发构建 | 版本号 + `v2.0.3` tag | tag 推送后双端自动重跑 |

## 五、验证策略

- 本机：`npm run build`（类型检查 + 生产构建）→ `npm run smoke`（9 条路由 SSR + 图标完整性），各一次，秒级。
- CI：`verify.yml` 承担 `cargo test`、版本号一致性、前端构建、冒烟；`build-*.yml` 承担 APK / AAB / IPA。
- 真机：iOS 由用户侧载验收；Android 由既有 AVD 流程验收。本机不跑移动端交叉编译。

## 六、有意为之的不改动

- 不跑 `tauri android init` / `tauri ios init`（会覆盖手工改过的签名工程）。
- 不改 `tauri.conf.json` 的 `bundle.targets` 与 CSP（当前已通过真机，避免引入无法本机验证的风险）。
- 不迁移 localStorage 到插件化存储：现有 `safeParse` + 防抖 + 切后台落盘已覆盖主要风险，换插件会新增 Rust 依赖与迁移成本，不符合「轻量」目标。
- 不提交 git、不打 tag。

---

## 历史计划存档

| 版本 | 摘要 | 详情 |
| --- | --- | --- |
| v1.2.1（2026-10-28 ~ 10-29） | 6 阶段全部完成：仓库卫生与安全、CI 与分发、正确性、性能、清理、测试验收（`cargo test` 16 项通过） | 见 `CHANGELOG.md` v1.2.1 条目 |
| v1.3.0 / v1.3.1 / v1.4.0 | 视觉重构、性能打磨、玩家编辑与全平台图标 | 见 `CHANGELOG.md` 对应条目 |
