@echo off
chcp 65001 >nul
echo ========================================
echo    数据可视化应用启动器
echo ========================================
echo.

REM 设置 Node.js 路径（Trae IDE 内置）
set PATH=c:\Users\Administrator\.trae-cn\sdks\versions\node\current;%PATH%

cd /d "%~dp0"

echo 正在检查 Node.js...
node -v
echo.

echo 正在启动开发服务器...
echo 启动后请在浏览器打开显示的地址（如 http://localhost:3000/）
echo.
npm run dev
pause
