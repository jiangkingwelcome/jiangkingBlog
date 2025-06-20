const express = require('express');
const router = express.Router();
const { auth, optionalAuth, admin } = require('../middleware/auth');
const articleService = require('../services/articleService');

// 同步文章（仅限管理员）
router.post('/sync', admin, async (req, res) => {
  try {
    const { articles } = req.body;
    
    // 验证输入
    if (!articles || !Array.isArray(articles)) {
      return res.status(400).json({ message: '无效的文章数据' });
    }
    
    await articleService.syncArticles(articles);
    
    res.json({ message: '文章同步成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 增加文章阅读量
router.post('/:articleId/view', optionalAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    
    const viewCount = await articleService.incrementViewCount(articleId);
    
    res.json({ viewCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 点赞文章
router.post('/:articleId/like', auth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;
    
    const result = await articleService.likeArticle(userId, articleId);
    
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 收藏文章
router.post('/:articleId/favorite', auth, async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;
    
    const result = await articleService.favoriteArticle(userId, articleId);
    
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取文章统计信息
router.get('/:articleId/stats', optionalAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    
    // 获取文章统计信息
    const stats = await articleService.getArticleStats(articleId);
    
    // 如果用户已登录，则获取用户对文章的操作状态
    if (req.user) {
      const status = await articleService.getUserArticleStatus(req.user.id, articleId);
      return res.json({ ...stats, ...status });
    }
    
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 