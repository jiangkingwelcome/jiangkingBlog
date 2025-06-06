@echo off
echo ========================================
echo      博客自动更新服务启动脚本
echo ========================================
echo.
echo 请选择运行环境：
echo 1. 开发环境 (5分钟间隔)
echo 2. 生产环境 (30分钟间隔)
echo 3. 测试环境 (1分钟间隔)
echo 4. 退出
echo.
set /p choice=请输入选择 (1-4): 

if "%choice%"=="1" (
    echo 启动开发环境自动更新服务...
    npm run auto-update:dev
) else if "%choice%"=="2" (
    echo 启动生产环境自动更新服务...
    npm run auto-update:prod
) else if "%choice%"=="3" (
    echo 启动测试环境自动更新服务...
    npm run auto-update:test
) else if "%choice%"=="4" (
    echo 退出脚本
    exit /b 0
) else (
    echo 无效选择，请重新运行脚本
    pause
    exit /b 1
)

pause