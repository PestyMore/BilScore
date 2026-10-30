# BilScore 改造执行计划（CHANGEPLAN）

> 依据：`advice.md`（2026-10-04 的评估结论）
> 执行日期：2026-10-28 ~ 10-29　基线：`main` @ v1.2.0　目标版本：**v1.2.1**
> 原则：**先修 P0（不修 CI 必红）→ 再修正确性 → 再做性能 → 最后清理**，每一步都保证 `npm run build` / `cargo check|test` 可过。

---

## ✅ 执行状态：阶段 0 ~ 5 全部完成

| 阶段 | 状态 | 校验结果 |
| --- | --- | --- |
| 0　仓库卫生与安全 | ✅ | `git check-ignore` 不再命中 Android XML；11 个 XML 已入库；`bilscore.jks` 已出库并轮换新密钥；Gradle 无密钥可构建 |
| 1　CI 与分发 | ✅ | 新增 `build-android.yml`；`build-ios.yml` 支持签名/未签名双路径；版本统一 1.2.1；新增 `dev-android.bat` |
| 2　正确性修复 | ✅ | id 寻址 + 提交锁、await 跳转、`historyLen`、防抖落盘、`guard()` 兜底、返回键、安全区、`100dvh` |
| 3　性能与体积 | ✅ | release profile、流光收敛、header 去毛玻璃、烟花克制、CSP、减依赖（Cargo.lock −522 行） |
| 4　清理 | ✅ | 删除 2 个死页面 + `vite.svg` + `GameSnapshot`/`historySnapshots` |
| 5　测试与验收 | ✅ | `cargo test` **16 passed / 0 failed**；`npm run build`（含 `vue-tsc --noEmit`）通过 |

改动明细见 [CHANGELOG.md](./CHANGELOG.md)。所有改动留在工作区未提交，待你 review 后自行 `git commit`。

---

## 阶段 0　仓库卫生与安全（P0）

| # | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| 0.1 | 删除 `.gitignore` 里的 `*.xml`（它会吞掉 `AndroidManifest.xml`、`res/xml/file_paths.xml`、`res/values/*.xml`），改为只忽略根目录的 `/repomix-output.xml` | `.gitignore` | `git check-ignore` 不再命中 Android XML |
| 0.2 | 新增忽略：`.jks`、`key.properties`、`tauri.properties`（构建生成物）、`local.properties` | `.gitignore` | 密钥不可能被误提交 |
| 0.3 | 把 Android 资源 XML 补进版本库 | `src-tauri/gen/android/**` | `git ls-files | findstr .xml` 非空，且含 Manifest |
| 0.4 | 将已入库的 `bilscore.jks` 移出跟踪，并**轮换一枚新密钥**（旧密钥+口令 `123456` 视为已泄露） | `src-tauri/gen/android/app/bilscore.jks`、`key.properties` | `git ls-files` 无 `.jks`；新密钥可正常签名 |
| 0.5 | `app/build.gradle.kts` 的 release 签名块加空值保护（缺 `key.properties` 时不再 NPE） | `src-tauri/gen/android/app/build.gradle.kts` | 无密钥环境也能编 debug / release |

## 阶段 1　CI 与分发

| # | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| 1.1 | 新增 Android 工作流：`workflow_dispatch`（可选 public/personal）+ tag 触发；Node/Rust/Gradle 缓存；Rust 加 4 个 Android target；注入 keystore 与 `key.properties`；写 `.env` 决定 `VITE_APP_MODE`；`--split-per-abi` 出 APK，tag 时额外出 AAB；上传 artifact 与 Release | `.github/workflows/build-android.yml`（新建） | 手动跑一次出 4 个 ABI 包 |
| 1.2 | 改造 iOS 工作流：去掉 `|| true`（会吞失败）；加 Node/Rust 缓存；**有签名 Secret 就走 Manual 签名出可安装 IPA，没有就退回未签名 IPA**（先零成本侧载，后上正式签名） | `.github/workflows/build-ios.yml` | 两种路径都能出包 |
| 1.3 | 版本号统一到 **1.2.1**（`package.json` + `tauri.conf.json`），`tauri.properties` 交给构建生成 | `package.json`、`src-tauri/tauri.conf.json` | 两处一致 |
| 1.4 | 新增一键模拟器脚本：无窗口启动 AVD → 等开机 → scrcpy 画面 → `tauri android dev` 热更 | `dev-android.bat`（新建） | 双击即可开发 |

