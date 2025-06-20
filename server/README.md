# JiangKing博客API服务

这是JiangKing博客的后端API服务，提供用户认证、文章阅读量、点赞和收藏等功能。

## 功能特性

- 用户注册和登录
- JWT身份认证
- 文章阅读量统计
- 文章点赞功能
- 文章收藏功能
- 获取文章统计信息

## 技术栈

- Node.js
- Express.js
- MySQL
- JWT认证
- bcrypt加密

## 开始使用

### 前置条件

- Node.js (v14+)
- MySQL数据库

### 安装

1. 克隆仓库或进入server目录

2. 安装依赖
```bash
npm install
```

3. 配置环境变量

复制`.env.example`为`.env`并配置数据库连接信息：

```
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jiangking_blog
DB_PORT=3306

# JWT配置
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

4. 启动服务器

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API文档

### 用户API

#### 注册用户
- **URL**: `/api/users/register`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "username": "用户名",
    "email": "邮箱",
    "password": "密码"
  }
  ```
- **响应**:
  ```json
  {
    "message": "注册成功",
    "user": {
      "id": 1,
      "username": "用户名",
      "email": "邮箱"
    }
  }
  ```

#### 用户登录
- **URL**: `/api/users/login`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "username": "用户名",
    "password": "密码"
  }
  ```
- **响应**:
  ```json
  {
    "message": "登录成功",
    "token": "JWT令牌",
    "user": {
      "id": 1,
      "username": "用户名",
      "email": "邮箱",
      "avatar": "头像URL",
      "role": "user"
    }
  }
  ```

#### 获取当前用户信息
- **URL**: `/api/users/me`
- **方法**: `GET`
- **头部**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "id": 1,
    "username": "用户名",
    "email": "邮箱",
    "avatar": "头像URL",
    "role": "user",
    "created_at": "创建时间"
  }
  ```

### 文章API

#### 增加文章阅读量
- **URL**: `/api/articles/:articleId/view`
- **方法**: `POST`
- **响应**:
  ```json
  {
    "viewCount": 10
  }
  ```

#### 点赞文章
- **URL**: `/api/articles/:articleId/like`
- **方法**: `POST`
- **头部**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "action": "liked", // 或 "unliked"
    "likeCount": 5
  }
  ```

#### 收藏文章
- **URL**: `/api/articles/:articleId/favorite`
- **方法**: `POST`
- **头部**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "action": "favorited", // 或 "unfavorited"
    "favoriteCount": 3
  }
  ```

#### 获取文章统计信息
- **URL**: `/api/articles/:articleId/stats`
- **方法**: `GET`
- **头部**: `Authorization: Bearer {token}` (可选)
- **响应**:
  ```json
  {
    "id": "文章ID",
    "title": "文章标题",
    "viewCount": 10,
    "likeCount": 5,
    "favoriteCount": 3,
    "hasLiked": true, // 仅当用户登录时
    "hasFavorited": false // 仅当用户登录时
  }
  ```

## 客户端集成

查看 `client-examples.js` 文件获取前端集成示例。 