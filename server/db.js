const mysql = require('mysql2/promise');
const config = require('./config');

// 创建数据库连接池
const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}

// 初始化数据库表
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // 创建文章表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        view_count INT DEFAULT 0,
        like_count INT DEFAULT 0,
        favorite_count INT DEFAULT 0,
        comment_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // 创建用户点赞记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        article_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        UNIQUE KEY user_article_like (user_id, article_id)
      )
    `);
    
    // 创建用户收藏记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        article_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        UNIQUE KEY user_article_favorite (user_id, article_id)
      )
    `);
    
    // 创建tokens表用于存储和管理用户令牌
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        refresh_token VARCHAR(255) UNIQUE,
        expire_time TIMESTAMP NOT NULL,
        is_revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (token),
        INDEX (refresh_token)
      )
    `);
    
    // 创建评论表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_id VARCHAR(36) NOT NULL,
        user_id INT NOT NULL,
        parent_id INT,
        content TEXT NOT NULL,
        like_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
        INDEX (article_id),
        INDEX (parent_id)
      )
    `);
    
    // 创建评论点赞表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        comment_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        UNIQUE KEY user_comment_like (user_id, comment_id)
      )
    `);
    
    console.log('数据库表初始化成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库表初始化失败:', error);
    return false;
  }
}

// 修复数据库表结构
async function fixDatabaseSchema() {
  try {
    console.log('开始修复数据库表结构...');
    const connection = await pool.getConnection();
    console.log('获取数据库连接成功');
    
    try {
      // 检查articles表是否存在
      console.log('检查articles表是否存在...');
      const [tables] = await connection.execute(`
        SHOW TABLES LIKE 'articles'
      `);
      
      if (tables.length === 0) {
        console.log('articles表不存在，正在创建...');
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS articles (
            id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            view_count INT DEFAULT 0,
            like_count INT DEFAULT 0,
            favorite_count INT DEFAULT 0,
            comment_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log('articles表创建成功');
      } else {
        console.log('articles表已存在，检查字段...');
      }
      
      // 检查articles表是否存在comment_count字段
      console.log('检查comment_count字段是否存在...');
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM articles LIKE 'comment_count'
      `);
      
      console.log('查询结果:', columns);
      
      // 如果不存在comment_count字段，添加它
      if (columns.length === 0) {
        console.log('正在添加comment_count字段到articles表...');
        await connection.execute(`
          ALTER TABLE articles ADD COLUMN comment_count INT DEFAULT 0 AFTER favorite_count
        `);
        console.log('comment_count字段添加成功');
      } else {
        console.log('articles表已有comment_count字段，无需修复');
      }
      
      connection.release();
      console.log('数据库连接已释放');
      return true;
    } catch (error) {
      console.error('修复数据库表结构失败:', error);
      connection.release();
      console.log('数据库连接已释放（错误处理）');
      return false;
    }
  } catch (error) {
    console.error('获取数据库连接失败:', error);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  initDatabase,
  fixDatabaseSchema
}; 