const jwt = require('jsonwebtoken');
const config = require('../config');
const userService = require('../services/userService');

// 验证JWT令牌
async function auth(req, res, next) {
  console.log('======== 进入auth中间件 ========');
  console.log('请求路径:', req.path);
  console.log('请求头:', req.headers);
  
  // 获取令牌
  const authHeader = req.header('Authorization');
  console.log('Authorization头:', authHeader);
  
  // 检查令牌是否存在
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('未提供有效的Authorization头，返回401错误');
    return res.status(401).json({ message: '无访问权限，需要登录' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  console.log('提取的token:', token.substring(0, 10) + '...(已截断)');
  
  try {
    // 使用改进的token验证服务
    console.log('开始验证token...');
    const tokenResult = await userService.validateToken(token);
    console.log('token验证结果:', tokenResult);
    
    if (!tokenResult.valid) {
      console.log('token无效，返回401错误');
      return res.status(401).json({ message: '令牌无效或已过期，请重新登录' });
    }
    
    // 将用户信息添加到请求对象
    console.log('token有效，用户信息:', tokenResult.user);
    req.user = tokenResult.user;
    console.log('auth中间件验证通过，继续下一步');
    next();
  } catch (error) {
    console.error('验证token失败:', error);
    res.status(401).json({ message: '令牌验证错误，请重新登录' });
  }
}

// 访问者统计，不需要身份验证
async function optionalAuth(req, res, next) {
  // 获取令牌
  const authHeader = req.header('Authorization');
  
  // 如果没有令牌，继续处理请求，但不设置用户信息
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // 使用改进的token验证服务
    const tokenResult = await userService.validateToken(token);
    
    if (tokenResult.valid) {
      // 将用户信息添加到请求对象
      req.user = tokenResult.user;
    }
  } catch (error) {
    // 令牌无效，但仍然继续处理请求
    console.log('无效的令牌，但允许访问');
  }
  
  next();
}

// 管理员权限验证
async function admin(req, res, next) {
  // 首先验证用户是否已登录
  try {
    // 获取令牌
    const authHeader = req.header('Authorization');
    
    // 检查令牌是否存在
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '无访问权限，需要登录' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // 使用改进的token验证服务
    const tokenResult = await userService.validateToken(token);
    
    if (!tokenResult.valid) {
      return res.status(401).json({ message: '令牌无效或已过期，请重新登录' });
    }
    
    // 检查是否为管理员
    if (tokenResult.user && tokenResult.user.role === 'admin') {
      // 将用户信息添加到请求对象
      req.user = tokenResult.user;
      next();
    } else {
      res.status(403).json({ message: '需要管理员权限' });
    }
  } catch (error) {
    console.error('验证管理员权限失败:', error);
    res.status(401).json({ message: '令牌验证错误，请重新登录' });
  }
}

module.exports = { auth, optionalAuth, admin }; 