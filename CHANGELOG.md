## v2.0.5（2026-11-07）· 发布链路整理与双模式出包

> 对应计划条目 `CP-14`。

### CP-14 · Release 发布整理

- **能力边界核实**：`actions/artifacts/{id}/zip` 未认证返回 401，本机无 `gh` / token，Actions artifact 拉不到；但 Release 附件走公开直链可下载（实测 200），GitHub API 本轮也已恢复可用，可自行查运行状态与产物清单。**创建 / 更新 Release 需要写权限**，因此仍由 CI 的 `GITHUB_TOKEN` 完成。
- **personal 版确实从未编译**：tag 触发时 `inputs.mode` 为空，`Write Build Mode` 一律写 `public`。两个构建工作流改为矩阵 `mode: [public, personal]`（tag 时双模式，手动触发只跑所选模式），Rust 缓存加 `shared-key` 让两版共用编译产物。
- **「Android 包大」的真相**：实测单个 APK 只有 4.7–6.1 MB，Rust LTO / strip 与 Gradle minify 都已生效；观感来自 Release 一次挂 **9 个文件**（4 个分 ABI APK + 4 个分 ABI AAB + 1 个 IPA）。分机型打包本来就在做，问题是无用的 AAB、模拟器 ABI 和 `app-arm64-release-unsigned.apk` 这类默认文件名。
  - 去掉 `--aab`：AAB 仅在与应用商店对接时才需要，本项目直接分发 APK。
  - Release 只挂 arm64 / armv7 两个真机架构，x86 系列仅留在 Actions artifact。
  - 产物统一重命名为 `BilScore-<tag>-<mode>-<abi>.apk` 与 `BilScore-<tag>-<mode>-unsigned.ipa`。
- **修掉更实际的问题：APK 是未签名的**。原产物名全是 `-unsigned`，Android 无法直接安装。新增 `Check signing secret` → `Restore self-signed keystore`（`actions/cache` 复用，保证覆盖升级不丢 `localStorage` 数据）→ `Prepare release signing`：有正式 Secrets 就用正式密钥，否则生成并缓存自签名密钥；正式密钥不会进缓存。
- 新增 `.github/workflows/release.yml`：tag 时先由秒级 job 创建 Release 并写入下载说明（Android 按机型选、iOS 需自签、public / personal 区别、体积说明）；两个构建工作流改为只追加 assets、`generate_release_notes: false`，消除多个 job 并发 create 同一 tag 的竞态。
- `README.md` 打包与分发章节同步更新；版本号 `2.0.5`。
- 验证：四条工作流 YAML 结构静态校验、三处版本号一致、`npm run build` + `npm run smoke` 各 1 次；本机未跑移动端 / Rust 编译。

---

## v2.0.4（2026-11-06）· 交互反馈与图标打磨

> 对应计划条目 `CP-13`。

### CP-13 · 点击反馈、状态语义与图标

- **点击反馈**（用户反馈「点按钮没有任何反馈」）：新增 `src/utils/press.ts`，全局事件委托驱动一次性波纹 + 明确按钮的轻震动 + 按压时缩短过渡时长。波纹只用 `transform`/`opacity`，420ms 后节点即移除；整个应用只注册 4 个监听器；滑动经过列表项不会误震；`prefers-reduced-motion` 下完全跳过。同时加强 `.btn` / `.icon-btn` 的 `:active` 缩放。
- **更多动效**：分数变化播放一次 `scale` 弹跳（只比较 `id:分数` 拼成的快照，不深度监听玩家数组）；ROUND 数字换轮时淡入淡出；玩家卡与首页卡片一次性交错入场（只在挂载时播放，洗牌复用 DOM 不会重放）；页面切换位移加大。所有动效只用 `transform`/`opacity`，无常驻动画、无 `box-shadow`/`filter` 动画，`will-change` 也未使用。
- **开球位与选中态分离**：`PlayerCard` 的 `current` 改为 `lead`，第 1 位只标「本轮开球」（金色），不再写「击球中」；新增独立的 `selected`，用主色边框和「正在为 TA 记分」表达当前点选要记分的玩家。两者互不混淆，符合「只有触发规则才重排、重排后首位固定」的实际逻辑。
- **图标**：新增 Lucide `circle-stop`（结束对局，替换 `flag`）、`list-ordered`（排序，替换 `arrow-down-up`）、`sparkles`（高分换轮事件点亮，条件与烟花一致，小屏隐藏）；`AppIcon` 默认描边 1.75 → 1.9；`gen-icons.mjs` 清单同步，生成脚本与内联数据保持一致。
- 版本号同步 `2.0.4`。
- 验证：`npm run build`（87 模块、2.19s、类型零错误）+ `npm run smoke`（9 路由 + 30 图标）各 1 次，全绿。

