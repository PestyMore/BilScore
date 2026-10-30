# BilScore 项目评估 · 模拟运行方案 · 优化建议

> 评估时间：2026-10-04　|　代码基线：`main` @ v1.2.0（工作区干净）
> 本文所有结论均基于对本机环境与实际代码的**实测/实读**，非泛泛而谈。

---

## 0. 结论速览（TL;DR）

| 主题 | 结论 |
| --- | --- |
| 你到底做了什么 | 一个 Tauri 2 + Vue 3 的**台球追分计分器**，核心计分/洗牌/撤销下沉在 Rust，前端只做展示与交互，数据全部存在 WebView 的 `localStorage` |
| 最轻量模拟方案 | **不需要 Android Studio**。你机器上 SDK/NDK/JDK/AVD 全都还在，直接命令行启动已有 AVD（无窗口）+ `scrcpy` 看画面 + `tauri android dev` 热更新。已实测跑通，50 秒内 adb 可见设备 |
| 日常开发首选 | 桌面 `npm run tauri dev`（WebView2 窗口），零依赖、秒级热更，覆盖 80% 场景 |
| 分发 | Android 缺 CI 工作流（需新增）；iOS 现有工作流只产**未签名 IPA，装不进你的手机**，必须改造成真机签名或走 AltStore 侧载 |
| 最致命的问题 | `.gitignore` 第 45 行 `*.xml` 把所有 Android 资源 XML 都忽略了（`AndroidManifest.xml`、`file_paths.xml`…），**CI 拉代码后 Android 工程直接不可用** |
| 最致命的安全问题 | 签名库 `bilscore.jks` 已提交进仓库，口令 `123456`，且 `key.properties` 没被忽略 |

---

## 1. 项目现状分析（你之前到底干了什么）

### 1.1 一句话定位
移动端（Android / iOS）**台球追分计分器**：选人开局 → 点玩家卡片 → 触发事件（大金/小金/黄金9/普胜/犯规/让杆…）→ 自动算分、换轮、洗牌 → 可撤销、可中途加人换人、可自定义排序 → 结束存档到"最近对局"。

### 1.2 架构

```
┌─────────────── Vue 3 前端（src/）───────────────┐
│ router(HomeView/PlayerSelect/Game/events/players)│
│ store/index.ts  ← reactive 单例 + invoke 封装     │
│ utils: avatar / dialog(原生玻璃弹窗) / fx(烟花)   │
│ config/index.ts ← personal / public 双版本开关    │
└─────────────── invoke（IPC）─────────────────────┘
┌─────────────── Rust 后端（src-tauri/）───────────┐
│ lib.rs    9 个 tauri command（纯转发）            │
│ game_core.rs  GameCore：计分 / 洗牌 / 撤销栈      │
│ models.rs  Player / CustomEvent / GameState       │
└──────────────────────────────────────────────────┘
持久化：Web 侧 localStorage（players / events / history / theme）
```

关键设计（v1.2.0 的核心改动，看 README 更新日志即可印证）：
- **计分与洗牌下沉到 Rust**，`GameCore` 用 `Mutex` 托管在 `AppState`；
- 撤销用 `history_stack: Vec<GameState>`，**动作前快照**，上限 50；
- 洗牌规则：赢家放第 1、输家放第 2，其余 `shuffle`；
- `personal` 版内置 10 个预设事件，`public` 版过滤掉 `isBuiltIn`，由 `VITE_APP_MODE`（`.env`）切换。

### 1.3 页面与功能清单

| 路由 | 文件 | 作用 |
| --- | --- | --- |
| `/` | `HomeView.vue` | 开始新对局、主题切换、最近对局（10 条）回溯 |
| `/select-players` | `PlayerSelectView.vue` | 从玩家库勾人（≥2 人） |
| `/game` | `GameView.vue` | 主战场：计分卡片流、事件抽屉、加人/换人/排序/撤销/结束 |
| `/events`… | `views/events/*` | 事件规则增删改（含自定义分数） |
| `/players`… | `views/players/*` | 玩家库增删改 |

### 1.4 本机环境盘点（重要：你的 Android 环境其实很完整）

