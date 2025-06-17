@echo off
chcp 65001 > nul
echo ===== JiangKing博客资源修复工具 =====
echo 正在检查并关闭占用端口的进程...

:: 查找并杀掉占用8084端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8084 ^| findstr LISTENING 2^>nul') do (
    echo 发现进程 %%a 占用8084端口，正在终止...
    taskkill /F /PID %%a 2>nul
    timeout /t 1 /nobreak > nul
)

:: 查找并杀掉占用8085端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8085 ^| findstr LISTENING 2^>nul') do (
    echo 发现进程 %%a 占用8085端口，正在终止...
    taskkill /F /PID %%a 2>nul
    timeout /t 1 /nobreak > nul
)

echo 正在创建资源目录...

:: 创建必要的目录
mkdir dist 2>nul
mkdir dist\assets 2>nul
mkdir dist\assets\images 2>nul
mkdir dist\assets\images\blog 2>nul
mkdir dist\assets\js 2>nul
mkdir dist\assets\font 2>nul
mkdir dist\assets\css 2>nul
mkdir dist\js 2>nul

:: 创建默认光标文件
echo 正在创建默认光标文件...
copy nul dist\assets\images\blog\default.cur >nul 2>nul
copy nul dist\assets\images\blog\pointer.cur >nul 2>nul

:: 创建默认头像文件 - 使用一个简单的1x1像素透明PNG
echo 正在创建默认头像文件...
echo iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII= > temp.b64
certutil -decode temp.b64 dist\assets\images\blog\avatar.jpg >nul 2>nul
del temp.b64

:: 创建空白JS和CSS文件
echo 正在创建空白JS和CSS文件...
echo // 日志记录脚本 > dist\assets\js\log.min.js
echo console.log("JiangKing Blog - 已加载本地资源"); >> dist\assets\js\log.min.js

echo /* 基本字体样式 */ > dist\assets\font\font.min.css
echo body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; } >> dist\assets\font\font.min.css

echo 资源文件创建完成，正在构建项目...

:: 构建项目
call npm run build

if %errorlevel% neq 0 (
    echo 构建失败，请检查错误信息
    pause
    exit /b 1
)

echo 构建完成，正在启动开发服务器...

:: 打开浏览器
start http://localhost:8085

echo 正在修复资源文件...

:: 创建必要的目录
if not exist "dist\assets\font" mkdir "dist\assets\font"
if not exist "dist\assets\images\blog" mkdir "dist\assets\images\blog"
if not exist "dist\assets\js" mkdir "dist\assets\js"
if not exist "dist\assets\css" mkdir "dist\assets\css"
if not exist "dist\js" mkdir "dist\js"

:: 创建空的字体文件
echo /* 本地替代字体文件 */ > "dist\assets\font\font.min.css"
echo 已创建本地字体文件

:: 创建空的日志文件
echo /* 本地替代日志文件 */ > "dist\assets\js\log.min.js"
echo console.log('已加载本地日志文件'); >> "dist\assets\js\log.min.js"
echo 已创建本地日志文件

:: 创建空的头像图片文件
if not exist "dist\assets\avatar.jpg" (
    echo 创建默认头像文件...
    copy "dist\assets\images\blog\avatar.jpg" "dist\assets\avatar.jpg" > nul 2>&1
    if not exist "dist\assets\images\blog\avatar.jpg" (
        echo ^<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"^>^<circle cx="50" cy="50" r="50" fill="#6366f1"/^>^<text x="50" y="60" font-size="40" text-anchor="middle" fill="white"^>J^</text^>^</svg^> > "dist\assets\avatar.jpg.svg"
        rename "dist\assets\avatar.jpg.svg" "avatar.jpg"
    )
)
echo 已创建本地头像文件

:: 创建光标文件
echo 创建光标样式文件...
echo body { cursor: auto !important; } > "dist\assets\css\cursor.css"
echo a, button, [role="button"] { cursor: pointer !important; } >> "dist\assets\css\cursor.css"
echo 已创建本地光标样式文件

:: 复制翻译API修复脚本到dist目录
echo 复制翻译API修复脚本...
copy "src\js\translate-api-fix.js" "dist\js\translate-api-fix.js" > nul 2>&1
echo 已复制翻译API修复脚本

:: 修改HTML文件中的CDN引用
echo 正在修改HTML文件中的CDN引用...

:: 处理dist/index.html
if exist "dist\index.html" (
    echo 处理dist\index.html...
    powershell -Command "(Get-Content -Encoding UTF8 'dist\index.html') -replace 'https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js', '/assets/js/anime.min.js' | Set-Content -Encoding UTF8 'dist\index.html'"
    
    :: 添加翻译API修复脚本引用
    powershell -Command "(Get-Content -Encoding UTF8 'dist\index.html') -replace '<script src=\"js/error-handler.js\"></script>', '<script src=\"js/error-handler.js\"></script><script src=\"js/translate-api-fix.js\"></script>' | Set-Content -Encoding UTF8 'dist\index.html'"
)

:: 处理dist/blog/index.html
if exist "dist\blog\index.html" (
    echo 处理dist\blog\index.html...
    powershell -Command "(Get-Content -Encoding UTF8 'dist\blog\index.html') -replace 'https://cdn.jsdelivr.net', '/assets' | Set-Content -Encoding UTF8 'dist\blog\index.html'"
    
    :: 添加翻译API修复脚本引用
    powershell -Command "(Get-Content -Encoding UTF8 'dist\blog\index.html') -replace '</head>', '<script src=\"/js/translate-api-fix.js\"></script></head>' | Set-Content -Encoding UTF8 'dist\blog\index.html'"
)

:: 下载anime.js库
if not exist "dist\assets\js\anime.min.js" (
    echo 下载anime.js库...
    powershell -Command "Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js' -OutFile 'dist\assets\js\anime.min.js'"
    if not exist "dist\assets\js\anime.min.js" (
        echo 下载失败，创建本地替代文件...
        echo /* 本地替代anime.js文件 */ > "dist\assets\js\anime.min.js"
        echo window.anime = function(params) { console.log('动画参数:', params); return { pause: function() {}, play: function() {} }; }; >> "dist\assets\js\anime.min.js"
    )
)

echo 资源修复完成！ 