---

## v2.0.3（2026-11-06）· 未签名 IPA 导出

> 依据 `v2.0.2` 的**完整** Actions 日志（`log.txt`，读完已删除）；对应计划条目 `CP-12`。

### CP-12 · 跳过必然失败的 exportArchive

- 完整日志显示 **`** BUILD SUCCEEDED **`**：Xcode 16.4 / iOS 18.5 下编译、链接、`CopySwiftLibs`、`GenerateDSYMFile`、`Validate`、`Touch` 全部通过，前几轮的 Swift 兼容库修复已经生效，`.app` 完整生成在 `DerivedData/.../Build/Products/release-iphoneos/`。之前几份日志被网页截断，误判了失败阶段。
- 真正失败点在 Tauri CLI 构建成功后自动追加的 `xcodebuild -exportArchive`：未签名 Archive 没有 development team → `error: exportArchive No Team Found in Archive` → `** EXPORT FAILED **` → exit 70。这一步是为了产出签名 IPA，对「未签名 IPA + 本地 Sideloadly 重签」既多余又必然失败。
- 修复：`Build App (unsigned)` 用 `if ...; then ... else ... fi` 捕获导出失败，校验 DerivedData 里的 `.app` 含 `Info.plist` 与可执行文件后把路径写入 `APP_FALLBACK` 继续；只有 `.app` 不存在才真正失败并打印产物诊断。`Package IPA` 优先使用 `APP_FALLBACK`，其余回退查找保持不变。
- 保留前三轮的 Xcode 16 / iOS 16 部署目标 / 兼容库绝对路径修复（已证明能让链接通过）；未签名 IPA 的签名残留清理不变。
- 版本号同步 `2.0.3`，新 tag `v2.0.3` 重新触发构建。
- 验证：静态检查（YAML 结构、版本号一致）；未改前端代码，按 `DOCS.md` 编译预算不跑本机构建。

---

## v2.0.2（2026-11-06）· iOS 链接失败再修复

> 依据 `v2.0.1` 的 Actions 日志（`log.txt`，读完已删除）；对应计划条目 `CP-11`。

### CP-11 · iOS Swift 兼容库链接（第二次）

- 上一轮的注入**确实生效了**，但 `$(TOOLCHAIN_DIR)` 在 Xcode 26 里展开成 runner 上未挂载的 `/var/run/.../Metal.xctoolchain/...` cryptex 路径：日志里 `Ld` 的 `-L` 全是这些不存在的目录，所以链接器仍找不到 `libswiftCompatibility56.a` / `libswiftCompatibilityConcurrency.a`，`__swift_FORCE_LOAD_$_*` 依旧未定义。
- 改为**绝对路径 + 实体暂存**双保险：
  - 新增 `Stage Swift compatibility libraries`：在选中的 Xcode Developer 目录下 `find` 出 `libswiftCompatibility*.a`，复制到工程已有且已在 `-L` 中的 `Externals/arm64/release`，并把库所在绝对目录导出为 `SWIFT_COMPAT_DIR`。
  - `scripts/patch-ios-project.py` 改为注入该绝对路径（保留 `$(inherited)` 与 `$(SDKROOT)/usr/lib/swift`），不再使用会展开错的 `$(TOOLCHAIN_DIR)`。
