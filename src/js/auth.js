/**
 * 用户认证模块
 * 处理用户登录、注册、退出和状态管理
 */

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  // 初始化认证功能
  initAuth();
});

/**
 * 初始化认证功能
 */
function initAuth() {
  // 获取DOM元素
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const authModal = document.getElementById('authModal');
  const closeBtn = authModal?.querySelector('.close-btn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const switchToRegister = document.getElementById('switchToRegister');
  const switchToLogin = document.getElementById('switchToLogin');
  const userDropdown = document.getElementById('userDropdown');
  const userInfo = document.querySelector('.user-info');
  const guestArea = document.getElementById('guestArea');
  const userArea = document.getElementById('userArea');
  const usernameDisplay = document.getElementById('usernameDisplay');
  
  // 如果DOM元素不存在，可能是在不需要认证的页面
  if (!loginBtn || !authModal) {
    console.log('认证功能未初始化：缺少必要的DOM元素');
    return;
  }
  
  // 更新用户界面
  updateUserInterface();
  
  // 绑定事件处理器
  loginBtn.addEventListener('click', showLoginModal);
  registerBtn.addEventListener('click', showRegisterModal);
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (switchToRegister) switchToRegister.addEventListener('click', switchToRegisterForm);
  if (switchToLogin) switchToLogin.addEventListener('click', switchToLoginForm);
  if (userInfo) userInfo.addEventListener('click', toggleUserDropdown);
  
  // 点击外部关闭模态框
  window.addEventListener('click', (e) => {
    if (e.target === authModal) {
      closeAuthModal();
    }
    
    // 点击外部关闭用户下拉菜单
    if (userDropdown && userDropdown.classList.contains('show')) {
      if (!e.target.closest('.user-dropdown')) {
        userDropdown.classList.remove('show');
      }
    }
  });
}

/**
 * 更新用户界面
 */
function updateUserInterface() {
  try {
    const guestArea = document.getElementById('guestArea');
    const userArea = document.getElementById('userArea');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    // 如果用户界面元素不存在，直接返回
    if (!guestArea || !userArea) return;
    
    // 检查用户是否登录
    const isLoggedIn = ApiConfig.user.isLoggedIn();
    
    if (isLoggedIn) {
      // 已登录状态
      guestArea.classList.add('hidden');
      userArea.classList.remove('hidden');
      
      // 显示用户名
      const user = ApiConfig.user.getCurrentUserFromStorage();
      if (user && usernameDisplay) {
        usernameDisplay.textContent = user.username;
      }
      
      // 如果页面有文章操作按钮，更新状态
      updateArticleActionButtons();
    } else {
      // 未登录状态
      guestArea.classList.remove('hidden');
      userArea.classList.add('hidden');
    }
  } catch (error) {
    console.error('更新用户界面出错:', error);
  }
}

/**
 * 更新文章操作按钮状态
 */
function updateArticleActionButtons() {
  try {
    console.log('更新文章操作按钮状态');
    // 获取文章ID
    const articleActions = document.querySelector('.article-actions');
    if (!articleActions) {
      console.log('未找到.article-actions元素');
      return;
    }
    
    const articleId = articleActions.dataset.articleId;
    if (!articleId) {
      console.log('未找到文章ID');
      return;
    }
    console.log('找到文章ID:', articleId);
    
    // 获取文章统计信息
    console.log('开始获取文章统计信息');
    ApiConfig.article.getArticleStats(articleId)
      .then(data => {
        console.log('获取文章统计信息成功:', data);
        // 更新统计数字
        const viewCount = document.querySelector('.view-count');
        const likeCount = document.querySelector('.like-count');
        const favoriteCount = document.querySelector('.favorite-count');
        const likeBtn = document.getElementById('likeBtn');
        const favoriteBtn = document.getElementById('favoriteBtn');
        
        if (viewCount) viewCount.textContent = data.viewCount || 0;
        if (likeCount) likeCount.textContent = data.likeCount || 0;
        if (favoriteCount) favoriteCount.textContent = data.favoriteCount || 0;
        
        // 如果用户已登录，更新按钮状态
        if (ApiConfig.user.isLoggedIn()) {
          console.log('用户已登录，更新按钮状态');
          if (likeBtn && data.hasLiked) likeBtn.classList.add('liked');
          if (favoriteBtn && data.hasFavorited) favoriteBtn.classList.add('favorited');
          
          // 绑定按钮事件
          if (likeBtn && !likeBtn._hasEvent) {
            console.log('绑定点赞按钮事件');
            likeBtn.addEventListener('click', () => {
              console.log('点赞按钮被点击');
              handleLikeArticle(articleId);
            });
            likeBtn._hasEvent = true;
          }
          
          if (favoriteBtn && !favoriteBtn._hasEvent) {
            favoriteBtn.addEventListener('click', () => handleFavoriteArticle(articleId));
            favoriteBtn._hasEvent = true;
          }
        } else {
          console.log('用户未登录，不绑定点赞按钮事件');
        }
      })
      .catch(error => {
        console.error('获取文章统计信息失败:', error);
      });
  } catch (error) {
    console.error('更新文章按钮状态出错:', error);
  }
}

/**
 * 显示登录模态框
 */
function showLoginModal() {
  const authModal = document.getElementById('authModal');
  const loginTitle = document.getElementById('loginTitle');
  const registerTitle = document.getElementById('registerTitle');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (!authModal) return;
  
  // 显示模态框
  authModal.classList.add('active');
  document.body.style.overflow = 'hidden'; // 防止页面滚动
  
  // 显示登录表单
  if (loginTitle) loginTitle.classList.remove('hidden');
  if (registerTitle) registerTitle.classList.add('hidden');
  if (loginForm) loginForm.classList.remove('hidden');
  if (registerForm) registerForm.classList.add('hidden');
  
  // 重置表单
  if (loginForm) loginForm.reset();
}

/**
 * 显示注册模态框
 */
function showRegisterModal() {
  const authModal = document.getElementById('authModal');
  const loginTitle = document.getElementById('loginTitle');
  const registerTitle = document.getElementById('registerTitle');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (!authModal) return;
  
  // 显示模态框
  authModal.classList.add('active');
  document.body.style.overflow = 'hidden'; // 防止页面滚动
  
  // 显示注册表单
  if (loginTitle) loginTitle.classList.add('hidden');
  if (registerTitle) registerTitle.classList.remove('hidden');
  if (loginForm) loginForm.classList.add('hidden');
  if (registerForm) registerForm.classList.remove('hidden');
  
  // 重置表单
  if (registerForm) registerForm.reset();
}

/**
 * 关闭认证模态框
 */
function closeAuthModal() {
  const authModal = document.getElementById('authModal');
  if (!authModal) return;
  
  authModal.classList.remove('active');
  document.body.style.overflow = ''; // 恢复页面滚动
  
  // 重置错误消息
  resetAuthMessages();
}

/**
 * 切换到注册表单
 */
function switchToRegisterForm() {
  const loginTitle = document.getElementById('loginTitle');
  const registerTitle = document.getElementById('registerTitle');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (loginTitle) loginTitle.classList.add('hidden');
  if (registerTitle) registerTitle.classList.remove('hidden');
  if (loginForm) loginForm.classList.add('hidden');
  if (registerForm) registerForm.classList.remove('hidden');
  
  // 重置表单和消息
  resetAuthMessages();
}

/**
 * 切换到登录表单
 */
function switchToLoginForm() {
  const loginTitle = document.getElementById('loginTitle');
  const registerTitle = document.getElementById('registerTitle');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (loginTitle) loginTitle.classList.remove('hidden');
  if (registerTitle) registerTitle.classList.add('hidden');
  if (loginForm) loginForm.classList.remove('hidden');
  if (registerForm) registerForm.classList.add('hidden');
  
  // 重置表单和消息
  resetAuthMessages();
}

/**
 * 重置认证消息
 */
function resetAuthMessages() {
  const errorContainer = document.querySelector('.error-container');
  const successContainer = document.querySelector('.success-container');
  
  if (errorContainer) {
    errorContainer.classList.add('hidden');
    const errorMessage = errorContainer.querySelector('.error-message');
    if (errorMessage) errorMessage.textContent = '';
  }
  
  if (successContainer) {
    successContainer.classList.add('hidden');
    const successMessage = successContainer.querySelector('.success-message');
    if (successMessage) successMessage.textContent = '';
  }
}

/**
 * 显示错误消息
 */
function showErrorMessage(message) {
  const errorContainer = document.querySelector('.error-container');
  if (!errorContainer) return;
  
  errorContainer.classList.remove('hidden');
  const errorMessage = errorContainer.querySelector('.error-message');
  if (errorMessage) errorMessage.textContent = message;
}

/**
 * 显示成功消息
 */
function showSuccessMessage(message) {
  const successContainer = document.querySelector('.success-container');
  if (!successContainer) return;
  
  successContainer.classList.remove('hidden');
  const successMessage = successContainer.querySelector('.success-message');
  if (successMessage) successMessage.textContent = message;
}

/**
 * 处理登录表单提交
 */
function handleLogin(e) {
  e.preventDefault();
  
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  if (!usernameInput || !passwordInput) return;
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  // 表单验证
  if (!username || !password) {
    showErrorMessage('用户名和密码不能为空');
    return;
  }
  
  // 重置错误消息
  resetAuthMessages();
  
  // 调用登录API
  ApiConfig.user.login(username, password)
    .then(response => {
      showSuccessMessage('登录成功，正在跳转...');
      
      // 延迟关闭模态框，给用户看到成功消息
      setTimeout(() => {
        closeAuthModal();
        updateUserInterface();
      }, 1000);
    })
    .catch(error => {
      console.error('登录失败:', error);
      showErrorMessage(error.message || '登录失败，请稍后重试');
    });
}

/**
 * 处理注册表单提交
 */
function handleRegister(e) {
  e.preventDefault();
  
  const usernameInput = document.getElementById('reg-username');
  const emailInput = document.getElementById('reg-email');
  const passwordInput = document.getElementById('reg-password');
  const confirmPasswordInput = document.getElementById('reg-confirm-password');
  
  if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;
  
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  
  // 表单验证
  if (!username || !email || !password || !confirmPassword) {
    showErrorMessage('所有字段都是必填的');
    return;
  }
  
  if (password !== confirmPassword) {
    showErrorMessage('两次输入的密码不一致');
    return;
  }
  
  // 邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showErrorMessage('请输入有效的邮箱地址');
    return;
  }
  
  // 重置错误消息
  resetAuthMessages();
  
  // 调用注册API
  ApiConfig.user.register({ username, email, password })
    .then(response => {
      showSuccessMessage('注册成功，请登录');
      
      // 延迟切换到登录表单
      setTimeout(() => {
        switchToLoginForm();
      }, 1500);
    })
    .catch(error => {
      console.error('注册失败:', error);
      showErrorMessage(error.message || '注册失败，请稍后重试');
    });
}

