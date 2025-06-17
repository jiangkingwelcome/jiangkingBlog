# JiangKing博客启动脚本 - PowerShell版本
Write-Host "JiangKing博客启动脚本" -ForegroundColor Cyan
Write-Host "正在检查端口占用..." -ForegroundColor Yellow

# 检查8085端口是否被占用
$portInUse = Get-NetTCPConnection -LocalPort 8085 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "端口8085已被占用，尝试关闭占用进程..." -ForegroundColor Red
    foreach ($process in $portInUse) {
        $processId = $process.OwningProcess
        $processName = (Get-Process -Id $processId).ProcessName
        Write-Host "发现进程: $processId ($processName)" -ForegroundColor Yellow
        
        try {
            Stop-Process -Id $processId -Force
            Write-Host "成功关闭占用进程" -ForegroundColor Green
        } catch {
            Write-Host "无法关闭进程，请手动关闭占用8085端口的进程" -ForegroundColor Red
            Read-Host "按Enter键退出"
            exit 1
        }
    }
}

# 运行修复资源脚本
Write-Host "正在修复资源..." -ForegroundColor Yellow
& "$PSScriptRoot\fix-resources.bat"

# 启动服务器
Write-Host "正在启动服务器，端口8085..." -ForegroundColor Green
Start-Process "http://localhost:8085"
Set-Location -Path $PSScriptRoot
node server.js --port=8085

Read-Host "按Enter键退出" 