const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

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
  const authHeader = req.header('Authorization');
  
  // 检查是否有认证头
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录'
    });
  }
  
  // 如果有认证头，返回成功
  res.json({
    success: true,
    action: 'liked',
    likeCount: 11,
    message: '点赞成功'
  });
});

// 收藏API
app.post('/api/articles/:articleId/favorite', (req, res) => {
  const { articleId } = req.params;
  const authHeader = req.header('Authorization');
  
  // 检查是否有认证头
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录'
    });
  }
  
  // 如果有认证头，返回成功
  res.json({
    success: true,
    action: 'favorited',
    favoriteCount: 6,
    message: '收藏成功'
  });
});

// 用户登录API
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  
  // 简单验证
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: '邮箱和密码都是必填的' 
    });
  }
  
  // 模拟登录成功
  if (email && password) {
    return res.json({
      success: true,
      message: '登录成功',
      token: 'test-token-' + Date.now(),
      refreshToken: 'test-refresh-token-' + Date.now(),
      user: {
        id: 1,
        username: '测试用户',
        email: email,
        avatar: null,
        role: 'user'
      }
    });
  }
  
  // 默认失败
  res.status(401).json({
    success: false,
    message: '邮箱或密码错误'
  });
});

// 用户注册API
app.post('/api/users/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // 简单验证
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false,
      message: '所有字段都是必填的' 
    });
  }
  
  // 模拟注册成功
  res.status(201).json({
    success: true,
    message: '注册成功',
    user: {
      id: Date.now(),
      username,
      email
    }
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