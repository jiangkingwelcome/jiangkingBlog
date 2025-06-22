/**
 * 带维护的服务器启动脚本
 * 先运行数据库维护脚本，然后启动服务器
 */

const { spawn } = require('child_process');
const path = require('path');

// 运行维护脚本
async function runMaintenance() {
  return new Promise((resolve, reject) => {
    console.log('正在运行数据库维护脚本...');
    
    const maintenanceProcess = spawn('node', [path.join(__dirname, 'maintenance', 'fix-database.js')], {
      stdio: 'inherit'
    });
    
    maintenanceProcess.on('close', (code) => {
      if (code === 0) {
        console.log('数据库维护脚本执行成功');
        resolve(true);
      } else {
        console.error(`数据库维护脚本执行失败，退出码: ${code}`);
        resolve(false);
      }
    });
    
    maintenanceProcess.on('error', (error) => {
      console.error('启动维护脚本时出错:', error);
      reject(error);
    });
  });
}

// 启动服务器
function startServer() {
  console.log('正在启动服务器...');
  
  const serverProcess = spawn('node', [path.join(__dirname, 'index.js')], {
    stdio: 'inherit'
  });
  
  serverProcess.on('close', (code) => {
    console.log(`服务器已关闭，退出码: ${code}`);
    process.exit(code);
  });
  
  serverProcess.on('error', (error) => {
    console.error('启动服务器时出错:', error);
    process.exit(1);
  });
  
  // 处理进程信号
  process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    serverProcess.kill('SIGTERM');
  });
}

// 主函数
async function main() {
  try {
    console.log('='.repeat(50));
    console.log('启动带维护的服务器...');
    console.log('='.repeat(50));
    
    // 运行维护脚本
    const maintenanceSuccess = await runMaintenance();
    
    if (!maintenanceSuccess) {
      console.warn('维护脚本执行失败，但仍将继续启动服务器');
    }
    
    // 启动服务器
    startServer();
  } catch (error) {
    console.error('启动过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 