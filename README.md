# 🎱 BilScore - 专业的台球追分计分器

> 📝 完整更新记录见 [CHANGELOG.md](./CHANGELOG.md)　|　🛠 改造计划见 [CHANGEPLAN.md](./CHANGEPLAN.md)　|　📊 评估与优化建议见 [advice.md](./advice.md)

**BilScore** 是一款基于 **Tauri 2.0** + **Vue 3** 构建的现代化移动端台球计分应用。

![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8DB?style=flat&logo=tauri)
![Vue](https://img.shields.io/badge/Vue.js-v3.0-4FC08D?style=flat&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.0-3178C6?style=flat&logo=typescript)
![Android](https://img.shields.io/badge/Platform-Android-3DDC84?style=flat&logo=android)

---

## ✨ 核心功能
*   **👥 智能玩家管理**：一次录入永久保存，可编辑改名、换头像颜色，智能生成文字头像。
*   **🎮 强大的对局控制**：支持 2-8 人同局追分，中途无缝加人/换人/移出，Rust 侧完整撤销栈。
*   **🎯 灵活的计分规则**：自定义结算方式（吃/给所有人、上家、指定玩家）与分数，触发即记账。
*   **🎨 统一设计系统**：Lucide 细线图标、明暗双主题、当前击球位流光指示。
*   **📊 数据持久化**：断点续玩，异常退出也不丢进度，自带历史战绩回溯与删除。

---

## 🛠 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run tauri dev` | 桌面窗口开发（最快，改手机宽度看布局） |
| `dev-android.bat` | 一键：无窗口起 AVD → scrcpy → `tauri android dev` 热更 |
| `npm run build` | 前端类型检查 + 生产构建 |
| `npm run smoke` | 无头冒烟测试：SSR 渲染全部路由 + 校验图标数据 |
| `npm run test:rust` | Rust 计分核心单元测试 |
| `node gen-icons.mjs` | 重新生成内联图标（需临时 `npm i -D lucide-static`） |
| `npm run tauri -- icon app-icon.svg` | 从 `app-icon.svg` 重新生成全平台应用图标 |

> 移动端开发注意：`tauri android dev` 需要指定模拟器可达的地址，模拟器用 `--host 10.0.2.2`（脚本已内置），真机传你的局域网 IP。