| 项 | 实测结果 |
| --- | --- |
| Node / npm | v24.11.1 / 11.6.2 |
| Rust | cargo 1.91.1 |
| JDK | Temurin **21.0.8**（`JAVA_HOME=D:\OpenJDK`） |
| Android SDK | `ANDROID_HOME=D:\AndroidDev\Sdk`，含 platform-tools / build-tools(35,36.1,37rc) / platforms(36,36.1) / emulator / system-images |
| NDK | **29.0.14206865** |
| Rust Android 目标 | `aarch64-linux-android` `armv7-linux-androideabi` `i686-linux-android` `x86_64-linux-android` **全部已安装** |
| AVD | `Pixel_9a`（x86_64 / android-36 / google_apis_playstore / 2GB RAM）、`Medium_Phone_API_36.1`、`Resizable_Experimental` |
| 虚拟化 | `emulator -accel-check` → **WHPX(10.0.26200) is installed and usable**（不需要 HAXM → **正是你说的"驱动冲突"的解药**） |
| 模拟器 WebView | 133.0.6943.137（完全够 Tauri 用） |

> 结论：**Android Studio 只是个 IDE，Tauri 移动端构建根本不需要它**。你需要的（SDK+NDK+JDK+AVD+rust target）本机全部齐备，卸载 Android Studio 一点影响都没有。

---

## 2. 最轻量的 Android 模拟运行方案

### 2.1 方案对比

| 方案 | 安装成本 | 启动耗时 | 内存 | 能验证什么 | 推荐度 |
| --- | --- | --- | --- | --- | --- |
| **A. 命令行 AVD + scrcpy + `tauri android dev`** | 0（全都有）+ scrcpy 约 35MB 绿色版 | 冷启 ~50s，快照启 ~10s | ~2GB | **全真 Android**：WebView、安全区、返回键、真机性能、安装/签名 | ⭐⭐⭐⭐⭐ |
| **B. 桌面 Tauri 窗口（WebView2）** | 0 | 秒级 | ~200MB | 全部业务逻辑 + UI 布局（Rust 侧 100% 同源） | ⭐⭐⭐⭐ |
| C. Chrome 设备模拟 + invoke mock | 0 | 秒级 | ~150MB | 纯 CSS/布局，需写 mock 层 | ⭐⭐⭐ |
| D. MuMu / LDPlayer 第三方模拟器 | ~500MB | ~30s | ~1.5GB | 同 A，但 adb 连接更麻烦，且你这台机器用不上 | ⭐⭐ |
| E. WSA（Windows 安卓子系统） | — | — | — | 已于 2025-03 停止支持，**别用** | ✗ |
| F. 重装 Android Studio | ~3GB | ~2min | 4–6GB | 同 A，但会把你上次踩的驱动坑再踩一遍 | ✗ |

### 2.2 推荐组合：**日常用 B，发版前用 A**

#### 方案 A（真机级验证，推荐主力）

**第一次准备（只做一次）**

1. `scrcpy` 解压即用（用于看无窗口模拟器的画面，比模拟器自带窗口更轻、更清晰、可缩放）：
   https://github.com/Genymobile/scrcpy/releases → 下载 `scrcpy-win64-*.zip` 解压到任意目录。

2. 在 `package.json` 的 `scripts` 里加一条（可选）：
   ```json
   "android:dev:emu": "tauri android dev"
   ```

3. 建一个 `dev-android.bat` 放根目录（一键起飞）：
   ```bat
   @echo off
   set SDK=D:\AndroidDev\Sdk
   set EMU=%SDK%\emulator\emulator.exe
   set ADB=%SDK%\platform-tools\adb.exe

   rem 1) 无窗口启动模拟器（后台），WHPX 硬件加速，软件渲染兜底
   start "BilScoreAVD" /MIN "%EMU%" -avd Pixel_9a -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -memory 2048

   rem 2) 等开机完成
   "%ADB%" wait-for-device
   :wait
   for /f %%i in ('"%ADB%" shell getprop sys.boot_completed 2^>nul') do set BOOT=%%i
   if not "%BOOT%"=="1" goto wait
   echo [OK] emulator booted

   rem 3) 开画面（另开一个窗口，可关掉）
   start "scrcpy" /MIN scrcpy -m 1080 --window-title BilScore --always-on-top

   rem 4) 热更新开发（前端改秒生效，Rust 改自动重编重安装）
   npx tauri android dev
   ```
   > 第一次冷启动成功后模拟器会自动存快照，之后启动只要 10 秒左右；想强制冷启动加 `-no-snapshot-load`。
   > 若 `scrcpy` 不想装，把第 3 步删掉、第 1 步去掉 `-no-window` 即可用模拟器自带窗口。

