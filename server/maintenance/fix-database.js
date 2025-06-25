/**
 * 修复数据库字符集的脚本
 * 主要用于确保表和列支持UTF8MB4字符集，以存储表情符号和其他特殊字符
 */

const { pool } = require('../db');

async function fixDatabaseCharset() {
  try {
    console.log('开始修复数据库字符集...');
    
    const connection = await pool.getConnection();
    
    try {
      // 获取数据库名称
      const [rows] = await connection.query('SELECT DATABASE() as dbName');
      const dbName = rows[0].dbName;
      
      console.log(`当前数据库: ${dbName}`);
      
      // 修改数据库字符集
      console.log('修改数据库字符集为utf8mb4...');
      await connection.execute(`
        ALTER DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      
      // 检查GitHub趋势表是否存在
      const [tables] = await connection.execute(`
        SHOW TABLES LIKE 'github_trending_repos'
      `);
      
      if (tables.length > 0) {
        console.log('修改github_trending_repos表字符集...');
        // 修改表字符集
        await connection.execute(`
          ALTER TABLE github_trending_repos 
          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        // 特别修改description列的字符集
        await connection.execute(`
          ALTER TABLE github_trending_repos 
          MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        console.log('✅ github_trending_repos表修复完成');
        
        // 检查github_trending_history表是否存在
        const [historyTables] = await connection.execute(`
          SHOW TABLES LIKE 'github_trending_history'
        `);
        
        if (historyTables.length > 0) {
          console.log('修改github_trending_history表字符集...');
          await connection.execute(`
            ALTER TABLE github_trending_history
            CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          console.log('✅ github_trending_history表修复完成');
        }
      } else {
        console.log('github_trending_repos表不存在，无需修复');
      }
      
      console.log('✅ 数据库字符集修复完成');
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('修复数据库字符集失败:', error);
    throw error;
  }
}

// 立即执行
fixDatabaseCharset()
  .then(() => {
    console.log('数据库字符集修复脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('修复失败:', error);
    process.exit(1);
  }); 