- 从源头减少符号：`bundle.iOS.minimumSystemVersion` 14.0 → **16.0**，让本次 swiftc 编译 Tauri 的 Swift 绑定时不再为旧系统 back-deploy Swift 5.6 / concurrency 兼容库。产物要求设备 iOS 16+。
- runner 从 `macos-latest`（实际是 macOS 26 / Xcode 26 镜像）固定为 `macos-15`，Xcode 选择扩展到 15.x / 16.x：生成工程回到成熟工具链，绝对路径与兼容库暂存作为兜底。未签名 IPA 的打包与清理逻辑不变。
- 版本号同步 `2.0.2`，新 tag `v2.0.2` 重新触发构建。
- 验证：本地静态检查（注入脚本对两种工程格式、版本号一致性）；本次未改前端代码，按 `DOCS.md` 编译预算不跑本机构建。

---

## v2.0.1（2026-11-06）· CI 构建修复

> 依据 `v2.0.0` 的 GitHub Actions 日志（`log.txt`，读完已删除）；对应计划条目 `CP-10`。

### CP-10 · 双端构建失败修复

- **iOS**：`Ld` 阶段 `Undefined symbols for architecture arm64: __swift_FORCE_LOAD_$_swiftCompatibility56 / ...Concurrency`。根因：Xcode 26 / iOS 26 SDK 下，`libapp.a` 内 Swift 对象强引用的兼容库只存在于 toolchain 的 `usr/lib/swift/iphoneos`，而 `tauri ios init` 生成的工程默认不搜索该目录（日志的 `-L` 里只有 SDK 的 `usr/lib/swift` 和两个不存在的 cryptex 路径）。
  - 新增 `scripts/patch-ios-project.py`：构建前给生成的 `project.pbxproj` 每个 `buildSettings` 块注入或合并 `LIBRARY_SEARCH_PATHS`（保留 `$(inherited)`，追加 `$(TOOLCHAIN_DIR)/usr/lib/swift/iphoneos`、`swift-5.0/iphoneos`、`$(SDKROOT)/usr/lib/swift`），注入失败时让 CI 明确失败。
  - workflow 优先选用 runner 预装的 Xcode 16（写 `DEVELOPER_DIR`），绕开 Xcode 26 的 `SwiftUICore` 隐式链接限制；找不到时由脚本兜底。
  - 未签名 IPA 打包：优先在 DerivedData 的 `release-iphoneos` 下找 `.app`（日志证实产物位置），并清除 `_CodeSignature` / `embedded.mobileprovision`，交给本地签名工具重签。
- **Android**：`android-actions/setup-android@v3` 内部执行 `sdkmanager tools`，新版 cmdline-tools 已移除该废弃包并返回退出码 1，构建根本没开始。移除该 action，改用 runner 自带的 `sdkmanager` 显式安装 `platform-tools` / `platforms;android-36` / `ndk;29.0.14206865`，并导出 `ANDROID_HOME` / `ANDROID_NDK_HOME`。
- 版本号同步 `2.0.1`（`package.json`、`tauri.conf.json`、`Cargo.toml`、Android 生成快照）；新 tag `v2.0.1` 重新触发双端构建。
- 验证：仅静态检查（版本号一致、注入脚本语法、YAML 结构）。本次未改前端代码，按 `DOCS.md` 的编译预算不再跑本机构建。

---

## v2.0.0（2026-11-06）· 产品重构：Felt Table + 全尺寸适配

> 制度依据：`DOCS.md`；计划依据：`CHANGEPLAN.md`。按 `CP-01 ~ CP-08` 逐项回填，一条 CP 一条记录。