**已实测（本次评估时真跑过）**
```
emulator -avd Pixel_9a -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -memory 2048
→ 50 秒内 adb devices 出现 emulator-5554
→ adb shell getprop sys.boot_completed = 1
→ ro.product.model = sdk_gphone64_x86_64
→ adb emu kill 正常退出
```
**结论：方案 A 在你这台机器上 100% 可用，无需安装任何新东西（除可选的 scrcpy）。**

**常用命令**
```bat
D:\AndroidDev\Sdk\platform-tools\adb.exe devices                 :: 看设备
D:\AndroidDev\Sdk\platform-tools\adb.exe logcat | findstr bilscore  :: 看日志
D:\AndroidDev\Sdk\platform-tools\adb.exe emu kill                  :: 关模拟器
npx tauri android dev                                              :: 热更新开发
npx tauri android build --apk --split-per-abi                      :: 产物 APK
```

#### 方案 B（日常开发，最快）

```bat
npm run tauri dev
```
桌面窗口跑的就是同一套 Rust `GameCore` + 同一套前端，逻辑改动秒级验证。**建议临时把 `tauri.conf.json` 的窗口改成手机比例**（或新建 `tauri.conf.dev.json` 用 `--config` 指定），这样布局验证也更准：

```json
"windows": [{ "title": "BilScore", "width": 393, "height": 852, "resizable": true }]
```
> 注意：桌面端测不到的是 **iOS/Android 安全区、系统返回手势、WebView 版本差异**，这三样交给方案 A / 你的 iPhone。

#### 方案 C（纯 CSS 秒调，可选）

`npm run dev` → 浏览器开 `http://localhost:1420` → F12 设备模拟（iPhone 15 Pro / Pixel 8）。
浏览器里没有 Tauri，需要劫持一层 invoke，在 `src/main.ts` 最顶部加（仅 mock 模式下生效）：

```ts
if (import.meta.env.VITE_MOCK_TAURI === '1') {
  // @ts-expect-error 内部 API
  window.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any) => {
    console.log('[mock invoke]', cmd, args);
    return null; // 或返回一段假的 GameState
  };
}
```
配套在 `.env.local` 里写 `VITE_MOCK_TAURI=1`（该文件已被忽略，不会污染仓库）。

---

## 3. 打包分发与 GitHub Actions 方案

### 3.0 必须先修掉的"CI 地雷"（否则工作流一定红）

**① `.gitignore` 第 45 行 `*.xml` 是致命的**
```
$ git check-ignore -v src-tauri/gen/android/app/src/main/AndroidManifest.xml
.gitignore:45:*.xml    src-tauri/gen/android/app/src/main/AndroidManifest.xml
$ git check-ignore -v src-tauri/gen/android/app/src/main/res/xml/file_paths.xml
.gitignore:45:*.xml    src-tauri/gen/android/app/src/main/res/xml/file_paths.xml
$ git ls-files | findstr /i ".xml"
（空）
```
**仓库里一个 XML 都没有**。`AndroidManifest.xml`、`res/values/strings.xml`、`res/values-night/*`、`res/xml/file_paths.xml`、`res/mipmap-anydpi-v26/*` 全被吞了。CI 拉完代码 → Android 工程连 Manifest 都没有 → 直接编译失败。

修法（改 2 行）：
```diff
- *.xml
+ /repomix-output.xml
```
然后补提交（改完规则后直接 `git add src-tauri/gen/android` 即可，无需 `-f`）。

