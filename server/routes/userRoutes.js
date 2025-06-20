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
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码都是必填的' });
    }
    
    // 登录
    const result = await userService.loginUser(username, password);
    
    if (!result.success) {
      return res.status(401).json({ message: result.message });
    }
    
    res.json({
      message: '登录成功',
      token: result.token,
      user: result.user
    });
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