| 编号 | 主题 | 状态 |
| --- | --- | --- |
| CP-01 | 配置基线与仓库卫生 | 完成 |
| CP-02 | 计分核心与数据正确性 | 完成 |
| CP-03 | 状态层：断点续玩 / 流水 / 战绩 | 完成 |
| CP-04 | 设计系统重构 | 完成 |
| CP-05 | 页面重构 | 完成 |
| CP-06 | 对局主界面重构 | 完成 |
| CP-07 | CI 与发布 | 完成 |
| CP-08 | 统一验证与收尾 | 完成 |
| CP-09 | 发布前复核与收尾完善 | 完成 |

### CP-00 · 文档制度建立

- 新增 `DOCS.md`：定义文档职责、五步变更流程、CP 编号规则、版本规则、**验证与编译预算**、文件增删改权限、提交发布约束、归档规则。
- 重写 `CHANGEPLAN.md`：以 v2.0.0 为目标，含产品判断、功能矩阵、Felt Table 视觉体系、6 档响应式断点、8 个可执行批次；v1.2.1 计划压缩为历史存档。
- 本文件顶部新增 v2.0.0 状态表，后续每个 CP 完成后追加明细并把状态改为「完成」。
- 验证：静态检查（三份文档职责不重叠、编号连续、预算条款明确）；不触发任何编译。

### CP-01 · 配置基线与仓库卫生