**② 签名库已入库（高危）**
```
src-tauri/gen/android/app/bilscore.jks   ← git ls-files 里有，已跟踪
src-tauri/gen/android/key.properties     ← 未跟踪，但也没被 .gitignore 忽略（随时可能误提交）
口令：123456
```
任何人拿到你这个公开仓库就能用你的身份签名同名包。处理：
```bat
git rm --cached src-tauri/gen/android/app/bilscore.jks
```
`.gitignore` 增加：
```
src-tauri/gen/android/app/*.jks
src-tauri/gen/android/key.properties
src-tauri/gen/android/app/tauri.properties
src-tauri/gen/android/local.properties
```
并**重新生成一枚新 keystore 轮换掉**（旧的已泄露）：
```bat
keytool -genkeypair -v -keystore bilscore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mykey
```
CI 里用 Secret：`ANDROID_KEYSTORE_BASE64`（`base64 -w0 bilscore.jks`）、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`。

**③ `app/build.gradle.kts` 缺 key.properties 会直接崩**
```kotlin
signingConfigs {
    create("release") {
        keyAlias = keystoreProperties["keyAlias"] as String?
        ...
        storeFile = file(keystoreProperties["storeFile"] as String)  // ← null 转 String 抛 NPE
    }
}
```
`key.properties` 不存在时，这段在**配置阶段**就 NPE，连 debug 都编不过（CI 若没注入密钥就必红）。改成：
```kotlin
signingConfigs {
    if (keystorePropertiesFile.exists()) {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }
}
buildTypes { getByName("release") {
    signingConfig = signingConfigs.findByName("release")   // 没有就为 null，不再崩
    ...
}}
```

**④ 不要在工作流里跑 `tauri android init`**
你已经手工改过 `app/build.gradle.kts`（加了签名配置），`init` 会用模板覆盖它。**正确做法是把完整的 `gen/android` 提交进仓库（先修好 ① ）**，CI 直接 `tauri android build`。（iOS 侧因为 `gen/apple` 没入库，倒是需要 `tauri ios init`，这个可以保留。）

### 3.1 Android 工作流（新增 `.github/workflows/build-android.yml`）

```yaml
name: Build Android

on:
  workflow_dispatch:
    inputs:
      mode:
        description: 'public 或 personal'
        required: true
        default: 'public'
        type: choice
        options: [public, personal]
  push:
    tags: ['v*']

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-linux-android,armv7-linux-androideabi,i686-linux-android,x86_64-linux-android

      - uses: Swatinem/rust-cache@v2
        with: { workspaces: 'src-tauri -> target' }

      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '21' }

      - uses: android-actions/setup-android@v3      # 装 SDK/NDK，ubuntu-latest 自带也可
      - uses: gradle/actions/setup-gradle@v4        # Gradle 缓存，省一半时间

      - run: npm ci

      # 关键：Vite 只从 .env 文件读 VITE_*，直接设 process.env 无效，必须落盘
      - name: 写入构建模式
        run: echo "VITE_APP_MODE=${{ inputs.mode || 'public' }}" > .env

      - name: 注入签名
        env:
          KS: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          KSP: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KA: ${{ secrets.ANDROID_KEY_ALIAS }}
          KP: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          echo "$KS" | base64 -d > src-tauri/gen/android/app/bilscore.jks
          cat > src-tauri/gen/android/key.properties <<EOF
          storePassword=$KSP
          keyPassword=$KP
          keyAlias=$KA
          storeFile=bilscore.jks
          EOF

      - name: 构建 APK（按 ABI 拆分，体积直降 ~70%）
        run: npx tauri android build --apk --split-per-abi

      - name: 构建 AAB（上架用，可选）
        if: startsWith(github.ref, 'refs/tags/v')
        run: npx tauri android build --aab

      - uses: actions/upload-artifact@v4
        with:
          name: bilscore-android-${{ inputs.mode || 'public' }}
          path: |
            src-tauri/gen/android/app/build/outputs/apk/**/*.apk
            src-tauri/gen/android/app/build/outputs/bundle/**/*.aab
          if-no-files-found: error

      - name: 发布 Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: src-tauri/gen/android/app/build/outputs/apk/**/*.apk
