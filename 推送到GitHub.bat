@echo off
chcp 65001 >nul
echo ========================================
echo    推送到 GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo 请确保已在 GitHub 创建仓库: data-visualization-app
echo 地址: https://github.com/new
echo.
set /p USERNAME="请输入你的 GitHub 用户名: "

echo.
echo [1/4] 初始化 Git...
if not exist ".git" (
    git init
    git branch -M main
)
echo 完成！
echo.

echo [2/4] 添加文件...
git add .
echo 完成！
echo.

echo [3/4] 提交更改...
git commit -m "Initial commit: 数据可视化应用"
echo 完成！
echo.

echo [4/4] 推送到 GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/%USERNAME%/D-V.git
git push -u origin main
echo.

if %errorlevel% equ 0 (
    echo ========================================
    echo    推送成功！
    echo ========================================
    echo.
    echo 仓库地址: https://github.com/%USERNAME%/D-V
    echo.
    echo 下一步:
    echo 1. 打开仓库 Settings ^> Pages
    echo 2. Source 选择 "GitHub Actions"
    echo 3. 等待自动部署完成
    echo 4. 访问: https://%USERNAME%.github.io/D-V/
    echo.
) else (
    echo [错误] 推送失败，请检查用户名和网络连接
)

pause
