@echo off
echo ==============================================
echo   修复数据库字符集以支持表情符号
echo ==============================================
echo.

cd..
node maintenance/fix-database.js

echo.
echo 按任意键退出...
pause > nul 