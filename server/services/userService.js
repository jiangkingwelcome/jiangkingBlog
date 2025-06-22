const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const crypto = require('crypto');

// 生成随机token
function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

// 创建访问token和刷新token
async function createTokens(user) {
  // 生成JWT访问token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  // 生成刷新token
  const refreshToken = generateToken();
  
  // 计算过期时间
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 7); // 7天后过期
  
  try {
    // 存储token到数据库
    await pool.execute(
      `INSERT INTO tokens (user_id, token, refresh_token, expire_time) 
       VALUES (?, ?, ?, ?)`,
      [user.id, token, refreshToken, expireDate]
    );
    
    return { token, refreshToken, expireTime: expireDate };
  } catch (error) {
    console.error('创建token失败:', error);
    throw error;
  }
}

// 验证token
async function validateToken(token) {
  console.log('开始验证token');
  
  try {
    console.log('解码JWT token...');
    // 解码token
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log('JWT解码成功:', decoded);
    
    // 在数据库中查找token
    console.log('在数据库中查找token...');
    const [tokens] = await pool.execute(
      `SELECT * FROM tokens 
       WHERE token = ? AND expire_time > NOW() AND is_revoked = FALSE`,
      [token]
    );
    
    console.log('数据库查询结果:', tokens.length > 0 ? '找到token' : '未找到token');
    
    if (tokens.length === 0) {
      console.log('数据库中未找到有效token，验证失败');
      return { valid: false };
    }
    
    console.log('token验证成功');
    return { valid: true, user: decoded };
  } catch (error) {
    console.error('验证token过程中发生错误:', error);
    if (error.name === 'JsonWebTokenError') {
      console.log('JWT错误类型:', error.name, '错误消息:', error.message);
    } else if (error.name === 'TokenExpiredError') {
      console.log('Token已过期');
    }
    return { valid: false };
  }
}

// 刷新token
async function refreshUserToken(refreshToken) {
  try {
    // 在数据库中查找刷新token
    const [tokens] = await pool.execute(
      `SELECT * FROM tokens 
       WHERE refresh_token = ? AND expire_time > NOW() AND is_revoked = FALSE`,
      [refreshToken]
    );
    
    if (tokens.length === 0) {
      return { success: false, message: '无效的刷新token' };
    }
    
    // 获取用户信息
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [tokens[0].user_id]
    );
    
    if (users.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    
    const user = users[0];
    
    // 撤销旧token
    await pool.execute(
      'UPDATE tokens SET is_revoked = TRUE WHERE id = ?',
      [tokens[0].id]
    );
    
    // 创建新token
    const tokenData = await createTokens(user);
    
    return {
      success: true,
      token: tokenData.token,
      refreshToken: tokenData.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    };
  } catch (error) {
    console.error('刷新token失败:', error);
    return { success: false, message: '服务器错误' };
  }
}

// 撤销token
async function revokeToken(token) {
  try {
    const [result] = await pool.execute(
      'UPDATE tokens SET is_revoked = TRUE WHERE token = ?',
      [token]
    );
    
    return { success: result.affectedRows > 0 };
  } catch (error) {
    console.error('撤销token失败:', error);
    throw error;
  }
}

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

// 用户登录 (通过用户名)
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
    
    // 撤销该用户之前的所有token（可选）
    // await pool.execute('UPDATE tokens SET is_revoked = TRUE WHERE user_id = ?', [user.id]);
    
    // 创建新token
    const tokenData = await createTokens(user);
    
    return {
      success: true,
      token: tokenData.token,
      refreshToken: tokenData.refreshToken,
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

// 用户登录 (通过邮箱)
async function loginUserByEmail(email, password) {
  try {
    // 查找用户
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return { success: false, message: '该邮箱未注册' };
    }
    
    const user = users[0];
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return { success: false, message: '密码错误' };
    }
    
    // 撤销该用户之前的所有token（可选）
    // await pool.execute('UPDATE tokens SET is_revoked = TRUE WHERE user_id = ?', [user.id]);
    
    // 创建新token
    const tokenData = await createTokens(user);
    
    return {
      success: true,
      token: tokenData.token,
      refreshToken: tokenData.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    };
  } catch (error) {
    console.error('通过邮箱登录失败:', error);
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

// 用户登出
async function logoutUser(token) {
  try {
    // 撤销token
    const result = await revokeToken(token);
    return { success: result.success };
  } catch (error) {
    console.error('用户登出失败:', error);
    throw error;
  }
}

module.exports = {
  createUser,
  loginUser,
  loginUserByEmail,
  getUserById,
  validateToken,
  refreshUserToken,
  revokeToken,
  logoutUser
}; 