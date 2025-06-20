/**
 * 客户端使用示例
 * 以下代码展示如何在前端调用API
 */

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 获取令牌
function getToken() {
  return localStorage.getItem('token');
}

// 添加认证头
function getAuthHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// 用户注册
async function registerUser(username, email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    return await response.json();
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}

// 用户登录
async function loginUser(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

// 获取当前用户信息
async function getCurrentUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

// 记录文章浏览
async function recordArticleView(articleId) {
  try {
    const response = await fetch(`${API_BASE_URL}/articles/${articleId}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('记录文章浏览失败:', error);
    throw error;
  }
}

// 点赞文章
async function likeArticle(articleId) {
  try {
    const response = await fetch(`${API_BASE_URL}/articles/${articleId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('点赞文章失败:', error);
    throw error;
  }
}

// 收藏文章
async function favoriteArticle(articleId) {
  try {
    const response = await fetch(`${API_BASE_URL}/articles/${articleId}/favorite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('收藏文章失败:', error);
    throw error;
  }
}

// 获取文章统计信息
async function getArticleStats(articleId) {
  try {
    const response = await fetch(`${API_BASE_URL}/articles/${articleId}/stats`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('获取文章统计信息失败:', error);
    throw error;
  }
}

// 在前端页面中的使用示例
/*
// 页面加载时记录浏览
document.addEventListener('DOMContentLoaded', async () => {
  const articleId = document.querySelector('[data-article-id]').dataset.articleId;
  
  try {
    // 记录文章浏览
    await recordArticleView(articleId);
    
    // 获取文章统计信息
    const stats = await getArticleStats(articleId);
    
    // 更新UI
    document.querySelector('#view-count').textContent = stats.viewCount;
    document.querySelector('#like-count').textContent = stats.likeCount;
    document.querySelector('#favorite-count').textContent = stats.favoriteCount;
    
    // 如果用户已登录，更新点赞和收藏按钮状态
    if (stats.hasLiked) {
      document.querySelector('#like-button').classList.add('liked');
    }
    
    if (stats.hasFavorited) {
      document.querySelector('#favorite-button').classList.add('favorited');
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});

// 点赞按钮点击处理
document.querySelector('#like-button').addEventListener('click', async () => {
  const articleId = document.querySelector('[data-article-id]').dataset.articleId;
  
  try {
    const result = await likeArticle(articleId);
    
    // 更新UI
    document.querySelector('#like-count').textContent = result.likeCount;
    
    if (result.action === 'liked') {
      document.querySelector('#like-button').classList.add('liked');
    } else {
      document.querySelector('#like-button').classList.remove('liked');
    }
  } catch (error) {
    console.error('点赞失败:', error);
    
    // 如果是未授权错误，提示用户登录
    if (error.status === 401) {
      alert('请先登录');
    }
  }
});

// 收藏按钮点击处理
document.querySelector('#favorite-button').addEventListener('click', async () => {
  const articleId = document.querySelector('[data-article-id]').dataset.articleId;
  
  try {
    const result = await favoriteArticle(articleId);
    
    // 更新UI
    document.querySelector('#favorite-count').textContent = result.favoriteCount;
    
    if (result.action === 'favorited') {
      document.querySelector('#favorite-button').classList.add('favorited');
    } else {
      document.querySelector('#favorite-button').classList.remove('favorited');
    }
  } catch (error) {
    console.error('收藏失败:', error);
    
    // 如果是未授权错误，提示用户登录
    if (error.status === 401) {
      alert('请先登录');
    }
  }
});
*/ 