/**
 * 处理退出登录
 */
function handleLogout() {
  // 调用退出API
  ApiConfig.user.logout();
  
  // 更新界面
  updateUserInterface();
  
  // 如果在用户个人中心等受保护页面，跳转到首页
  const currentPath = window.location.pathname;
  if (currentPath.startsWith('/user/')) {
    window.location.href = '/';
  }
  
  // 关闭用户下拉菜单
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown) userDropdown.classList.remove('show');
}

/**
 * 切换用户下拉菜单
 */
function toggleUserDropdown() {
  const userDropdown = document.getElementById('userDropdown');
  if (!userDropdown) return;
  
  userDropdown.classList.toggle('show');
}

/**
 * 处理点赞文章
 */
function handleLikeArticle(articleId) {
  console.log('==================== 点赞函数被调用 ====================');
  console.log('文章ID:', articleId);
  
  if (!articleId) return;
  
  // 检查用户是否已登录
  const isLoggedIn = ApiConfig.user.isLoggedIn();
  console.log('用户是否已登录:', isLoggedIn);
  
  if (!isLoggedIn) {
    console.log('用户未登录，显示登录模态框');
    showLoginModal();
    return;
  }
  
  // 调用点赞API
  console.log('开始调用点赞API:', `articles/${articleId}/like`);
  ApiConfig.article.likeArticle(articleId)
    .then(response => {
      console.log('点赞API调用成功，响应:', response);
      const likeBtn = document.getElementById('likeBtn');
      const likeCount = document.querySelector('.like-count');
      
      if (likeCount) likeCount.textContent = response.likeCount || 0;
      
      if (likeBtn) {
        if (response.action === 'liked') {
          likeBtn.classList.add('liked');
          showToast('点赞成功');
        } else {
          likeBtn.classList.remove('liked');
          showToast('已取消点赞');
        }
      }
    })
    .catch(error => {
      console.error('点赞API调用失败，错误:', error);
      showToast('操作失败，请稍后重试');
    });
}

