@echo off
chcp 65001 >nul
echo ========================================
echo    更新便携版
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 检查环境...
if not exist "package.json" (
    echo [错误] 未找到 package.json，请确保在正确的目录运行
    pause
    exit /b 1
)

echo [2/5] 构建最新版本...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)
echo 构建完成！
echo.

if not exist "dist" (
    echo [错误] dist 目录不存在，构建可能失败
    pause
    exit /b 1
)

echo [3/5] 清理旧文件...
if exist "..\data-viz-app-portable\assets" rmdir /s /q "..\data-viz-app-portable\assets"
if exist "..\data-viz-app-portable\index.html" del /q "..\data-viz-app-portable\index.html"
echo 清理完成！
echo.

echo [4/5] 复制新文件...
xcopy /e /i /y "dist\*" "..\data-viz-app-portable\"
if %errorlevel% neq 0 (
    echo [错误] 复制文件失败
    pause
    exit /b 1
)
echo 复制完成！
echo.

echo [5/5] 重新打包...
if exist "..\数据可视化应用-便携版.zip" del /q "..\数据可视化应用-便携版.zip"
powershell -Command "Compress-Archive -Path '..\data-viz-app-portable\*' -DestinationPath '..\数据可视化应用-便携版.zip' -Force"
if %errorlevel% neq 0 (
    echo [警告] 打包失败，但便携版文件已更新
) else (
    echo 打包完成！
)
echo.

echo ========================================
echo    更新完成！
echo ========================================
echo.
echo 便携版位置: %cd%\..\data-viz-app-portable\
echo ZIP文件位置: %cd%\..\数据可视化应用-便携版.zip
echo.

pause
