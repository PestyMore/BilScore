# 📝 更新日志

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


# 🎱 BilScore - 专业的台球追分计分器

**BilScore** 是一款基于 **Tauri 2.0** + **Vue 3** 构建的现代化移动端台球计分应用。

![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8DB?style=flat&logo=tauri)
![Vue](https://img.shields.io/badge/Vue.js-v3.0-4FC08D?style=flat&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.0-3178C6?style=flat&logo=typescript)
![Android](https://img.shields.io/badge/Platform-Android-3DDC84?style=flat&logo=android)

---

## ✨ 核心功能
*   **👥 智能玩家管理**：一次录入永久保存，智能生成类似 iOS 通讯录的文字头像。
*   **🎮 强大的对局控制**：支持 2-8 人同局追分，中途无缝加人/换人，支持完全撤销。
*   **🎨 极致 UI/UX**：全局玻璃态设计，流光边框特效，支持暗黑/浅色模式切换。
*   **📊 数据持久化**：断点续玩，异常退出也不丢进度，自带历史战绩回溯。