/**
 * 数据库表结构修复脚本
 * 用于修复articles表缺少comment_count字段的问题
 */

const { testConnection, fixDatabaseSchema } = require('./db');

async function main() {
  console.log('=======================================');
  console.log('开始修复数据库表结构...');
  console.log('=======================================');
  
  // 测试数据库连接
  console.log('正在测试数据库连接...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ 数据库连接失败，无法修复表结构');
    process.exit(1);
  }
  console.log('✅ 数据库连接成功');
  
  // 修复表结构
  console.log('正在修复数据库表结构...');
  const fixed = await fixDatabaseSchema();
  if (fixed) {
    console.log('✅ 数据库表结构修复完成');
  } else {
    console.error('❌ 数据库表结构修复失败');
    process.exit(1);
  }
  
  console.log('=======================================');
  console.log('数据库修复脚本执行完成');
  console.log('=======================================');
  
  process.exit(0);
}

// 执行主函数
main().catch(error => {
  console.error('❌ 修复过程中发生错误:', error);
  process.exit(1);
}); 