- 版本号统一到 `2.0.0`：`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`gen/android/app/tauri.properties`（`versionCode` 1002001 → 2000000）。`Cargo.toml` 的占位 description 一并改为实际描述。
- 桌面开发窗口从 800×600 改为 393×852（手机比例），窗口标题改为 `BilScore`；本地用 `tauri dev` 看布局时不再需要手动缩窗口。
- 新增 `.env.public` / `.env.personal`，本地 `dev:per` / `build:per` / `android:*:per` 不再静默退化成 public 版。
- Android 生成快照 `gen/android/app/src/main/assets/tauri.conf.json`：版本 1.2.1 → 2.0.0，移除硬编码本机局域网 IP `10.112.66.215`，改回 `localhost:1420`。
- Android 工程：`MainActivity.kt` 移除 `enableEdgeToEdge()`（改为系统栏占位，前端无需注入 insets，消除状态栏遮挡）；`values/themes.xml` 与 `values-night/themes.xml` 设置台呢深色系统栏；`colors.xml` 的模板紫色占位色换成品牌色；`activity_main.xml` 删掉 `Hello World!` 占位控件。
- 删除根目录 0 字节的乱码命名残留文件 `鐪熸満璋冭瘯鏃朵紶瀹夸富鏈哄眬鍩熺綉`。
- 验证：静态检查（四处版本号一致、无硬编码 IP、无 `enableEdgeToEdge`、无模板占位）；未编译。

### CP-02 · 计分核心与数据正确性

- `game_core.rs` 新增 `MIN_PLAYERS=2` / `MAX_PLAYERS=8` 与合法结算方式白名单，边界下沉到 Rust：
  - 未知 `target_type` 现在是**纯 no-op**（不再消耗撤销步数、不记事件统计、不换轮洗牌）。
  - 加人到 8 人上限、移人到 2 人下限时直接返回，且不占撤销栈。
  - 替换玩家保留席位分数，但清空前任的事件统计标签（分数属于席位，战绩属于人）。
- 新增 3 项 Rust 单测：`unknown_target_type_is_a_pure_noop`、`player_count_is_bounded_2_to_8`、`replace_player_keeps_score_but_resets_event_stats`（18 → 21 项）。
- 新增 `src/utils/id.ts`：`newId(prefix)` 优先 `crypto.randomUUID()`，非安全上下文回退到「时间戳 + 随机串」，替代裸 `Date.now()` 作 id（CP-05 接入各表单）。
- 计划调整并留痕：表单页面与 `GameView.vue` 会在 CP-05 / CP-06 整体重写，因此输入校验、id 接入、分值口径、人数上限这几项并入那两批一次做完，避免同一文件改两遍。
- 验证：静态检查（边界分支在 `save_snapshot()` 之前返回；现有单测的 2 人 / 3 人场景均在新边界内）；Rust 单测按制度交由 CI 的 `verify.yml` 执行，本机未编译。

### CP-03 · 状态层：断点续玩 / 流水 / 战绩

- `src/types/index.ts` 新增 `GameLogEntry`、`ActiveGame`、`PlayerStat`。
- `src/store/index.ts` 重写（保留全部原有对外方法，视图无需感知）：
  - **活跃对局**：新增 `bilscore_active` 快照，与历史一起走 500ms 防抖落盘 + `pagehide` / `visibilitychange` 立即落盘；`endAndSaveGame()` 显式清除；`canResume` getter 供首页判断；`resumeGame(id?)` 优先读历史、历史被删则退回快照。
  - **计分流水**：`_syncState` 对比 invoke 前后的分数，为事件 / 手动改分 / 阵容调整各记一条（轮次、操作者、事件、分数变化、目标、时间），最新在前、上限 100 条；撤销回退一条（Rust 的空操作不入栈，二者严格对齐）；随活跃快照持久化，续玩后流水可继续查看。
  - **玩家战绩**：`playerStats` 一次遍历历史算出每个人的场次与胜场，供玩家库展示。
  - 规则载入规范化后**写回** localStorage，public / personal 切换不再残留混合数据。
  - `safeParse` 增加数组类型校验，脏数据不会让首页白屏；`deleteHistory` 删除活跃对局时同步清除标记。
- `scripts/mock-env.mjs` 补齐 `bilscore_active` 与流水数据，让首页「继续上一局」分支进入 SSR 冒烟覆盖。
- 验证：静态检查（所有 `invoke` 调用点均经过 `_syncState`；`flushOnExit` 同时写 history 与 active）；未编译，统一在 CP-08 验证。

### CP-04 · 设计系统重构（Felt Table）

- `src/App.vue` 全局样式重写：台呢绿 / 黄铜金 / 象牙白的暗色主题，以及奶油白 / 深墨绿的浅色主题；所有半透明层改为**显式 rgba 变量**，全局零 `color-mix()`，兼容 minSdk 24 的旧 WebView。新增 `--primary-soft` / `--gold-soft` / `--danger-soft` / `--*-grad` 等可直接复用的组合 token。
- 新增 `--page-pad` / `--content-max` / `.content` 内容限宽容器，配 4 档断点：`<360`（小屏收紧）、`600`（双列 / 限宽 600）、`900`（限宽 860，对局页侧栏）、`1200`（限宽 1120）；另加横屏矮屏（`<500px`）压缩规则与 `prefers-reduced-motion` 降级。
- 导航改为 `1fr auto 1fr` 网格，标题真正居中且不再被 72px 固定侧列挤压；`.bottom-bar` 为 flex 固定项（配 `.content` 内层），表单按钮不再被滚动区顶走；`input/textarea` 恢复文本可选中。
- 全局补齐 `.field` / `.input` / `.segmented` / `.switch` / `.grid-2` / `.sheet` / `.modal` / `.overlay` 等通用类，供 CP-05 / CP-06 的页面直接使用。
- 新增 `src/components/PageNav.vue`：统一返回 / 标题 / 右侧操作，`back` 支持 `false`、`true`、目标路由三种形态，内容通过 slot 扩展。
- 新增 `src/utils/theme.ts`；`main.ts` 在 Vue 挂载前应用主题并同步 `theme-color`，`index.html` 的启动占位跟随 `data-theme`；移除 `maximum-scale=1.0, user-scalable=no`（恢复无障碍缩放），去掉 `100vw` 可能造成的横向溢出。
- `src/utils/dialog.ts` 弹窗改用新 token 与更大圆角，保持 DOM API 构造（不受 CSP 限制）。
- 说明：旧视图文件里残留的少量 `color-mix()` 将在 CP-05 / CP-06 整体重写时清除，CP-08 做全仓零命中检查。
- 验证：静态检查（主题 token 明暗成对、断点齐全、全局无 `color-mix`）；未编译。

### CP-05 · 页面重构

- **首页**（`HomeView.vue`）：入口顺序改为「继续上一局（活跃对局时置顶）→ 开始新对局 → 玩家库 / 计分规则 → 最近对局」；新增 8 号球主 CTA、断点续玩卡、页脚版本信息；续玩统一经 `resumeGame(id?)`，失败或空状态不跳空白对局；主题切换改用 `utils/theme.ts`；历史卡在 `>=600px` 双列。
- **选人页**（`PlayerSelectView.vue`）：接入 8 人上限（与 Rust 一致），选中项显示击球顺序编号，全选自动截断到 8 人，底栏按钮显示人数。
- **玩家库**（`PlayerListView.vue`）：每行显示历史场次 / 胜场（来自 CP-03 的 `playerStats`），平板双列。
- **玩家表单**（`PlayerCreateView.vue`）：统一 `PageNav` + 固定底栏、`newId('u')`、字段说明；新建 / 编辑共用一页的行为不变。
- **规则页三件套**：新增 `src/utils/rules.ts` 作为口径单一来源（`TARGET_LABELS` / `TARGET_OPTIONS` / `scoreLabel` / `isValidScore`）；`*_all` 一律显示「N/家」并附说明，修正与 Rust `score × (人数-1)` 的语义偏差；新建 / 详情分值强制 1–999 整数，空输入不再被当成 0；id 改用 `newId('e')`；固定底栏与平板双列。
- `EmptyState.vue` 图标改为黄铜金强调；`scripts/ssr-smoke.ts` 新增 `/events/:id` 用例（原来完全没覆盖）。
- 全仓已重写视图中的 `color-mix()` 归零，剩余仅在 `GameView.vue`（CP-06 重写）。
- 验证：静态检查（smoke 断言的全部文案在新模板中保留、所有表单 `.bottom-bar` 位于 `.scroll` 之外）；未编译。

### CP-06 · 对局主界面重构

- `GameView.vue` 由 865 行重写为约 400 行的容器，拆出 `components/game/` 三个组件：
  - `PlayerCard.vue`：玩家卡；金色静态「击球中」标识取代常驻 conic-gradient 流光动画（少一个持续合成层，更省电）。
  - `ActionPanel.vue`：**计分 / 管理 / 流水** 三页签，被手机抽屉与平板侧栏复用；`*_all` 显示「N/家」；自定义目标选择；手动改分拒绝空值 / 非整数；流水来自 CP-03。
  - `PickModal.vue`：加人 / 替换 / 自定义排序弹窗。
- **平板常驻操作台**：`>=900px` 时右侧固定 340px（大屏 380px）面板，不需反复开抽屉，触发事件后保持选中玩家可连续记分；`<900px` 用底部抽屉。玩家卡按 600 / 900 / 1200 断点在单列与双列间切换。
- 选中玩家改为**按 id**（`selectedPlayerId`），洗牌 / 加人后不会再指错人；顶栏新增「返回首页（保留对局）」，结束对局降级为显式操作；新增领先者与分差摘要；记分成功触发 `navigator.vibrate(12)`（iOS 静默降级）；加人按钮在 8 人时禁用。
- `src/utils/overlayBack.ts`：遮罩打开时 `pushState` 一条同 URL 历史，Android 返回键先关遮罩，再由 vue-router 回退；主动关闭时消费该历史，避免重复导航。
- 全仓 `color-mix()` 归零；抽屉 / 弹窗高度统一 `dvh`；窄屏顶栏按钮在 `<400px` 收紧，避免溢出。
- 验证：静态检查（组件 props/emits 对齐、无 `selectedPlayerIndex`、无 `color-mix`、未编译）；未编译。

### CP-07 · CI 与发布

- 新增 `.github/workflows/verify.yml`：push / PR / 手动触发，做版本号一致性、`npm run build`、`npm run smoke`、`cargo test`（含 Linux WebKit 系统依赖与 Rust 缓存）。把 Rust 单测的重活从本机移到 CI，符合 DOCS.md 的编译预算。
- `build-android.yml`：tag 时把 APK 与 AAB 合并为**一次** `tauri android build --apk --aab --split-per-abi`（原来跑两遍完整编译）；补 `permissions: contents: write`。
- `build-ios.yml`：补 `v*` tag 触发、Release 挂载 IPA、写权限；`.app` 产物定位改用 `find -print -quit`，不再靠 `grep -v Debug | head` 猜。
- `README.md` 更新到 2.0.0：功能矩阵、6 档尺寸适配表、命令、双构建模式、三条工作流、数据说明与目录速览；文档区加入 `DOCS.md` 链接。
- 验证：静态检查（YAML 结构、版本号校验脚本、tag 分支产物路径）；未编译。

### CP-08 · 统一验证与收尾

本机验证严格按 `DOCS.md` 的编译预算执行，重活交给 CI：

- `npm run build` **第 1 次**：`vue-tsc --noEmit` 零错误，但 `vite build` 报 `[vite:html-inline-proxy] No matching HTML proxy module found` —— `index.html` 的内联 `<style>` 与 Vite 6.4 的代理模块解析不匹配。把启动占位样式并入 `App.vue` 全局 CSS（首帧仍由 Vite 注入的 head 样式表生效，零新增文件），复验 **第 2 次**：86 模块，类型检查零错误，构建 **1.54s** 通过。
- `npm run smoke` **1 次**：9 条路由 SSR 全部通过（含新增的 `/events/:id`），27 个图标数据完整。
- 本机**未执行** `cargo test`、`tauri android build`、`tauri ios build`、Gradle / Xcode 构建；Rust 21 项单测与 APK / AAB / IPA 全部由 `verify.yml`、`build-android.yml`、`build-ios.yml` 承担，避免分钟级高负载编译。
- 静态检查：`package.json` / `tauri.conf.json` / `Cargo.toml` 版本号均为 `2.0.0`；运行时 CSS 的 `color-mix()` 调用为零（仅文档、注释与 `repomix-output.xml` 历史快照还含该词）；无 `selectedPlayerIndex`、无 `enableEdgeToEdge`、无硬编码局域网 IP、无 `Date.now()` 作 id；`.env.public` / `.env.personal` 未被忽略、`Cargo.lock` 存在；IDE 诊断零错误。

**结论**：CP-01~08 全部完成，改动留在工作区未提交、未打 tag。iOS 真机侧载验收由用户完成。

### CP-09 · 发布前复核与收尾完善

- `ActionPanel.vue`：指定目标类事件提交后主动退出「选择目标玩家」页。平板操作台不随事件卸载，此前会一直停在该页、无法继续记分，是本轮复核发现的真实缺陷。
- 首帧主题彻底修复：新增 `public/theme.js`（同源同步脚本，生产 CSP 的 `default-src 'self'` 允许），`index.html` 在 `<head>` 同步写入 `data-theme` 与 `theme-color`；`main.ts` 保留幂等应用。浅色模式不再有暗色闪帧。
- `tauri.conf.json` 补 `bundle.iOS.minimumSystemVersion = 14.0` 与 `bundle.android.minSdkVersion = 24`，与既有 Android 工程、Vite `es2020` 基线对齐，iOS CI 现场生成工程时不再依赖隐式默认值。
- `build-ios.yml`：`Package IPA` 增加 Xcode DerivedData 回退搜索与失败时的目录诊断输出，提高未签名 IPA 的产出确定性。
- 复核：前 8 个 CP 的验收项无回退；运行时 `color-mix()` 零调用；三处版本号一致。
- 验证：`npm run build`（2.08s，类型零错误）+ `npm run smoke`（9 路由 + 27 图标）各 1 次；本机未跑移动端 / Rust 编译。

---

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
