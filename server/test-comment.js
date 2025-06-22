/**
 * 评论功能测试脚本
 */

const { pool } = require('./db');
const articleService = require('./services/articleService');

async function testAddComment() {
  try {
    console.log('='.repeat(50));
    console.log('开始测试评论功能...');
    console.log('='.repeat(50));
    
    // 测试参数
    const userId = 2; // 假设用户ID为2
    const articleId = '101b99ae-1cea-8006-aec9-e2985c944f8e'; // 使用一个存在的文章ID
    const content = '这是一条测试评论 - ' + new Date().toISOString();
    
    console.log(`测试参数: userId=${userId}, articleId=${articleId}`);
    console.log(`评论内容: ${content}`);
    
    // 检查文章是否存在
    const connection = await pool.getConnection();
    
    try {
      console.log('\n检查文章是否存在...');
      const [articles] = await connection.execute(
        'SELECT * FROM articles WHERE id = ?',
        [articleId]
      );
      
      if (articles.length === 0) {
        console.log('文章不存在，创建文章记录...');
        await connection.execute(
          'INSERT INTO articles (id, title, comment_count) VALUES (?, ?, ?)',
          [articleId, '测试文章', 0]
        );
        console.log('文章记录已创建');
      } else {
        console.log(`文章存在，当前评论数: ${articles[0].comment_count || 0}`);
      }
      
      // 获取当前评论数
      const [commentCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM comments WHERE article_id = ?',
        [articleId]
      );
      
      console.log(`数据库中当前评论数: ${commentCount[0].count}`);
      
      connection.release();
      console.log('数据库连接已释放');
      
      // 测试添加评论
      console.log('\n调用添加评论服务...');
      const comment = await articleService.addComment(articleId, userId, content);
      
      console.log('\n评论添加成功，返回结果:');
      console.log(JSON.stringify(comment, null, 2));
      
      // 验证评论是否添加成功
      await verifyComment(articleId, userId, content);
      
      console.log('\n评论功能测试完成');
    } catch (error) {
      connection.release();
      console.log('数据库连接已释放（错误处理）');
      throw error;
    }
  } catch (error) {
    console.error('\n测试过程中发生错误:', error);
  }
}

// 验证评论是否添加成功
async function verifyComment(articleId, userId, content) {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n验证评论是否添加成功...');
    
    // 检查评论记录
    const [comments] = await connection.execute(
      'SELECT * FROM comments WHERE article_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
      [articleId, userId]
    );
    
    if (comments.length > 0) {
      const comment = comments[0];
      console.log('找到最新评论:');
      console.log(`- ID: ${comment.id}`);
      console.log(`- 内容: ${comment.content}`);
      console.log(`- 创建时间: ${comment.created_at}`);
      
      if (comment.content === content) {
        console.log('✅ 评论内容匹配');
      } else {
        console.log('❌ 评论内容不匹配');
      }
    } else {
      console.log('❌ 未找到评论记录');
    }
    
    // 检查文章评论数是否更新
    const [articles] = await connection.execute(
      'SELECT comment_count FROM articles WHERE id = ?',
      [articleId]
    );
    
    if (articles.length > 0) {
      console.log(`文章当前评论数: ${articles[0].comment_count}`);
    } else {
      console.log('❌ 文章记录不存在');
    }
    
    connection.release();
    console.log('数据库连接已释放');
  } catch (error) {
    connection.release();
    console.log('数据库连接已释放（错误处理）');
    console.error('验证评论时出错:', error);
  }
}

// 执行测试并等待所有日志输出
async function runTest() {
  await testAddComment();
  
  // 等待所有日志输出
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('='.repeat(50));
      console.log('测试脚本执行完成');
      console.log('='.repeat(50));
      resolve();
    }, 1000);
  });
}

// 执行测试
runTest()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
  }); 