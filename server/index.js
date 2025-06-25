const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { testConnection, initDatabase, fixDatabaseSchema } = require('./db');
const userRoutes = require('./routes/userRoutes');
const articleRoutes = require('./routes/articleRoutes');
const githubRoutes = require('./routes/githubRoutes');
const fs = require('fs');
const path = require('path');

// 创建Express应用
const app = express();

// 中间件
// 允许来自前端域的请求，带有credentials支持以允许跨域cookie
app.use(cors({
  origin: function(origin, callback) {
    console.log('CORS请求来源:', origin);
    // 允许本地开发环境和其他指定域名
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://localhost:8080',
      'http://localhost:8085', // 添加8085端口
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8085', // 添加8085端口
      undefined // 允许不带Origin的请求（如从文件系统或其他非浏览器请求）
    ];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS拒绝来源:', origin);
      callback(null, false); // 可选：改为true以允许所有源
    }
  },
  credentials: true,  // 允许携带凭证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json());
app.use(cookieParser()); // 解析Cookie
// app.use(morgan(':method :url :status :response-time ms - :res[content-length]')); // 暂时禁用morgan

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
  next();
});

// 健康检查
app.get('/api/health', (req, res) => {
  console.log('健康检查API被调用');
  res.json({ status: 'ok', message: 'API服务器正常运行' });
});

// 添加所有API路由信息端点
app.get('/api/routes', (req, res) => {
  console.log('路由信息API被调用');
  const getRoutesInfo = (router) => {
    return router.stack.map(layer => {
      if (layer.route) {
        return {
          path: layer.route.path,
          methods: Object.keys(layer.route.methods).join(', ').toUpperCase()
        };
      }
      return null;
    }).filter(route => route !== null);
  };
  
  let routes = {
    user: getRoutesInfo(userRoutes),
    article: getRoutesInfo(articleRoutes),
    root: app._router.stack
      .filter(r => r.route)
      .map(r => ({ path: r.route.path, methods: Object.keys(r.route.methods).join(', ').toUpperCase() }))
  };
  
  res.json({ routes });
});

// 路由
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/github', githubRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    message: '服务器错误', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// 未找到路由处理
app.use((req, res) => {
  console.log(`404 - 未找到路由: ${req.method} ${req.url}`);
  res.status(404).json({ message: '未找到请求的资源' });
});

// 启动服务器
async function startServer() {
  try {
    console.log('开始启动服务器...');
    
    // 测试数据库连接
    console.log('正在测试数据库连接...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('数据库连接失败，但继续启动服务器（仅API模式）');
      // 不退出，继续启动服务器
    } else {
      // 初始化数据库表
      console.log('正在初始化数据库表...');
      await initDatabase();
      
      // 修复数据库表结构
      console.log('正在检查并修复数据库表结构...');
      await fixDatabaseSchema();
    }
    
    // 启动服务器
    const PORT = config.port;
    const server = app.listen(PORT, () => {
      console.log(`✅ 服务器成功启动在端口 ${PORT}, 环境: ${config.nodeEnv}`);
      console.log(`🌐 访问地址: http://localhost:${PORT}`);
    });
    
    // 处理服务器错误
    server.on('error', (error) => {
      console.error('服务器错误:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用`);
      }
    });
    
    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('收到 SIGTERM 信号，正在关闭服务器...');
      server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('服务器启动失败:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 全局异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  console.error('错误堆栈:', error.stack);
  // 不退出进程，继续运行
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  console.error('Promise:', promise);
  // 不退出进程，继续运行
});

// 启动应用
startServer();