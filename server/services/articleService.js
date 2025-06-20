const { pool } = require('../db');

// 同步文章
async function syncArticles(articles) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      for (const article of articles) {
        // 检查文章是否已存在
        const [existingArticles] = await connection.execute(
          'SELECT id FROM articles WHERE id = ?',
          [article.id]
        );
        
        if (existingArticles.length === 0) {
          // 文章不存在，插入新文章
          await connection.execute(
            'INSERT INTO articles (id, title) VALUES (?, ?)',
            [article.id, article.title]
          );
        } else {
          // 文章存在，更新标题
          await connection.execute(
            'UPDATE articles SET title = ? WHERE id = ?',
            [article.title, article.id]
          );
        }
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('同步文章失败:', error);
    throw error;
  }
}

// 增加阅读量
async function incrementViewCount(articleId) {
  try {
    // 检查文章是否存在
    const [articles] = await pool.execute(
      'SELECT id FROM articles WHERE id = ?',
      [articleId]
    );
    
    if (articles.length === 0) {
      // 文章不存在，创建文章
      await pool.execute(
        'INSERT INTO articles (id, view_count) VALUES (?, 1)',
        [articleId]
      );
      return 1;
    } else {
      // 文章存在，增加阅读量
      await pool.execute(
        'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
        [articleId]
      );
      
      // 获取最新阅读量
      const [result] = await pool.execute(
        'SELECT view_count FROM articles WHERE id = ?',
        [articleId]
      );
      
      return result[0].view_count;
    }
  } catch (error) {
    console.error('增加阅读量失败:', error);
    throw error;
  }
}

// 点赞文章
async function likeArticle(userId, articleId) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 检查是否已经点赞
      const [existingLikes] = await connection.execute(
        'SELECT id FROM user_likes WHERE user_id = ? AND article_id = ?',
        [userId, articleId]
      );
      
      let action = '';
      
      if (existingLikes.length === 0) {
        // 未点赞，添加点赞
        await connection.execute(
          'INSERT INTO user_likes (user_id, article_id) VALUES (?, ?)',
          [userId, articleId]
        );
        
        // 增加文章点赞数
        await connection.execute(
          'UPDATE articles SET like_count = like_count + 1 WHERE id = ?',
          [articleId]
        );
        
        action = 'liked';
      } else {
        // 已点赞，取消点赞
        await connection.execute(
          'DELETE FROM user_likes WHERE user_id = ? AND article_id = ?',
          [userId, articleId]
        );
        
        // 减少文章点赞数
        await connection.execute(
          'UPDATE articles SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?',
          [articleId]
        );
        
        action = 'unliked';
      }
      
      // 获取最新点赞数
      const [result] = await connection.execute(
        'SELECT like_count FROM articles WHERE id = ?',
        [articleId]
      );
      
      await connection.commit();
      
      return {
        action,
        likeCount: result[0].like_count
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('点赞文章失败:', error);
    throw error;
  }
}

// 收藏文章
async function favoriteArticle(userId, articleId) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 检查是否已经收藏
      const [existingFavorites] = await connection.execute(
        'SELECT id FROM user_favorites WHERE user_id = ? AND article_id = ?',
        [userId, articleId]
      );
      
      let action = '';
      
      if (existingFavorites.length === 0) {
        // 未收藏，添加收藏
        await connection.execute(
          'INSERT INTO user_favorites (user_id, article_id) VALUES (?, ?)',
          [userId, articleId]
        );
        
        // 增加文章收藏数
        await connection.execute(
          'UPDATE articles SET favorite_count = favorite_count + 1 WHERE id = ?',
          [articleId]
        );
        
        action = 'favorited';
      } else {
        // 已收藏，取消收藏
        await connection.execute(
          'DELETE FROM user_favorites WHERE user_id = ? AND article_id = ?',
          [userId, articleId]
        );
        
        // 减少文章收藏数
        await connection.execute(
          'UPDATE articles SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = ?',
          [articleId]
        );
        
        action = 'unfavorited';
      }
      
      // 获取最新收藏数
      const [result] = await connection.execute(
        'SELECT favorite_count FROM articles WHERE id = ?',
        [articleId]
      );
      
      await connection.commit();
      
      return {
        action,
        favoriteCount: result[0].favorite_count
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('收藏文章失败:', error);
    throw error;
  }
}

// 获取文章统计信息
async function getArticleStats(articleId) {
  try {
    const [articles] = await pool.execute(
      'SELECT id, title, view_count, like_count, favorite_count FROM articles WHERE id = ?',
      [articleId]
    );
    
    if (articles.length === 0) {
      return {
        id: articleId,
        viewCount: 0,
        likeCount: 0,
        favoriteCount: 0
      };
    }
    
    const article = articles[0];
    
    return {
      id: article.id,
      title: article.title,
      viewCount: article.view_count,
      likeCount: article.like_count,
      favoriteCount: article.favorite_count
    };
  } catch (error) {
    console.error('获取文章统计信息失败:', error);
    throw error;
  }
}

// 获取用户对文章的操作状态
async function getUserArticleStatus(userId, articleId) {
  try {
    // 检查是否点赞
    const [likes] = await pool.execute(
      'SELECT id FROM user_likes WHERE user_id = ? AND article_id = ?',
      [userId, articleId]
    );
    
    // 检查是否收藏
    const [favorites] = await pool.execute(
      'SELECT id FROM user_favorites WHERE user_id = ? AND article_id = ?',
      [userId, articleId]
    );
    
    return {
      hasLiked: likes.length > 0,
      hasFavorited: favorites.length > 0
    };
  } catch (error) {
    console.error('获取用户文章状态失败:', error);
    throw error;
  }
}

module.exports = {
  syncArticles,
  incrementViewCount,
  likeArticle,
  favoriteArticle,
  getArticleStats,
  getUserArticleStatus
}; 