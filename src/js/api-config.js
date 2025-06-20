/**
 * API配置文件
 * 可以通过修改此文件来切换API服务器环境
 */

// API环境配置
const API_ENVIRONMENTS = {
  development: 'http://localhost:3001/api',
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
  
  // 获取令牌
  getToken() {
    return localStorage.getItem('token');
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
      }
    };
    
    // 合并选项
    const fetchOptions = {
      ...defaultOptions,
      ...options
    };
    
    try {
      const response = await fetch(url, fetchOptions);
      
      // 解析JSON响应
      const data = await response.json();
      
      // 检查响应状态
      if (!response.ok) {
        // 处理401未授权错误，可能需要重新登录
        if (response.status === 401) {
          // 可以在这里添加重新登录的逻辑
          console.warn('身份验证失败，可能需要重新登录');
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
      throw error;
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
  
  // 用户登录
  async login(username, password) {
    const response = await ApiClient.post('/users/login', { username, password });
    
    // 登录成功保存token和用户信息
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },
  
  // 获取当前用户信息
  async getCurrentUser() {
    return ApiClient.get('/users/me');
  },
  
  // 退出登录
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  // 检查是否已登录
  isLoggedIn() {
    return !!localStorage.getItem('token');
  },
  
  // 获取当前登录用户信息
  getCurrentUserFromStorage() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }
};

// 文章API
const ArticleApi = {
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
    return ApiClient.get(`/articles/${articleId}/stats`);
  }
};

// 导出API对象
window.ApiConfig = {
  baseUrl: API_BASE_URL,
  client: ApiClient,
  user: UserApi,
  article: ArticleApi
}; 