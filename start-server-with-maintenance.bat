@echo off
echo ==============================================
echo   启动服务器（带维护模式）
echo ==============================================
echo.

cd server
node start-with-maintenance.js

echo.
echo 服务器已终止，按任意键退出...
pause > nul 