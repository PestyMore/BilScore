@echo off
chcp 65001 >nul
setlocal

REM ==================================================================
REM  BilScore 一键 Android 模拟器开发脚本（不依赖 Android Studio）
REM  用法：
REM    dev-android.bat                  -> 用模拟器专用别名 10.0.2.2（默认，推荐）
REM    dev-android.bat 192.168.1.20    -> 真机调试时传宿主机局域网 IP
REM  说明：Windows 下 Tauri CLI 默认会挑宿主机公网 IP，模拟器访问不到会白屏，
REM        所以这里强制指定 host；10.0.2.2 是 AVD 访问宿主机的固定别名。
REM ==================================================================

set "SDK=D:\AndroidDev\Sdk"
set "ADB=%SDK%\platform-tools\adb.exe"
set "EMU=%SDK%\emulator\emulator.exe"
set "AVD=Pixel_9a"
set "SCRCPY_DIR=%USERPROFILE%\tools\scrcpy-win64"
set "DEV_HOST=10.0.2.2"
if NOT "%~1"=="" set "DEV_HOST=%~1"

if not exist "%EMU%" (
  echo [X] 找不到模拟器: %EMU%
  echo     请修改脚本顶部的 SDK 路径
  pause & exit /b 1
)

echo [1/4] 启动模拟器 %AVD%（无窗口，WHPX 硬件加速）...
start "BilScoreAVD" /MIN "%EMU%" -avd %AVD% -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -memory 2048

echo [2/4] 等待开机完成...
"%ADB%" wait-for-device
:waitboot
FOR /F "tokens=*" %%i IN ('"%ADB%" shell getprop sys.boot_completed 2^>nul') DO SET "BOOTED=%%i"
if not "%BOOTED%"=="1" (
  timeout /t 2 /nobreak >nul
  goto waitboot
)
echo       模拟器已就绪

echo [3/4] dev server 地址: http://%DEV_HOST%:1420
if exist "%SCRCPY_DIR%\scrcpy.exe" (
  start "scrcpy" /MIN "%SCRCPY_DIR%\scrcpy.exe" -m 1080 --window-title BilScore --always-on-top
) else (
  echo       未找到 scrcpy（%SCRCPY_DIR%），跳过画面投射。
  echo       需要看画面：https://github.com/Genymobile/scrcpy/releases
)

echo [4/4] 启动 Tauri 热更新开发（Ctrl+C 结束）...
echo       关模拟器: adb emu kill
echo       看日志:    adb logcat | findstr bilscore
echo.
call npx tauri android dev --host %DEV_HOST%

endlocal