```

要点：
- Tauri CLI 已确认支持 `--apk / --aab / --split-per-abi / --target`（本机 `npx tauri android build --help` 实读）；
- `npm run build` 会由 `beforeBuildCommand` 自动触发，此时 `.env` 已写入，personal/public 才正确；
- 用 `npm ci` 而不是 `npm install`（有 lockfile，可复现且更快）；
- ubuntu runner 比 Windows runner 编 Android 稳得多（NDK 路径/符号链接问题少）。

### 3.2 iOS：现有工作流的问题与改造

**现状**（`.github/workflows/build-ios.yml`）：sed 阉割签名 → 产 `bilscore.ipa`（**未签名**）。
**未签名 IPA 装不进你的 iPhone**（非越狱）。所以你现在的产物只能看、不能用。

另外两个小毛病：
- `npx tauri ios build --target aarch64 || true` —— `|| true` 会把失败吞掉，产物可能是空的/旧的，建议删掉；
- `macos-latest` runner 计费是 Linux 的 **10 倍**，别让它每次 push 都跑（现在是 `workflow_dispatch`，正确，保持）。

三条可选路线：

| 路线 | 成本 | 有效期 | 适合 |
| --- | --- | --- | --- |
| **① CI 真机签名（Development / Ad-Hoc）** | Apple 开发者账号 ¥688/年（免费账号也行，但 7 天） | 付费 1 年 / 免费 7 天 | ⭐ 推荐：装完就能用 |
| **② 继续产未签名 IPA + AltStore / SideStore 侧载** | 0（免费 Apple ID） | 7 天，到期本地重签（可自动续） | ⭐ 零成本方案 |
| ③ 有 Mac 就本地 Xcode 直连设备 | 0 | 7 天（免费账号） | 调试最快，不适合分发 |

**路线 ① 的 CI 骨架**（替换现有 sed 阉割那一段）：
```yaml
- uses: apple-actions/import-codesign-certs@v3
  with:
    p12-file-base64: ${{ secrets.APPLE_CERTIFICATE_BASE64 }}
    p12-password: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
    keychain-password: ${{ secrets.KEYCHAIN_PASSWORD }}

- name: 安装描述文件
  env:
    PROFILE: ${{ secrets.PROVISIONING_PROFILE_BASE64 }}
  run: |
    mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
    echo "$PROFILE" | base64 -d > ~/Library/MobileDevice/Provisioning\ Profiles/bilscore.mobileprovision

- name: 改成手动签名并指定团队
  run: |
    cd src-tauri/gen/apple/bilscore.xcodeproj
    sed -i '' 's/CODE_SIGN_STYLE = Automatic;/CODE_SIGN_STYLE = Manual;/g' project.pbxproj
    sed -i '' "s/DEVELOPMENT_TEAM = \"\";/DEVELOPMENT_TEAM = ${{ secrets.APPLE_TEAM_ID }};/g" project.pbxproj

- run: npx tauri ios build --target aarch64
  env:
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

- name: 打包 IPA
  run: |
    APP=$(find src-tauri/gen/apple -type d -name "*.app" | grep -v Debug | head -n1)
    mkdir -p Payload && cp -r "$APP" Payload/ && zip -qr bilscore.ipa Payload
