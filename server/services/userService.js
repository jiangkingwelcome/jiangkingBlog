const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');

// 创建用户
async function createUser(userData) {
  const { username, email, password } = userData;
  
  try {
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 插入用户
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    
    return { id: result.insertId, username, email };
  } catch (error) {
    console.error('创建用户失败:', error);
    throw error;
  }
}

// 用户登录
async function loginUser(username, password) {
  try {
    // 查找用户
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return { success: false, message: '用户名不存在' };
    }
    
    const user = users[0];
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return { success: false, message: '密码错误' };
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    };
  } catch (error) {
    console.error('用户登录失败:', error);
    throw error;
  }
}

// 获取用户信息
async function getUserById(userId) {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, avatar, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return null;
    }
    
    return users[0];
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

module.exports = {
  createUser,
  loginUser,
  getUserById
}; 