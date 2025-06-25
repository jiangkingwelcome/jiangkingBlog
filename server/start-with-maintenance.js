/**
 * 带有维护功能的服务器启动脚本
 * 在启动API服务器之前，会先执行一些维护操作
 */

const { testConnection, initDatabase, fixDatabaseSchema } = require('./db');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

// 数据库字符集修复函数
async function fixDatabaseCharset() {
  try {
    // 通过fork子进程执行字符集修复脚本
    console.log('正在修复数据库字符集...');
    
    return new Promise((resolve, reject) => {
      const fixProcess = fork(path.join(__dirname, 'maintenance/fix-database.js'));
      
      fixProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ 数据库字符集修复成功');
          resolve(true);
        } else {
          console.error('❌ 数据库字符集修复失败');
          resolve(false); // 仍然继续，因为可能是新数据库不需要修复
        }
      });
      
      fixProcess.on('error', (err) => {
        console.error('❌ 修复过程发生错误:', err);
        resolve(false); // 仍然继续
      });
    });
  } catch (error) {
    console.error('❌ 执行数据库字符集修复失败:', error);
    return false;
  }
}

// 更新GitHub趋势数据
async function updateGithubTrending() {
  try {
    // 检查上次更新时间
    const statusPath = path.join(__dirname, 'data', 'github-trending', 'update-status.json');
    let shouldUpdate = true;
    
    if (fs.existsSync(statusPath)) {
      try {
        const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        const lastUpdate = new Date(statusData.lastUpdate);
        const now = new Date();
        const hoursSinceLastUpdate = (now - lastUpdate) / (1000 * 60 * 60);
        
        // 如果2小时内已更新，则跳过
        if (hoursSinceLastUpdate < 2) {
          console.log(`上次更新时间: ${lastUpdate.toLocaleString()}, ${Math.round(hoursSinceLastUpdate * 10) / 10} 小时前`);
          console.log('GitHub趋势数据近期已更新，跳过本次更新');
          return true;
        }
      } catch (err) {
        console.error('读取更新状态文件失败，将执行更新:', err);
      }
    }
    
    console.log('开始更新GitHub趋势数据...');
    
    // 通过fork子进程执行更新脚本
    return new Promise((resolve, reject) => {
      const updateProcess = fork(path.join(__dirname, 'tasks/updateGithubTrending.js'));
      
      updateProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ GitHub趋势数据更新成功');
          resolve(true);
        } else {
          console.error('❌ GitHub趋势数据更新失败');
          resolve(false); // 仍然继续启动
        }
      });
      
      updateProcess.on('error', (err) => {
        console.error('❌ GitHub趋势更新过程发生错误:', err);
        resolve(false); // 仍然继续
      });
    });
  } catch (error) {
    console.error('❌ 执行GitHub趋势更新失败:', error);
    return false;
  }
}

// 主函数
async function main() {
  try {
    console.log('=======================================');
    console.log('  服务器启动前执行维护操作');
    console.log('=======================================');
    
    // 测试数据库连接
    console.log('正在测试数据库连接...');
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ 数据库连接失败');
      process.exit(1);
    }
    console.log('✅ 数据库连接成功');
    
    // 初始化数据库表
    console.log('正在初始化数据库表...');
    const initialized = await initDatabase();
    if (!initialized) {
      console.error('❌ 数据库表初始化失败');
      process.exit(1);
    }
    console.log('✅ 数据库表初始化成功');
    
    // 修复数据库表结构
    console.log('正在修复数据库表结构...');
    const fixed = await fixDatabaseSchema();
    if (!fixed) {
      console.error('⚠️ 数据库表结构修复遇到问题，但将继续启动');
    } else {
      console.log('✅ 数据库表结构修复完成');
    }
    
    // 修复数据库字符集
    console.log('正在检查数据库字符集...');
    const charsetFixed = await fixDatabaseCharset();
    if (!charsetFixed) {
      console.error('⚠️ 数据库字符集修复遇到问题，但将继续启动');
    } else {
      console.log('✅ 数据库字符集检查完成');
    }
    
    // 更新GitHub趋势数据
    console.log('正在检查GitHub趋势数据...');
    const trendingUpdated = await updateGithubTrending();
    if (!trendingUpdated) {
      console.error('⚠️ GitHub趋势数据更新遇到问题，但将继续启动');
    } else {
      console.log('✅ GitHub趋势数据检查完成');
    }
    
    console.log('=======================================');
    console.log('  所有维护操作已完成，正在启动服务器');
    console.log('=======================================');
    
    // 启动服务器
    require('./index');
    
  } catch (error) {
    console.error('❌ 维护过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  console.error('❌ 启动过程中发生错误:', error);
  process.exit(1);
}); 