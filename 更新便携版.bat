@echo off
echo ========================================
echo    Update Portable Version
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Checking environment...
if not exist "package.json" (
    echo [ERROR] package.json not found, please run in correct directory
    pause
    exit /b 1
)

echo [2/5] Building latest version...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo Build completed!
echo.

if not exist "dist" (
    echo [ERROR] dist directory not found, build may have failed
    pause
    exit /b 1
)

echo [3/5] Cleaning old files...
if exist "..\data-viz-app-portable\assets" rmdir /s /q "..\data-viz-app-portable\assets"
if exist "..\data-viz-app-portable\index.html" del /q "..\data-viz-app-portable\index.html"
echo Cleanup completed!
echo.

echo [4/5] Copying new files...
xcopy /e /i /y "dist\*" "..\data-viz-app-portable\"
if %errorlevel% neq 0 (
    echo [ERROR] Copy failed
    pause
    exit /b 1
)
echo Copy completed!
echo.

echo [5/5] Creating ZIP package...
if exist "..\data-viz-app-portable.zip" del /q "..\data-viz-app-portable.zip"
powershell -Command "Compress-Archive -Path '..\data-viz-app-portable\*' -DestinationPath '..\data-viz-app-portable.zip' -Force"
if %errorlevel% neq 0 (
    echo [WARNING] ZIP creation failed, but portable files have been updated
) else (
    echo ZIP created!
)
echo.

echo ========================================
echo    Update completed!
echo ========================================
echo.
echo Portable version: %cd%\..\data-viz-app-portable\
echo ZIP file: %cd%\..\data-viz-app-portable.zip
echo.

pause