/**
 * 处理收藏文章
 */
function handleFavoriteArticle(articleId) {
  if (!articleId) return;
  
  // 检查用户是否已登录
  if (!ApiConfig.user.isLoggedIn()) {
    showLoginModal();
    return;
  }
  
  // 调用收藏API
  ApiConfig.article.favoriteArticle(articleId)
    .then(response => {
      const favoriteBtn = document.getElementById('favoriteBtn');
      const favoriteCount = document.querySelector('.favorite-count');
      
      if (favoriteCount) favoriteCount.textContent = response.favoriteCount || 0;
      
      if (favoriteBtn) {
        if (response.action === 'favorited') {
          favoriteBtn.classList.add('favorited');
          showToast('收藏成功');
        } else {
          favoriteBtn.classList.remove('favorited');
          showToast('已取消收藏');
        }
      }
    })
    .catch(error => {
      console.error('收藏失败:', error);
      showToast('操作失败，请稍后重试');
    });
}

/**
 * 显示提示消息
 */
function showToast(message) {
  // 检查是否已存在Toast元素
  let toast = document.getElementById('toast');
  
  // 如果不存在，创建一个
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  // 设置消息内容
  toast.textContent = message;
  toast.classList.add('show');
  
  // 3秒后自动隐藏
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
} 