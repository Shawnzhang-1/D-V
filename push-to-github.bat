@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo.
echo ================================================================
echo           自动推送更新到 GitHub
echo ================================================================
echo.

cd /d "%~dp0"

echo [步骤 1/5] 检查是否有更改...
git status --porcelain >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('git status --porcelain') do (
        goto :has_changes
    )
    echo.
    echo 没有检测到任何更改，无需推送。
    echo.
    pause
    exit /b 0
)

:has_changes
echo.
echo [步骤 2/5] 显示文件变更...
git status --short

echo.
echo [步骤 3/5] 添加所有更改...
git add .

echo.
echo [步骤 4/5] 提交更改...
for /f "tokens=*" %%i in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set "timestamp=%%i"
git commit -m "auto: 自动更新 !timestamp!"

echo.
echo [步骤 5/5] 推送到 GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo           推送成功!
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo           推送失败，请检查网络连接或权限
    echo ================================================================
)

echo.
pause