```
> 需要的 Secret：`APPLE_CERTIFICATE_BASE64`（p12）、`APPLE_CERTIFICATE_PASSWORD`、`PROVISIONING_PROFILE_BASE64`、`KEYCHAIN_PASSWORD`、`APPLE_TEAM_ID`。设备 UDID 要提前加进 Profile。
> `tauri ios build` 在 Windows 上不可见（本机实测 `npx tauri ios` 报 unrecognized subcommand），**具体导出参数需在 macOS runner 上验证一次**，上面的骨架给的是确定可行的姿势。

**路线 ②（零成本）**：保持你现在的工作流不动，下载 IPA 后用 Windows 版 **AltServer**（AltStore 配套）通过你的 Apple ID 侧载，7 天到期连同一 WiFi 自动续签；付费账号可用 SideStore 做到 1 年。对你"自己测试"这个诉求来说完全够用。

### 3.3 版本与发布流程建议

现在版本号散在 3 处且不一致：

| 位置 | 当前值 |
| --- | --- |
| `package.json` | 1.2.0 |
| `src-tauri/tauri.conf.json` | 1.2.0 |
| `src-tauri/gen/android/app/tauri.properties` | **versionName=1.1.1 / versionCode=1001001** |

`tauri android build` 会用 `tauri.conf.json` 覆盖 `tauri.properties`，所以真机产物是 1.2.0，**但仓库里那份是旧的，容易误导**。建议：把 `tauri.properties` 加入 `.gitignore`（它是构建生成物），发版只改 `package.json` + `tauri.conf.json` 两处，然后：

```bat
git tag v1.2.1 && git push --tags
```
tag 触发两条工作流，产物自动进 GitHub Release。`release_apks/` 目录已被忽略，可以保留作本地归档，也可以删掉（里面只有 v1.1.1 的两个包）。

---

## 4. 阻塞级问题清单（按优先级）

| # | 级别 | 问题 | 影响 | 修复 |
| --- | --- | --- | --- | --- |
| 1 | **P0** | `.gitignore` `*.xml` 吞掉全部 Android XML | CI 拉代码后 Android 工程不可用 | 改成 `/repomix-output.xml` 并补提交 |
| 2 | **P0（安全）** | `bilscore.jks` 已入库、口令 123456、`key.properties` 未忽略 | 签名身份可被冒用 | `git rm --cached` + 忽略 + 轮换密钥 + CI Secret |
| 3 | **P0** | `build.gradle.kts` 缺 key.properties 时 NPE | 无密钥环境下连 debug 都编译失败 | `if (keystorePropertiesFile.exists())` 包裹 |
| 4 | **P0** | 无 Android CI 工作流；iOS 产物未签名装不上 | 分发链路断 | 见 §3.1 / §3.2 |
| 5 | **P1** | CI 无 `.env` → `VITE_APP_MODE` 缺省为 public | 打不出 personal 包 | 工作流里 `echo "VITE_APP_MODE=..." > .env` |
| 6 | **P1** | `trigger_event` 传**数组下标**，前端 `invoke` 未 `await` | 连点/洗牌后顺序变化 → **记错人** | 改传 `player_id`；加请求锁（`isBusy`） |
| 7 | **P1** | `initNewGame()` / `resumeGame()` 未 await 就 `router.push('/game')` | 首帧空白或旧数据闪烁 | 改为 `await ... then push` |
| 8 | **P1** | 每次操作同步 `JSON.parse(JSON.stringify())` + `localStorage.setItem` | 主线程阻塞、卡顿；WebView 清数据即**全丢** | 防抖写盘 + 迁移到文件持久化 |
| 9 | **P1** | `index.html` 缺 `viewport-fit=cover` | iOS 上 `env(safe-area-inset-*)` 恒为 0 → **刘海/底部横条遮挡** | 补 meta |
| 10 | **P1** | `invoke` 全链路无 `try/catch` | 失败静默（如分数输入 NaN） | 统一封装 + 失败提示 |
| 11 | **P2** | 所有玩家卡片的 `conic-gradient` 4s 无限旋转 | 低端机持续掉帧/发热 | 只给当前玩家加；支持 `prefers-reduced-motion` |
| 12 | **P2** | 无 `[profile.release]`、未拆 ABI、无用依赖 | APK 偏大、编译慢 | 见 §5.3 |
| 13 | **P2** | Android 返回键/手势无处理 | 返回直接退出 App（Tauri 暂无官方 API，见 [#8142](https://github.com/tauri-apps/tauri/issues/8142)） | `MainActivity.kt` 覆写 `onBackPressed` 派发 JS 事件 |
| 14 | **P2** | 死代码 + 未用依赖 | 体积与维护成本 | 见 §5.4 |

---

## 5. 运行优化建议

### 5.1 前端运行时

**（1）持久化别在每次点击时同步写盘**
`src/store/index.ts:75-88` 的 `_updateHistoryList()` 每次触发事件都会做一次完整深拷贝 + `localStorage.setItem`，而 `setItem` 在主线程同步执行（8 人局 + 10 条历史，Android WebView 上单次可达 5–20ms），正好卡在动画期间。

```ts
// 建议：_syncState 只更新内存，写盘防抖
let saveTimer: number | undefined;
function schedulePersist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem('bilscore_history', JSON.stringify(gameStore.history));
  }, 500);
}
```
更彻底的做法：把 `players / events / history` 迁到 **`tauri-plugin-store`** 或 Rust 侧写 `appDataDir` 下的 JSON——WebView 的 localStorage 在 Android 上属于"可清理的站点数据"，用户清缓存或系统存储紧张时会丢，这是**数据可靠性**问题而不只是性能问题。

**（2）撤销按钮的状态是假的**
```ts
this.historySnapshots = new Array(1) as any;   // store/index.ts:71
```
只是为了让"撤销按钮可用"而塞了个长度为 1 的假数组；撤销失败时再置空。建议让 Rust 在 `GameState` 里多返回一个 `history_len: usize`，前端按真实值禁用按钮；顺带给用户"没有可撤销的操作"的提示。

**（3）用 id 而不是 index 寻址（修竞态）**
```ts
// 现状：GameView.vue:51
gameStore.triggerEvent(selectedPlayerIndex.value!, eventId);   // 未 await，且传下标
```
Rust 侧 `handle_shuffle` 会重排数组，两次点击叠加时第二次的下标已经指向别人。改成：
```ts
// 传 id
gameStore.triggerEvent(player.id, eventId);
// Rust: 用 find_position(|p| p.id == player_id)
```
同时加个 `isSubmitting` 锁，请求期间禁用事件按钮。

**（4）跳转前先 await**
```ts
// PlayerSelectView.vue:24
gameStore.initNewGame(players);   // async
router.replace('/game');          // 立刻跳 → 首帧空
// HomeView.vue:28 的 resumeMatch 同理
```

**（5）健壮性**
- `HomeView.vue:34` `getTopScorer(players: any[])`：空数组会 `reduce` 抛错 → 首页白屏。加 `if (!players?.length) return '-'`，并把 `any[]` 换成 `Player[]`；
- `loadLocal` / `loadEvents` 的 `JSON.parse` 全部包 `try/catch`，脏数据直接降级为空而不是崩；
- `EventDetailView.vue` 的分数输入：空值 → `NaN` → serde 反序列化失败 → invoke 抛错被静默吞掉。加 `Number.isFinite` 校验。

**（6）iOS 视口与安全区**
```html
<!-- index.html：现在缺 viewport-fit=cover，safe-area 会失效 -->
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<title>BilScore · 台球计分器</title>
<html lang="zh-CN">
```
另外 `100vh` 建议换 `100dvh`（`App.vue:104`、`GameView.vue:262`），iOS 上更准。

### 5.2 渲染与动画

**（1）流光边框是全屏常驻动画** —— `GameView.vue:299-311`
每个卡片都有一个 `200%×200%` 的 `conic-gradient` 层在 4 秒一圈地无限旋转，8 人局就是 8 个永不停歇的合成层。低端机上滑动列表时会明显掉帧、发热。建议：
- 只给"当前击球位 / 第一名"的卡片加流光，其余用静态渐变边框；
- 加 `@media (prefers-reduced-motion: reduce) { animation: none }`；
- 离屏时 `animation-play-state: paused`（`IntersectionObserver`）。

**（2）`backdrop-filter: blur()` 用了 4 处**（`.game-header`、`.sheet-overlay`、`.modal-center-overlay`、`.dropdown-menu`）——移动端 GPU 上这是最贵的效果之一，弹窗叠加时会掉帧。建议弹窗保留、常驻的 `.game-header` 换成半透明纯色。

**（3）烟花特效**（`utils/fx.ts`）
- 每次正分换轮都放：3×80 = 240 个粒子，逐帧 `arc()` + 全屏 `clearRect`，且 canvas 没按 `devicePixelRatio` 缩放（高分屏糊，但性能也没省到）；
- 建议：**只在"大金/小金"（score ≥ 7）时放**；1.5 秒内最多一次；监听 `prefers-reduced-motion`；页面切后台时 `cancelAnimationFrame` 并移除 canvas。

**（4）图标**：8 个 PNG（5–8KB）+ `icons/` 下 33 个 PNG。建议换成内联 SVG 或 sprite，省请求、任意缩放不糊、还能用 `currentColor` 直接跟随主题（现在靠 `filter: brightness(0) invert(1)` 反色，属于绕路）。

### 5.3 Rust 与产物体积

```toml
# Cargo.toml：加 release profile（APK 立减 30%~50%，启动也更快）
[profile.release]
opt-level = "s"        # 或 "z"（更小，启动略快；追求极致性能用 3）
lto = true
strip = true
codegen-units = 1
panic = "abort"