## 阶段 2　正确性修复（P1）

| # | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| 2.1 | `index.html`：`viewport-fit=cover`（否则 iOS 安全区恒为 0）、`user-scalable=no`、改 title 与 `lang` | `index.html` | 刘海机不被遮挡 |
| 2.2 | 跳转前 `await`：`initNewGame` / `resumeGame` 完成后再 `router.push('/game')` | `PlayerSelectView.vue`、`HomeView.vue` | 首帧不再空白/闪烁 |
| 2.3 | 事件寻址由**数组下标改为 player id**，target 同理；前端加提交锁，杜绝连点记错人 | `game_core.rs`、`lib.rs`、`store/index.ts`、`GameView.vue` | 连点 5 次只记 1 次、记对人 |
| 2.4 | `GameState` 增加 `history_len`，撤销按钮按真实值禁用，去掉"长度为 1 的假数组" | `models.rs`、`game_core.rs`、`store/index.ts`、`GameView.vue`、`types/index.ts` | 无历史时撤销键置灰 |
| 2.5 | 持久化防抖（500ms）写盘 + 结束对局/页面隐藏时立即落盘；`JSON.parse` 全量 try/catch；`getTopScorer` 空数组保护 | `store/index.ts`、`HomeView.vue`、`main.ts` | 连续点按不掉帧；脏数据不白屏 |
| 2.6 | `invoke` 统一错误兜底：封装 `guard()`，失败弹原生提示而不是静默 | `utils/invoke.ts`（新建）、`GameView.vue` | 断链/异常有提示 |
| 2.7 | Android 返回键：`MainActivity` 开启 `handleBackNavigation`（wry 已支持，Tauri 默认关闭导致返回直接退出） | `MainActivity.kt` | 返回键回上一页而非退出 |
| 2.8 | `100vh` → `100dvh` | `App.vue`、`GameView.vue` | iOS 高度准确 |

## 阶段 3　性能与体积（P2）

| # | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| 3.1 | `Cargo.toml` 加 `[profile.release]`（`opt-level="s"` / `lto` / `strip` / `codegen-units=1` / `panic="abort"`）；删除零引用的 `thiserror`、`serde_json`；摘掉前端从未 import 的 `tauri-plugin-opener` | `Cargo.toml`、`lib.rs`、`capabilities/default.json` | `cargo check` 通过，包体变小 |
| 3.2 | 流光边框只给"当前击球位（#1）"，其余静态描边；支持 `prefers-reduced-motion`；`.game-header` 去掉高开销的 `backdrop-filter` | `GameView.vue` | 8 人局滑动不掉帧 |
| 3.3 | 烟花：仅大金/小金（score ≥ 7）触发、1.5s 节流、按 DPR 缩放、尊重 reduced-motion、切后台清理 canvas | `utils/fx.ts`、`GameView.vue` | 普胜不再放烟花 |
| 3.4 | 配置 CSP（移动端加固） | `tauri.conf.json` | ⚠️ 需真机验收白屏 |

## 阶段 4　清理

| # | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| 4.1 | 删除死代码 `PlayerCountView.vue`、`PlayerNamesView.vue`（路由已无引用）、`public/vite.svg` | `src/views/*`、`public/` | 构建通过 |
| 4.2 | 删除 `GameSnapshot` 类型与 `historySnapshots`（撤销栈下沉 Rust 后的遗留物） | `types/index.ts`、`store/index.ts` | 构建通过 |

## 阶段 5　测试与验收

| # | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| 5.1 | 给 `GameCore` 补单元测试：6 种 targetType 计分、洗牌顺序、撤销/重做边界、2 人局边界 | `src-tauri/src/game_core.rs` | `cargo test` 全绿 |
| 5.2 | 全量校验：`cargo test` → `cargo check` → `npm run build` | — | 全部通过 |
| 5.3 | 输出 `CHANGELOG.md` | `CHANGELOG.md` | — |

---

## 不改动的部分（有意为之）

- **不跑 `tauri android init`**：会覆盖你手工改过签名的 `app/build.gradle.kts`；改为把完整 `gen/android` 入库。
- **不提交 git**：所有改动留在工作区，由你 review 后自行 `git commit`。
- **`.env` 保持忽略**：CI 里动态写入，不入库。
- **`release_apks/` 里的 v1.1.1 旧包**：保留（已被忽略）。
