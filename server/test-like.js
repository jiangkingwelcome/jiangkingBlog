/**
 * 点赞功能测试脚本
 */

const { pool } = require('./db');
const articleService = require('./services/articleService');

async function testLikeArticle() {
  try {
    console.log('='.repeat(50));
    console.log('开始测试点赞功能...');
    console.log('='.repeat(50));
    
    // 测试参数
    const userId = 2; // 假设用户ID为2
    const articleId = '101b99ae-1cea-8006-aec9-e2985c944f8e'; // 使用一个存在的文章ID
    
    console.log(`测试参数: userId=${userId}, articleId=${articleId}`);
    
    // 获取当前点赞状态
    const connection = await pool.getConnection();
    
    try {
      console.log('\n检查当前点赞状态...');
      const [existingLikes] = await connection.execute(
        'SELECT id FROM user_likes WHERE user_id = ? AND article_id = ?',
        [userId, articleId]
      );
      
      const isLiked = existingLikes.length > 0;
      console.log(`当前点赞状态: ${isLiked ? '已点赞' : '未点赞'}`);
      
      // 获取当前点赞数
      const [articles] = await connection.execute(
        'SELECT like_count FROM articles WHERE id = ?',
        [articleId]
      );
      
      if (articles.length === 0) {
        console.log('文章不存在，创建文章记录...');
        await connection.execute(
          'INSERT INTO articles (id, title, like_count) VALUES (?, ?, ?)',
          [articleId, '测试文章', 0]
        );
        console.log('文章记录已创建');
      } else {
        console.log(`当前点赞数: ${articles[0].like_count}`);
      }
      
      connection.release();
      console.log('数据库连接已释放');
      
      // 测试点赞功能
      console.log('\n调用点赞服务...');
      const result = await articleService.likeArticle(userId, articleId);
      
      console.log('\n点赞服务返回结果:', result);
      console.log(`操作: ${result.action}, 新点赞数: ${result.likeCount}`);
      
      // 验证结果
      const expectedAction = isLiked ? 'unliked' : 'liked';
      if (result.action === expectedAction) {
        console.log('✅ 点赞状态切换正确');
      } else {
        console.log('❌ 点赞状态切换错误');
      }
      
      // 再次检查数据库中的点赞状态
      await verifyLikeStatus(userId, articleId, result.action === 'liked');
      
      console.log('\n点赞功能测试完成');
    } catch (error) {
      connection.release();
      console.log('数据库连接已释放（错误处理）');
      throw error;
    }
  } catch (error) {
    console.error('\n测试过程中发生错误:', error);
  }
}

// 验证数据库中的点赞状态
async function verifyLikeStatus(userId, articleId, shouldBeLiked) {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n验证数据库中的点赞状态...');
    
    // 检查点赞记录
    const [likes] = await connection.execute(
      'SELECT id FROM user_likes WHERE user_id = ? AND article_id = ?',
      [userId, articleId]
    );
    
    const isLiked = likes.length > 0;
    console.log(`数据库中的点赞状态: ${isLiked ? '已点赞' : '未点赞'}`);
    
    if (isLiked === shouldBeLiked) {
      console.log('✅ 数据库点赞状态正确');
    } else {
      console.log('❌ 数据库点赞状态错误');
    }
    
    // 检查点赞数
    const [articles] = await connection.execute(
      'SELECT like_count FROM articles WHERE id = ?',
      [articleId]
    );
    
    if (articles.length > 0) {
      console.log(`数据库中的点赞数: ${articles[0].like_count}`);
    } else {
      console.log('❌ 文章记录不存在');
    }
    
    connection.release();
    console.log('数据库连接已释放');
  } catch (error) {
    connection.release();
    console.log('数据库连接已释放（错误处理）');
    console.error('验证点赞状态时出错:', error);
  }
}

// 执行测试并等待所有日志输出
async function runTest() {
  await testLikeArticle();
  
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