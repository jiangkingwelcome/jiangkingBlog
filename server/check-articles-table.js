/**
 * 检查articles表结构的脚本
 */

const { pool } = require('./db');

async function checkArticlesTable() {
  try {
    console.log('开始检查articles表结构...');
    
    const connection = await pool.getConnection();
    
    try {
      // 检查表是否存在
      console.log('检查articles表是否存在...');
      const [tables] = await connection.execute(`
        SHOW TABLES LIKE 'articles'
      `);
      
      if (tables.length === 0) {
        console.log('❌ articles表不存在');
        return false;
      }
      
      console.log('✅ articles表存在');
      
      // 获取表结构
      console.log('获取articles表结构...');
      const [columns] = await connection.execute(`
        DESCRIBE articles
      `);
      
      console.log('articles表结构:');
      columns.forEach(column => {
        console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(可空)' : '(非空)'} ${column.Key ? `(${column.Key})` : ''}`);
      });
      
      // 检查comment_count字段
      const commentCountField = columns.find(column => column.Field === 'comment_count');
      if (commentCountField) {
        console.log('✅ comment_count字段存在');
      } else {
        console.log('❌ comment_count字段不存在');
      }
      
      // 获取表中的数据示例
      console.log('\n获取articles表数据示例...');
      const [rows] = await connection.execute(`
        SELECT * FROM articles LIMIT 5
      `);
      
      if (rows.length > 0) {
        console.log(`找到 ${rows.length} 条记录:`);
        rows.forEach((row, index) => {
          console.log(`\n记录 #${index + 1}:`);
          for (const [key, value] of Object.entries(row)) {
            console.log(`- ${key}: ${value}`);
          }
        });
      } else {
        console.log('表中没有数据');
      }
      
      connection.release();
      return true;
    } catch (error) {
      console.error('检查表结构时出错:', error);
      connection.release();
      return false;
    }
  } catch (error) {
    console.error('获取数据库连接失败:', error);
    return false;
  }
}

// 执行检查
checkArticlesTable()
  .then(() => {
    console.log('检查完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('检查过程中发生错误:', error);
    process.exit(1);
  }); 