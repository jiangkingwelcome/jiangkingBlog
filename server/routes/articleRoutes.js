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
    console.error('点赞文章失败:', error);
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

// 获取文章列表
router.get('/', async (req, res) => {
  try {
    const articles = await articleService.getArticles(req.query);
    res.json(articles);
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 获取单篇文章
router.get('/:id', async (req, res) => {
  try {
    const article = await articleService.getArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }
    res.json(article);
  } catch (error) {
    console.error('获取文章详情失败:', error);
    res.status(500).json({ error: '获取文章详情失败' });
  }
});

// 获取文章评论
router.get('/:id/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const comments = await articleService.getArticleComments(req.params.id, { page, limit });
    res.json(comments);
  } catch (error) {
    console.error('获取文章评论失败:', error);
    res.status(500).json({ error: '获取文章评论失败' });
  }
});

// 添加评论
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '评论内容不能为空' });
    }
    
    const comment = await articleService.addComment(req.params.id, req.user.id, content);
    res.status(201).json(comment);
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ error: '添加评论失败' });
  }
});

// 回复评论
router.post('/comments/:commentId/replies', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '回复内容不能为空' });
    }
    
    const reply = await articleService.replyComment(req.params.commentId, req.user.id, content);
    res.status(201).json(reply);
  } catch (error) {
    console.error('回复评论失败:', error);
    res.status(500).json({ error: '回复评论失败' });
  }
});

// 点赞评论
router.post('/comments/:commentId/like', auth, async (req, res) => {
  try {
    const result = await articleService.likeComment(req.params.commentId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('点赞评论失败:', error);
    res.status(500).json({ error: '点赞评论失败' });
  }
});

module.exports = router; 