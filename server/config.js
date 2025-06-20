require('dotenv').config();

module.exports = {
  // 服务器配置
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // 数据库配置
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'jiangking_blog',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'jiangking_blog',
    port: process.env.DB_PORT || 3306
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'jiangking_blog_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
}; 