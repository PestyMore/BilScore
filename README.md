# BilScore · 台球追分计分器

**Tauri 2 + Vue 3 + TypeScript** 的移动端台球计分应用，只分发 **Android APK/AAB** 与 **iOS IPA**，无网络、无账号、无后台服务。

> 文档制度 [DOCS.md](./DOCS.md)　|　改造计划 [CHANGEPLAN.md](./CHANGEPLAN.md)　|　更新记录 [CHANGELOG.md](./CHANGELOG.md)　|　历史评估 [advice.md](./advice.md)

---

## 核心功能

- **玩家库**：常用球友一次录入，可改名 / 换头像色，显示历史场次与胜场。
- **开一局**：2–8 人，勾选顺序即初始击球顺序；每轮自动按赢家 / 输家洗牌。
- **一键记分**：6 种结算方式（吃 / 给所有人、上家、指定玩家），personal 版内置 10 条追分规则，public 版用自定义规则。
- **对局控制**：50 步撤销、手动改分、中途加人 / 替换 / 移出 / 自定义排序、高分事件烟花与轻震动。
- **本局流水**：每一步记分都有记录（谁、什么事件、分数变化），撤销同步回退，方便对账。
- **断点续玩**：活跃对局独立落盘，切后台、杀进程、误点返回都不丢；首页「继续上一局」一键恢复，最近 10 条历史也可续玩。
- **明暗主题**：Felt Table 台呢绿 / 黄铜金配色，主题在首帧生效。

## 界面与适配

| 尺寸 | 布局 |
| --- | --- |
| 小屏手机 `<360px` | 收紧间距字号，事件按钮单列 |
| 手机竖屏 `360–599px` | 单列玩家卡 + 底部抽屉操作台 + 固定底栏 |
| 大屏手机 / 横屏 `600–899px` | 内容限宽居中，玩家卡 / 列表双列 |
| 平板 `900–1199px` | 对局页左侧玩家卡 + **右侧常驻操作台**，无需反复开抽屉 |
| 大平板 `>=1200px` | 玩家卡双列、操作台加宽，整体限宽 1120px |

iOS 用 `env(safe-area-inset-*)` 处理刘海与横条；Android 由系统栏占位、主题固定台呢深色，前端不依赖注入 insets。全局不使用 `color-mix()` 等新 CSS 特性，兼容较旧的 Android WebView。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm ci` | 安装依赖 |
| `npm run dev` | 浏览器开发（最快，缩到手机宽度看布局） |
| `npm run tauri dev` | 桌面窗口开发（窗口已改为 393×852 手机比例） |
| `npm run build` | 类型检查 + 前端生产构建（秒级，本机最轻量的验证方式） |
| `npm run smoke` | 无头 SSR 冒烟：全部路由渲染 + 图标数据完整性 |
| `npm run test:rust` | Rust 计分核心单测（较重，日常交给 CI） |
| `dev-android.bat` | 一键 AVD + scrcpy + `tauri android dev` 热更 |
| `node gen-icons.mjs` | 重新生成内联图标（需临时 `npm i -D lucide-static`） |
| `npm run tauri -- icon app-icon.svg` | 重新生成全平台应用图标 |

移动端开发：`tauri android dev` 需指定模拟器可达地址，模拟器用 `--host 10.0.2.2`（脚本已内置），真机传局域网 IP。

## 两种构建模式

| 模式 | 规则来源 | 命令 |
| --- | --- | --- |
| `public` | 用户自建规则 | `npm run build:pub` / `npm run dev:pub` |
| `personal` | 内置 10 条追分规则，分值可改 | `npm run build:per` / `npm run dev:per` |

`.env.public` / `.env.personal` 已入库，本地脚本可直接用；CI 通过写 `.env` 覆盖 `VITE_APP_MODE`。

## 打包与分发

打包全部由 GitHub Actions 完成，本机不需要跑 Android / iOS 交叉编译：

| 工作流 | 触发 | 产物 |
| --- | --- | --- |
| `verify.yml` | push / PR / 手动 | 版本号一致性、前端构建、SSR 冒烟、Rust 单测 |
| `build-android.yml` | 手动（选 public/personal）/ `v*` tag | APK（按 ABI 拆分），tag 时同时产出 AAB 并发 Release |
| `build-ios.yml` | 手动（可选签名）/ `v*` tag | IPA，可签名或供 AltStore / SideStore 侧载，tag 时挂到 Release |

Android 签名密钥与 Apple 证书均从仓库 Secrets 注入，不入库。iOS 未签名 IPA 可直接用你的设备侧载测试。

## 数据说明

玩家、规则、历史、活跃对局与流水都存在 WebView `localStorage`（`bilscore_*` 四个键，另加主题键）。写入做了 500ms 防抖，`pagehide` / `visibilitychange` 时立即落盘；读取全量容错，脏数据不会导致白屏。

## 目录速览

```
src/
  App.vue                 全局设计系统（Felt Table token + 响应式断点）
  views/                  首页、选人、对局、玩家、规则
  components/game/        玩家卡 / 操作台 / 选人弹窗
  store/                  状态层：计分、流水、活跃对局、战绩
  config/ utils/          双模式开关、id、规则口径、主题、特效、返回键
src-tauri/src/
  game_core.rs            计分 / 洗牌 / 撤销核心（含 21 项单测）
  lib.rs                  9 个 invoke 命令
```
