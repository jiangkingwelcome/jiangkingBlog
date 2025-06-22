/**
 * 修复articles表中的comment_count字段
 * 这个脚本会计算每篇文章的实际评论数，并更新到comment_count字段
 */

const { pool } = require('./db');

async function fixCommentCount() {
  try {
    console.log('='.repeat(50));
    console.log('开始修复articles表的comment_count字段...');
    console.log('='.repeat(50));
    
    const connection = await pool.getConnection();
    
    try {
      // 获取所有文章ID
      console.log('获取所有文章ID...');
      const [articles] = await connection.execute('SELECT id, title FROM articles');
      console.log(`找到 ${articles.length} 篇文章`);
      
      // 对每篇文章计算评论数并更新
      for (const article of articles) {
        console.log(`\n处理文章: ${article.id} - ${article.title}`);
        
        // 计算评论数
        const [commentResult] = await connection.execute(
          'SELECT COUNT(*) as count FROM comments WHERE article_id = ?',
          [article.id]
        );
        
        const commentCount = commentResult[0].count;
        console.log(`文章实际评论数: ${commentCount}`);
        
        // 更新评论数
        await connection.execute(
          'UPDATE articles SET comment_count = ? WHERE id = ?',
          [commentCount, article.id]
        );
        
        console.log(`✅ 文章 ${article.id} 的评论数已更新为 ${commentCount}`);
      }
      
      console.log('\n所有文章的评论数已更新');
      connection.release();
      console.log('数据库连接已释放');
      
      return true;
    } catch (error) {
      connection.release();
      console.log('数据库连接已释放（错误处理）');
      throw error;
    }
  } catch (error) {
    console.error('修复评论数时出错:', error);
    return false;
  }
}

// 执行修复并等待所有日志输出
async function runFix() {
  const result = await fixCommentCount();
  
  // 等待所有日志输出
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('='.repeat(50));
      if (result) {
        console.log('修复脚本执行成功');
      } else {
        console.log('修复脚本执行失败');
      }
      console.log('='.repeat(50));
      resolve(result);
    }, 1000);
  });
}

// 执行修复
runFix()
  .then(result => {
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('修复脚本执行失败:', error);
    process.exit(1);
  }); 