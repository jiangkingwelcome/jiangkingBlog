@echo off
echo JiangKing博客启动脚本
echo 正在检查端口占用...

:: 检查8085端口是否被占用
netstat -ano | findstr :8085 > nul
if %errorlevel% equ 0 (
    echo 端口8085已被占用，尝试关闭占用进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8085') do (
        echo 发现进程: %%a
        taskkill /f /pid %%a
        if %errorlevel% equ 0 (
            echo 成功关闭占用进程
        ) else (
            echo 无法关闭进程，请手动关闭占用8085端口的进程
            pause
            exit /b 1
        )
    )
)

:: 运行修复资源脚本
echo 正在修复资源...
call fix-resources.bat

:: 启动服务器
echo 正在启动服务器，端口8085...
start http://localhost:8085
cd /d %~dp0
node server.js --port=8085

pause 