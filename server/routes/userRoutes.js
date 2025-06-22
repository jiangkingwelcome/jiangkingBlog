const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const userService = require('../services/userService');

// 注册用户
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ message: '所有字段都是必填的' });
    }
    
    // 创建用户
    const user = await userService.createUser({
      username,
      email,
      password
    });
    
    res.status(201).json({
      message: '注册成功',
      user
    });
  } catch (error) {
    console.error(error);
    
    // 处理重复用户名或邮箱
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: '用户名或邮箱已存在' });
    }
    
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ message: '邮箱和密码都是必填的' });
    }
    
    // 登录
    const result = await userService.loginUserByEmail(email, password);
    
    if (!result.success) {
      return res.status(401).json({ message: result.message });
    }
    
    // 设置HttpOnly Cookie存储refreshToken (如果需要)
    // 注意：在生产环境中，应该使用 secure: true 和 sameSite: 'strict' 选项
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true, 
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
      });
    } else {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
      });
    }
    
    res.json({
      message: '登录成功',
      token: result.token,
      refreshToken: result.refreshToken, // 前端仍然可以选择存储在localStorage
      user: result.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 验证令牌
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: '令牌是必须的' });
    }
    
    const result = await userService.validateToken(token);
    
    if (!result.valid) {
      return res.status(401).json({ valid: false, message: '无效的令牌' });
    }
    
    res.json({ valid: true, user: result.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 刷新令牌
router.post('/refresh-token', async (req, res) => {
  try {
    // 尝试从cookie中获取refreshToken（如果设置了）
    const cookieRefreshToken = req.cookies?.refreshToken;
    // 从请求体中获取refreshToken
    const { refreshToken } = req.body;
    
    // 优先使用cookie中的refreshToken
    const tokenToUse = cookieRefreshToken || refreshToken;
    
    if (!tokenToUse) {
      return res.status(400).json({ message: '刷新令牌是必须的' });
    }
    
    const result = await userService.refreshUserToken(tokenToUse);
    
    if (!result.success) {
      return res.status(401).json({ message: result.message });
    }
    
    // 更新HttpOnly Cookie中的refreshToken（如果使用）
    if (cookieRefreshToken) {
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
        });
      } else {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
        });
      }
    }
    
    res.json({
      message: '刷新令牌成功',
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 登出
router.post('/logout', auth, async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({ message: '无法找到令牌' });
    }
    
    await userService.revokeToken(token);
    
    // 如果使用了HttpOnly Cookie存储refreshToken，清除它
    if (req.cookies?.refreshToken) {
      res.clearCookie('refreshToken');
    }
    
    res.json({ message: '成功登出' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 