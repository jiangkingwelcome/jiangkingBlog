const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// 基本中间件
app.use(cors());
app.use(express.json());

// 简单的日志
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server is running' });
});

// 文章统计API
app.get('/api/articles/:articleId/stats', (req, res) => {
  const { articleId } = req.params;
  res.json({
    articleId,
    viewCount: 100,
    likeCount: 10,
    favoriteCount: 5,
    hasLiked: false,
    hasFavorited: false
  });
});

// 点赞API
app.post('/api/articles/:articleId/like', (req, res) => {
  const { articleId } = req.params;
  res.json({
    success: true,
    action: 'liked',
    likeCount: 11,
    message: '点赞成功'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});