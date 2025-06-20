const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { testConnection, initDatabase } = require('./db');
const userRoutes = require('./routes/userRoutes');
const articleRoutes = require('./routes/articleRoutes');

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: config.nodeEnv });
});

// 路由
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

// 未找到路由处理
app.use((req, res) => {
  res.status(404).json({ message: '未找到请求的资源' });
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('数据库连接失败，服务器启动中止');
      process.exit(1);
    }
    
    // 初始化数据库表
    await initDatabase();
    
    // 启动服务器
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}, 环境: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动应用
startServer(); 