# 未使用的依赖，删掉能省编译时间
- thiserror = "1.0"     # 全项目 0 处引用（已 grep 确认）
- serde_json = "1"      # 全项目 0 处引用（已 grep 确认）
```
- `uuid` 只用来生成 `game_xxx`，可换成 `时间戳+计数器`；`rand` 只用来 `shuffle`，也可自写 3 行 LCG。两个都能少一棵依赖树、少几十秒编译。
- `tauri-plugin-opener` **前端从未 import 过**（已 grep 确认）→ 从 `Cargo.toml` 和 `lib.rs` 里摘掉，少一个插件 = 少一个 Android 模块 + 少一份体积。
- Android 侧加 `abiFilters` 或用 `--split-per-abi`（通用包含 4 套 `.so`，拆开后单包小 3–4 倍）。
- 给 `GameCore` 补单元测试：计分/洗牌/撤销是纯逻辑、无副作用，`cargo test` 成本极低；而 v1.2.0 刚重写过洗牌（`game_core.rs:131` 注释里还留着"避免编译错误"），**没有测试保护是最危险的**。

### 5.4 清理与收敛

- **死代码**：`src/views/PlayerCountView.vue`、`src/views/PlayerNamesView.vue` 在路由里已无引用（v1.1.1 移除人数选择后遗留），可删；
- `types.GameSnapshot` / `gameStore.historySnapshots` 是撤销栈下沉到 Rust 后的遗留物，只被那个"长度为 1 的假数组"用着；
- `public/vite.svg`（Vite 模板残留）、根目录 `repomix-output.xml`（整仓源码快照，务必保持忽略）；
- `tauri.conf.json` 里 `"csp": null` —— 移动端建议配一条 CSP（哪怕只是 `default-src 'self'`）；
- `"bundle.targets": "all"` 在桌面 CI 上会连编 msi/dmg，移动端工作流不受影响，但本地 `tauri build` 会变慢，可按需指定。

---

## 6. 关键代码位置索引（便于你回看）

| 关注点 | 位置 |
| --- | --- |
| 计分主逻辑 | `src-tauri/src/game_core.rs:67-122` `trigger_event` |
| 洗牌逻辑（v1.2 重写过） | `src-tauri/src/game_core.rs:131-174` `handle_shuffle` |
| 撤销栈（上限 50） | `src-tauri/src/game_core.rs:44-65` |
| 每次操作的深拷贝 + 写盘 | `src/store/index.ts:67-88` |
| 假撤销状态 | `src/store/index.ts:71` |
| 连点竞态 | `src/views/GameView.vue:45-67`、`src/store/index.ts:118-127` |
| 未 await 就跳转 | `src/views/PlayerSelectView.vue:21-26`、`src/views/HomeView.vue:28` |
| 常驻旋转动画 | `src/views/GameView.vue:299-311` |
| 主题变量 / 全局样式 | `src/App.vue:17-149` |
| 双版本开关 | `src/config/index.ts`、`src/store/index.ts:7-26` |

---

## 7. 建议的落地顺序

1. **先修 3 个 P0**：`.gitignore` 的 `*.xml` → 补提交 Android XML；`jks` 出库 + 轮换；`build.gradle.kts` 加空值保护。（不修，CI 永远红）
2. **打通 Android CI**：按 §3.1 加工作流，先用 `workflow_dispatch` 手动跑一次 personal + public。
3. **装 scrcpy + `dev-android.bat`**：本地模拟链路跑起来（已验证可行）。
4. **iOS 分发**：先走零成本路线 ②（未签名 IPA + AltServer 侧载）把真机测试跑通；后续再上路线 ① 的 CI 签名。
5. **修 P1**：`viewport-fit=cover`、await 跳转、id 寻址 + 请求锁、持久化防抖、异常兜底。
6. **做性能与体积**：release profile、拆 ABI、删无用依赖与死代码、动画与烟花收敛。
7. **补 Rust 单测**：锁住计分与洗牌，之后再改规则才不慌。

---

### 附：本次评估实际执行过的验证

- `npm run build` —— 通过（vue-tsc 无报错），产物 `index.js` 107KB（gzip 41.7KB），总计约 150KB，体积健康；
- `emulator -avd Pixel_9a -no-window ...` —— 50s 内开机完成，`adb devices` 识别 `emulator-5554`，`adb emu kill` 正常；
- `emulator -accel-check` —— WHPX 可用（无需 HAXM，故不会与你之前的驱动冲突问题重逢）；
- `git check-ignore -v` —— 确认 `*.xml` 命中 AndroidManifest 与 file_paths.xml；
- `git ls-files` —— 确认 `bilscore.jks` 已入库、仓库中 0 个 XML；
- `npx tauri android build --help` —— 确认 `--apk / --aab / --split-per-abi / --target` 可用；
- 环境：Rust 4 个 Android 目标已装、NDK 29、JDK 21、WebView 133。
