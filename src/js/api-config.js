/**
 * API配置文件
 * 可以通过修改此文件来切换API服务器环境
 */

// API环境配置
const API_ENVIRONMENTS = {
  development: 'http://localhost:3001/api', // API服务器端口(正确)
  production: '/api', // 生产环境使用相对路径
  // 可以添加其他环境，如测试、预发布等
};

// 当前环境，可以根据需要更改
const CURRENT_ENV = 'development';

// API基础URL
const API_BASE_URL = API_ENVIRONMENTS[CURRENT_ENV];

/**
 * API客户端配置
 */
const ApiClient = {
  // API基础URL
  baseUrl: API_BASE_URL,
  
  // 获取访问令牌
  getToken() {
    return localStorage.getItem('token');
  },
  
  // 获取刷新令牌
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },
  
  // 添加认证头
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },
  
  // 发送请求
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // 默认请求选项
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers
      },
      credentials: 'include' // 允许跨域请求携带cookie
    };
    
    // 合并选项
    const fetchOptions = {
      ...defaultOptions,
      ...options,
      credentials: 'include' // 确保始终包含credentials
    };
    
    try {
      const response = await fetch(url, fetchOptions);
      
      // 尝试解析JSON响应
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      // 检查响应状态
      if (!response.ok) {
        // 处理401未授权错误，可能需要刷新token
        if (response.status === 401) {
          // 对于获取评论和文章统计信息的请求，即使未授权也返回空数据而不是抛出错误
          if (endpoint.includes('/comments') || endpoint.includes('/stats')) {
            console.warn('未登录状态下获取评论或统计信息');
            return { data: [], total: 0, hasMore: false };
          }
          
          // 尝试刷新token
          const refreshed = await this.refreshToken();
          
          if (refreshed) {
            // 使用新token重试请求
            return this.request(endpoint, options);
          } else {
            // 刷新失败，清除登录状态
            UserApi.logout();
            // 通知用户需要重新登录
            window.dispatchEvent(new CustomEvent('auth:logout', { 
              detail: { reason: '登录已过期，请重新登录' } 
            }));
          }
        }
        
        throw {
          status: response.status,
          message: data.message || '请求失败',
          data
        };
      }
      
      return data;
    } catch (error) {
      console.error('API请求错误:', error);
      
      // 对于获取评论和文章统计信息的请求，即使出错也返回空数据而不是抛出错误
      if (endpoint.includes('/comments') || endpoint.includes('/stats')) {
        console.warn('获取评论或统计信息失败，返回空数据');
        return { data: [], total: 0, hasMore: false };
      }
      
      throw error;
    }
  },
  
  // 刷新token
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;
      
      const response = await fetch(`${this.baseUrl}/users/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include' // 允许跨域请求携带cookie
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      // 更新用户信息
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return true;
    } catch (error) {
      console.error('刷新token失败:', error);
      return false;
    }
  },
  
  // GET请求
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  // POST请求
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // PUT请求
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // DELETE请求
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// 用户API
const UserApi = {
  // 用户注册
  async register(userData) {
    return ApiClient.post('/users/register', userData);
  },
  
  // 用户登录 (支持邮箱登录)
  async login(email, password) {
    const response = await ApiClient.post('/users/login', { email, password });
    
    // 登录成功保存token和用户信息
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },
  
  // 获取当前用户信息
  async getCurrentUser() {
    return ApiClient.get('/users/me');
  },
  
  // 退出登录
  async logout() {
    try {
      // 如果登录状态，通知服务器撤销token
      if (this.isLoggedIn()) {
        await ApiClient.post('/users/logout');
      }
    } catch (error) {
      console.error('登出API调用失败:', error);
    } finally {
      // 无论API调用成功与否，都清除本地存储的token和用户信息
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
  
  // 检查是否已登录（基础检查）
  isLoggedIn() {
    return !!localStorage.getItem('token');
  },
  
  // 验证当前token是否有效
  async validateToken() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      const response = await ApiClient.post('/users/validate-token', { token });
      return response.valid;
    } catch (error) {
      console.error('验证token失败:', error);
      return false;
    }
  },
  
  // 获取当前登录用户信息
  getCurrentUserFromStorage() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },
  
  // 重定向到登录页面
  redirectToLogin() {
    console.log('重定向到登录页面');
    
    // 记住当前页面，以便登录后返回
    localStorage.setItem('loginRedirect', window.location.href);
    
    // 重定向到登录页面
    window.location.href = '/login'; 
  }
};

// 文章API
const ArticleApi = {
  // 获取文章列表
  async getArticles(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return ApiClient.get(`/articles${queryParams ? `?${queryParams}` : ''}`);
  },
  
  // 获取文章详情
  async getArticleById(id) {
    return ApiClient.get(`/articles/${id}`);
  },
  
  // 增加文章阅读量
  async incrementViewCount(articleId) {
    return ApiClient.post(`/articles/${articleId}/view`);
  },
  
  // 点赞文章
  async likeArticle(articleId) {
    return ApiClient.post(`/articles/${articleId}/like`);
  },
  
  // 收藏文章
  async favoriteArticle(articleId) {
    return ApiClient.post(`/articles/${articleId}/favorite`);
  },
  
  // 获取文章统计信息
  async getArticleStats(articleId) {
    try {
      return await ApiClient.get(`/articles/${articleId}/stats`);
    } catch (error) {
      console.error('获取文章统计信息失败:', error);
      // 返回默认值
      return { views: 0, likes: 0, comments: 0, favorites: 0 };
    }
  },
  
  // 获取文章评论
  async getComments(articleId, { page = 1, limit = 10 } = {}) {
    try {
      return await ApiClient.get(`/articles/${articleId}/comments?page=${page}&limit=${limit}`);
    } catch (error) {
      console.error('获取文章评论失败:', error);
      // 返回默认值
      return { data: [], total: 0, hasMore: false };
    }
  },
  
  // 添加评论
  async addComment(articleId, { content }) {
    return ApiClient.post(`/articles/${articleId}/comments`, { content });
  },
  
  // 回复评论
  async replyComment(commentId, { content }) {
    return ApiClient.post(`/articles/comments/${commentId}/replies`, { content });
  },
  
  // 点赞评论
  async likeComment(commentId) {
    return ApiClient.post(`/articles/comments/${commentId}/like`);
  }
};

// 导出API对象
window.ApiConfig = {
  baseUrl: API_BASE_URL,
  client: ApiClient,
  user: UserApi,
  article: ArticleApi
};
