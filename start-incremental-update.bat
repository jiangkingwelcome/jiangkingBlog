@echo off
chcp 65001 >nul
echo ========================================
echo      博客增量自动更新服务
echo ========================================
echo.
echo 请选择运行模式：
echo [1] 开发环境 (5分钟间隔)
echo [2] 生产环境 (30分钟间隔) 
echo [3] 测试环境 (1分钟间隔)
echo [4] 退出
echo.
set /p choice=请输入选择 (1-4): 

if "%choice%"=="1" (
    echo.
    echo 🚀 启动开发环境增量更新服务...
    echo 📝 特性：增量更新、原子操作、智能构建
    echo ⏱️  更新间隔：5分钟
    echo 📁 备份策略：最多保留5个备份
    echo.
    npm run incremental-update:dev
) else if "%choice%"=="2" (
    echo.
    echo 🚀 启动生产环境增量更新服务...
    echo 📝 特性：增量更新、原子操作、智能构建
    echo ⏱️  更新间隔：30分钟
    echo 📁 备份策略：最多保留5个备份
    echo.
    npm run incremental-update:prod
) else if "%choice%"=="3" (
    echo.
    echo 🚀 启动测试环境增量更新服务...
    echo 📝 特性：增量更新、原子操作、智能构建
    echo ⏱️  更新间隔：1分钟
    echo 📁 备份策略：最多保留5个备份
    echo.
    npm run incremental-update:test
) else if "%choice%"=="4" (
    echo 👋 再见！
    exit /b 0
) else (
    echo ❌ 无效选择，请重新运行脚本
    pause
    exit /b 1
)

echo.
echo 按任意键退出...
pause >nul