@echo off
setlocal enabledelayedexpansion

echo.
echo ================================================================
echo           Push to GitHub
echo ================================================================
echo.

cd /d "%~dp0"

echo [Step 1/5] Checking for changes...
git status --porcelain >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('git status --porcelain') do (
        goto :has_changes
    )
    echo.
    echo No changes detected, nothing to push.
    echo.
    pause
    exit /b 0
)

:has_changes
echo.
echo [Step 2/5] Showing file changes...
git status --short

echo.
echo [Step 3/5] Adding all changes...
git add .

echo.
echo [Step 4/5] Committing changes...
for /f "tokens=*" %%i in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set "timestamp=%%i"
git commit -m "auto: Update !timestamp!"

echo.
echo [Step 5/5] Pushing to GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo           Push successful!
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo           Push failed, please check network or permissions
    echo ================================================================
)

echo.
pause
