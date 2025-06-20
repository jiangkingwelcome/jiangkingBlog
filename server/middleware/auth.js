const jwt = require('jsonwebtoken');
const config = require('../config');

// 验证JWT令牌
function auth(req, res, next) {
  // 获取令牌
  const authHeader = req.header('Authorization');
  
  // 检查令牌是否存在
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '无访问权限，需要登录' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: '令牌无效，请重新登录' });
  }
}

// 访问者统计，不需要身份验证
function optionalAuth(req, res, next) {
  // 获取令牌
  const authHeader = req.header('Authorization');
  
  // 如果没有令牌，继续处理请求，但不设置用户信息
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 将用户信息添加到请求对象
    req.user = decoded;
  } catch (error) {
    // 令牌无效，但仍然继续处理请求
    console.log('无效的令牌，但允许访问');
  }
  
  next();
}

// 管理员权限验证
function admin(req, res, next) {
  // 首先验证用户是否已登录
  auth(req, res, () => {
    // 检查是否为管理员
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: '需要管理员权限' });
    }
  });
}

module.exports = { auth, optionalAuth, admin }; 