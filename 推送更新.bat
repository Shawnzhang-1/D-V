@echo off
chcp 65001 >nul
echo ========================================
echo    推送到 GitHub (更新版本)
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 添加所有修改...
git add .
echo 完成！

echo.
echo [2/3] 提交更改...
echo.
set /p COMMIT_MSG="请输入本次修改说明: "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=更新代码
git commit -m "%COMMIT_MSG%"
echo 完成！

echo.
echo [3/3] 推送到 GitHub...
git push
echo.

if %errorlevel% equ 0 (
    echo ========================================
    echo    推送成功！
    echo ========================================
    echo.
    echo GitHub Actions 将自动构建部署
    echo 访问地址: https://shawnzhang-1.github.io/D-V/
    echo.
    echo 注意: 首次部署可能需要等待 1-2 分钟
    echo.
) else (
    echo [错误] 推送失败，请检查网络连接
)

pause
