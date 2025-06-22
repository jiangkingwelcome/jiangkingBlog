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
  console.log(`======== 点赞文章服务 ========`);
  console.log(`用户ID: ${userId}, 文章ID: ${articleId}`);
  
  try {
    const connection = await pool.getConnection();
    console.log('获取数据库连接成功');
    
    try {
      await connection.beginTransaction();
      console.log('开始数据库事务');
      
      // 检查是否已经点赞
      console.log('检查用户是否已经点赞...');
      const [existingLikes] = await connection.execute(
        'SELECT id FROM user_likes WHERE user_id = ? AND article_id = ?',
        [userId, articleId]
      );
      
      console.log('点赞记录查询结果:', existingLikes);
      let action = '';
      
      if (existingLikes.length === 0) {
        console.log('未找到点赞记录，用户将进行点赞操作');
        // 未点赞，添加点赞
        await connection.execute(
          'INSERT INTO user_likes (user_id, article_id) VALUES (?, ?)',
          [userId, articleId]
        );
        console.log('点赞记录已添加');
        
        // 增加文章点赞数
        await connection.execute(
          'UPDATE articles SET like_count = like_count + 1 WHERE id = ?',
          [articleId]
        );
        console.log('文章点赞数已增加');
        
        action = 'liked';
      } else {
        console.log('找到点赞记录，用户将取消点赞');
        // 已点赞，取消点赞
        await connection.execute(
          'DELETE FROM user_likes WHERE user_id = ? AND article_id = ?',
          [userId, articleId]
        );
        console.log('点赞记录已删除');
        
        // 减少文章点赞数
        await connection.execute(
          'UPDATE articles SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?',
          [articleId]
        );
        console.log('文章点赞数已减少');
        
        action = 'unliked';
      }
      
      // 获取最新点赞数
      console.log('获取更新后的点赞数...');
      const [result] = await connection.execute(
        'SELECT like_count FROM articles WHERE id = ?',
        [articleId]
      );
      
      console.log('最新点赞数查询结果:', result);
      
      await connection.commit();
      console.log('数据库事务已提交');
      
      const response = {
        action,
        likeCount: result[0].like_count
      };
      
      console.log('点赞操作处理完成，返回结果:', response);
      return response;
    } catch (error) {
      await connection.rollback();
      console.error('数据库事务执行失败，已回滚:', error);
      throw error;
    } finally {
      connection.release();
      console.log('数据库连接已释放');
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

// 获取文章点赞数
async function getArticleLikeCount(articleId) {
  try {
    const [articles] = await pool.execute(
      'SELECT like_count FROM articles WHERE id = ?',
      [articleId]
    );
    
    if (articles.length === 0) {
      return 0;
    }
    
    return articles[0].like_count;
  } catch (error) {
    console.error('获取文章点赞数失败:', error);
    return 0;
  }
}

// 获取文章收藏数
async function getArticleFavoriteCount(articleId) {
  try {
    const [articles] = await pool.execute(
      'SELECT favorite_count FROM articles WHERE id = ?',
      [articleId]
    );
    
    if (articles.length === 0) {
      return 0;
    }
    
    return articles[0].favorite_count;
  } catch (error) {
    console.error('获取文章收藏数失败:', error);
    return 0;
  }
}

// 获取文章评论
async function getArticleComments(articleId, { page = 1, limit = 10 } = {}) {
  try {
    const offset = (page - 1) * limit;
    
    // 获取评论总数
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM comments WHERE article_id = ? AND parent_id IS NULL',
      [articleId]
    );
    const total = countResult[0].total;
    
    // 获取评论列表
    const [comments] = await pool.execute(
      `SELECT c.id, c.content, c.created_at, c.like_count,
              u.id as user_id, u.username, u.avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.article_id = ? AND c.parent_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [articleId, limit, offset]
    );
    
    // 获取每个评论的回复
    for (const comment of comments) {
      const [replies] = await pool.execute(
        `SELECT c.id, c.content, c.created_at, c.like_count,
                u.id as user_id, u.username, u.avatar
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = ?
         ORDER BY c.created_at ASC
         LIMIT 10`,
        [comment.id]
      );
      
      // 格式化评论数据
      comment.user = {
        id: comment.user_id,
        username: comment.username,
        avatar: comment.avatar
      };
      
      // 格式化回复数据
      comment.replies = replies.map(reply => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.created_at,
        likeCount: reply.like_count,
        user: {
          id: reply.user_id,
          username: reply.username,
          avatar: reply.avatar
        }
      }));
      
      // 删除冗余字段
      delete comment.user_id;
      delete comment.username;
      delete comment.avatar;
      
      // 重命名字段以符合前端命名规范
      comment.createdAt = comment.created_at;
      delete comment.created_at;
      
      comment.likeCount = comment.like_count;
      delete comment.like_count;
    }
    
    return {
      data: comments,
      total,
      page,
      limit,
      hasMore: total > page * limit
    };
  } catch (error) {
    console.error('获取文章评论失败:', error);
    throw error;
  }
}

// 添加评论
async function addComment(articleId, userId, content) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 添加评论
      const [result] = await connection.execute(
        'INSERT INTO comments (article_id, user_id, content) VALUES (?, ?, ?)',
        [articleId, userId, content]
      );
      
      const commentId = result.insertId;
      
      // 增加文章评论数
      await connection.execute(
        'UPDATE articles SET comment_count = comment_count + 1 WHERE id = ?',
        [articleId]
      );
      
      // 获取评论详情
      const [comments] = await connection.execute(
        `SELECT c.id, c.content, c.created_at, c.like_count,
                u.id as user_id, u.username, u.avatar
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [commentId]
      );
      
      await connection.commit();
      
      if (comments.length === 0) {
        throw new Error('评论创建失败');
      }
      
      const comment = comments[0];
      
      // 格式化评论数据
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        likeCount: comment.like_count,
        user: {
          id: comment.user_id,
          username: comment.username,
          avatar: comment.avatar
        },
        replies: []
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('添加评论失败:', error);
    throw error;
  }
}

// 回复评论
async function replyComment(commentId, userId, content) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 获取原评论信息
      const [parentComments] = await connection.execute(
        'SELECT article_id FROM comments WHERE id = ?',
        [commentId]
      );
      
      if (parentComments.length === 0) {
        throw new Error('原评论不存在');
      }
      
      const articleId = parentComments[0].article_id;
      
      // 添加回复
      const [result] = await connection.execute(
        'INSERT INTO comments (article_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
        [articleId, userId, content, commentId]
      );
      
      const replyId = result.insertId;
      
      // 增加文章评论数
      await connection.execute(
        'UPDATE articles SET comment_count = comment_count + 1 WHERE id = ?',
        [articleId]
      );
      
      // 获取回复详情
      const [replies] = await connection.execute(
        `SELECT c.id, c.content, c.created_at, c.like_count,
                u.id as user_id, u.username, u.avatar
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [replyId]
      );
      
      await connection.commit();
      
      if (replies.length === 0) {
        throw new Error('回复创建失败');
      }
      
      const reply = replies[0];
      
      // 格式化回复数据
      return {
        id: reply.id,
        content: reply.content,
        createdAt: reply.created_at,
        likeCount: reply.like_count,
        user: {
          id: reply.user_id,
          username: reply.username,
          avatar: reply.avatar
        }
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('回复评论失败:', error);
    throw error;
  }
}

// 点赞评论
async function likeComment(commentId, userId) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 检查评论是否存在
      const [comments] = await connection.execute(
        'SELECT id FROM comments WHERE id = ?',
        [commentId]
      );
      
      if (comments.length === 0) {
        throw new Error('评论不存在');
      }
      
      // 检查是否已经点赞
      const [existingLikes] = await connection.execute(
        'SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?',
        [userId, commentId]
      );
      
      let action = '';
      
      if (existingLikes.length === 0) {
        // 未点赞，添加点赞
        await connection.execute(
          'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)',
          [userId, commentId]
        );
        
        // 增加评论点赞数
        await connection.execute(
          'UPDATE comments SET like_count = like_count + 1 WHERE id = ?',
          [commentId]
        );
        
        action = 'liked';
      } else {
        // 已点赞，取消点赞
        await connection.execute(
          'DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?',
          [userId, commentId]
        );
        
        // 减少评论点赞数
        await connection.execute(
          'UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?',
          [commentId]
        );
        
        action = 'unliked';
      }
      
      // 获取最新点赞数
      const [result] = await connection.execute(
        'SELECT like_count FROM comments WHERE id = ?',
        [commentId]
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
    console.error('点赞评论失败:', error);
    throw error;
  }
}

module.exports = {
  syncArticles,
  incrementViewCount,
  likeArticle,
  favoriteArticle,
  getArticleStats,
  getUserArticleStatus,
  getArticleLikeCount,
  getArticleFavoriteCount,
  getArticleComments,
  addComment,
  replyComment,
  likeComment
}; 