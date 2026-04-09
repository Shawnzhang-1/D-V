@echo off
chcp 65001 >nul
echo ========================================
echo    更新便携版
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 构建最新版本...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)
echo 构建完成！
echo.

echo [2/4] 清理旧文件...
if exist "..\data-viz-app-portable\assets" rmdir /s /q "..\data-viz-app-portable\assets"
if exist "..\data-viz-app-portable\index.html" del /q "..\data-viz-app-portable\index.html"
echo 清理完成！
echo.

echo [3/4] 复制新文件...
xcopy /e /i /y "dist\*" "..\data-viz-app-portable\"
echo 复制完成！
echo.

echo [4/4] 重新打包...
if exist "..\数据可视化应用-便携版.zip" del /q "..\数据可视化应用-便携版.zip"
powershell -Command "Compress-Archive -Path '..\data-viz-app-portable\*' -DestinationPath '..\数据可视化应用-便携版.zip' -Force"
echo 打包完成！
echo.

echo ========================================
echo    更新完成！
echo ========================================
echo.
echo 便携版位置: %cd%\..\data-viz-app-portable\
echo ZIP文件位置: %cd%\..\数据可视化应用-便携版.zip
echo.

pause
