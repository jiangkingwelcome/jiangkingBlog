// 浏览器检测和统一样式
function detectBrowser() {
    const ua = navigator.userAgent.toLowerCase();
    const isQQBrowser = ua.indexOf('qqbrowser') > -1 || ua.indexOf('mqqbrowser') > -1;
    const isChrome = ua.indexOf('chrome') > -1 && !isQQBrowser;
    
    // 强制所有浏览器使用Chrome的样式
    document.documentElement.classList.add('browser-chrome');
    
    return { isQQBrowser, isChrome };
}

// 在页面加载时执行浏览器检测
const browserInfo = detectBrowser();
console.log('Browser detection:', browserInfo);

// 页面加载动画
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) { // Good practice to check if element exists
            loader.style.display = 'none';
        }
    }, 1000);
});

// 鼠标跟随光效
const cursorGlow = document.getElementById('cursorGlow');
if (cursorGlow) { // Check if element exists
    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;
        
        cursorGlow.style.left = currentX + 'px';
        cursorGlow.style.top = currentY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
}


// 生成星星背景
function createStars() {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return; // Exit if container not found

    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star'; // Class for styling
        star.style.width = Math.random() * 3 + 'px';
        star.style.height = star.style.width;
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        starsContainer.appendChild(star);
    }
}
createStars(); // Call the function

// 侧边栏切换
function toggleSidebar() { // This function is called by onclick attribute in Pug
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar && overlay) { // Check if elements exist
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

// 滚动效果
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const topNav = document.getElementById('topNav');
    
    if (topNav) { // Check if element exists
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            topNav.style.transform = 'translateY(-100%)';
        } else {
            topNav.style.transform = 'translateY(0)';
        }
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
});

// 导航激活状态
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (event) => { // Added event parameter
        // Prevent default if it's an anchor link that shouldn't navigate immediately
        // if (item.querySelector('a[href="#"]')) {
        //     event.preventDefault(); 
        // }
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    });
});

// 工具按钮效果
const toolBtns = document.querySelectorAll('.tool-btn');
toolBtns.forEach(btn => {
    btn.addEventListener('click', function() { // Use function for 'this' context
        // 添加点击反馈
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 100);
    });
});

// 卡片悬停3D效果
const postCards = document.querySelectorAll('.post-card');
postCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Adjust rotation intensity if needed
        const rotateX = (y - centerY) / 20; // Reduced intensity
        const rotateY = (centerX - x) / 20; // Reduced intensity
        
        // Include the hover scale effect from CSS also, or manage it solely via JS
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02) translateZ(10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = ''; // Resets to CSS defined hover/base state
    });
});

// 标签点击波纹效果
const tags = document.querySelectorAll('.tag');
tags.forEach(tag => {
    tag.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent navigation if href="#"
        const ripple = document.createElement('span');
        // Apply styles directly for ripple, or define a class
        ripple.style.position = 'absolute';
        ripple.style.width = '0px'; // Start small
        ripple.style.height = '0px';// Start small
        ripple.style.background = 'rgba(255, 255, 255, 0.3)'; // Softer ripple
        ripple.style.borderRadius = '50%';
        ripple.style.transform = 'translate(-50%, -50%) scale(0)';
        ripple.style.animation = 'rippleEffect 0.6s ease-out'; // Animation defined in Less/CSS
        
        const rect = this.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        
        // Ensure ripple is appended and removed correctly
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// 平滑滚动 (Anchor link scrolling)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const hrefAttribute = this.getAttribute('href');
        if (hrefAttribute === '#') { // Simple hash, often used for placeholder links
            e.preventDefault(); // Prevent jumping to top of page
            // Optionally, do nothing or handle as a non-scrolling click
            return; 
        }

        // Attempt to find target, if it's an ID on the page
        try {
            const targetElement = document.querySelector(hrefAttribute);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
            // If targetElement is not found, browser will handle default anchor behavior (if any)
        } catch (error) {
            // Invalid selector, browser will handle default anchor behavior
            console.warn('Smooth scroll target not found or invalid selector:', hrefAttribute);
        }
    });
});

// Removed the dynamic style injection for rippleEffect as it's better in Less/CSS.
// const style = document.createElement('style');
// style.textContent = `
//     @keyframes rippleEffect {
//         to {
//             transform: translate(-50%, -50%) scale(2);
//             opacity: 0;
//         }
//     }
// `;
// document.head.appendChild(style);

// 性能优化：使用立即执行函数减少全局变量污染
(function() {
  'use strict';

  // 页面加载性能监控
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  console.log('页面加载时间:', pageLoadTime + 'ms');

  // 初始化懒加载
  initLazyLoading();

  // DOM加载完成后执行的函数
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，初始化博客功能');
    
    // 注册Service Worker用于缓存静态资源
    registerServiceWorker();
    
    // 初始化UI交互
    initUIInteractions();
    
    // 优化图片加载
    optimizeImageLoading();

    // 检测浏览器是否支持webp格式
    function checkWebpSupport() {
        const canvas = document.createElement('canvas');
        if (!canvas.getContext || !canvas.getContext('2d')) {
            return false;
        }
        
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    
    const supportsWebp = checkWebpSupport();
    console.log('浏览器支持webp格式:', supportsWebp);

    // 处理图片显示问题
    handleImageDisplay();

    // 处理博客卡片默认封面
    handleBlogCardCovers();

    // 初始化底部操作按钮功能
    initActionButtons();
  });

  /**
   * 注册Service Worker用于缓存静态资源
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      // 检查service-worker.js是否存在
      fetch('/service-worker.js', { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            // 文件存在，注册Service Worker
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
          console.log('ServiceWorker 注册成功，作用域：', registration.scope);
        }).catch(function(error) {
          console.log('ServiceWorker 注册失败：', error);
        });
      });
          } else {
            console.log('ServiceWorker 文件不存在，跳过注册');
          }
        })
        .catch(error => {
          console.log('ServiceWorker 检查失败，跳过注册:', error);
        });
    }
  }

  /**
   * 初始化UI交互
   */
  function initUIInteractions() {
    // 处理侧边栏交互
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (menuBtn) {
      menuBtn.addEventListener('click', toggleSidebar);
    }
    
    if (overlay) {
      overlay.addEventListener('click', toggleSidebar);
    }
    
    // 处理鼠标跟随效果
    const cursorGlow = document.getElementById('cursorGlow');
    if (cursorGlow) {
      document.addEventListener('mousemove', function(e) {
        // 使用requestAnimationFrame提高性能
        requestAnimationFrame(function() {
          cursorGlow.style.left = e.clientX + 'px';
          cursorGlow.style.top = e.clientY + 'px';
        });
      });
    }
  }

  /**
   * 初始化图片懒加载
   */
  function initLazyLoading() {
    // 检查浏览器是否原生支持懒加载
    if ('loading' in HTMLImageElement.prototype) {
      // 浏览器支持原生懒加载
      const lazyImages = document.querySelectorAll('img[loading="lazy"]');
      console.log('使用原生懒加载支持:', lazyImages.length, '张图片');
    } else {
      // 不支持原生懒加载，使用 IntersectionObserver 实现
      const lazyImages = document.querySelectorAll('img[data-src]');
      const imageObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
            }
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      });

      lazyImages.forEach(function(img) {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * 优化图片加载
   */
  function optimizeImageLoading() {
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      // 为所有没有loading属性的图片添加懒加载
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      
      // 错误处理 - 避免重复处理
      if (!img.hasAttribute('data-error-handled')) {
        img.setAttribute('data-error-handled', 'true');
        img.addEventListener('error', function() {
          if (!this.classList.contains('error')) {
            this.classList.add('error');
            console.log('图片加载失败，应用错误样式:', this.src);
          }
        });
      }
    });
  }

  /**
   * 切换侧边栏显示/隐藏
   */
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar && overlay) {
      sidebar.classList.toggle('active');
      overlay.classList.toggle('active');
    }
  }

  // 暴露公共函数到全局，供HTML内联事件使用
  window.toggleSidebar = toggleSidebar;

  /**
   * 优化网络请求批处理
   * @param {Function} callback - 要执行的回调函数
   * @param {number} delay - 延迟时间，默认200ms
   */
  function debounce(callback, delay = 200) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        callback.apply(this, args);
      }, delay);
    };
  }

  // 添加动态资源预加载
  function preloadAssets() {
    // 检查用户是否有快速连接
    if (navigator.connection && navigator.connection.effectiveType.includes('4g')) {
      // 预加载额外资源
      const preloadLinks = [
        { href: '/assets/font/main-font.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { href: '/assets/images/blog/hero-bg.jpg', as: 'image' }
      ];
      
      preloadLinks.forEach(link => {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.href = link.href;
        preloadLink.as = link.as;
        if (link.type) preloadLink.type = link.type;
        if (link.crossorigin) preloadLink.crossOrigin = link.crossorigin;
        document.head.appendChild(preloadLink);
      });
    }
  }

  // 在空闲时执行非关键任务
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadAssets();
      // 其他非关键任务...
    });
  } else {
    // 降级方案
    setTimeout(preloadAssets, 1000);
  }

  // 添加滚动到顶部功能 - 暴露到全局作用域
  window.scrollToTop = function() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // 初始化底部操作按钮功能
  function initActionButtons() {
    console.log('初始化底部操作按钮');
    
    // 获取当前文章ID
    const articleId = window.location.pathname.split('/').pop().replace('.html', '');
    console.log('当前文章ID:', articleId);
    
    // 从localStorage读取用户互动记录
    const userInteractions = JSON.parse(localStorage.getItem('blogInteractions') || '{}');
    const articleInteractions = userInteractions[articleId] || {
      liked: false,
      bookmarked: false,
      commentCount: 0,
      likeCount: 0
    };
    
    // 点赞功能
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn) {
      console.log('找到点赞按钮');
      const likeCounter = likeBtn.querySelector('.action-counter');
      // 初始化点赞计数和状态
      let likeCount = parseInt(localStorage.getItem(`like_count_${articleId}`) || '0');
      likeCounter.textContent = likeCount;
      
      // 恢复用户之前的点赞状态
      if (articleInteractions.liked) {
        likeBtn.classList.add('active');
      }
      
      likeBtn.addEventListener('click', function() {
        console.log('点赞按钮被点击');
        if (this.classList.contains('active')) {
          // 取消点赞
          likeCount = Math.max(0, likeCount - 1);
          this.classList.remove('active');
          articleInteractions.liked = false;
          showToast('已取消点赞');
        } else {
          // 添加点赞
          likeCount++;
          this.classList.add('active');
          articleInteractions.liked = true;
          showToast('感谢点赞 ❤️');
          
          // 点赞动画
          const heart = document.createElement('span');
          heart.innerHTML = '❤️';
          heart.style.position = 'absolute';
          heart.style.top = '50%';
          heart.style.left = '50%';
          heart.style.fontSize = '18px';
          heart.style.transform = 'translate(-50%, -50%)';
          heart.style.pointerEvents = 'none';
          heart.style.opacity = '1';
          heart.style.transition = 'all 0.5s';
          this.appendChild(heart);
          
          setTimeout(() => {
            heart.style.opacity = '0';
            heart.style.transform = 'translate(-50%, -100px)';
            setTimeout(() => heart.remove(), 500);
          }, 50);
        }
        
        // 更新显示的计数
        likeCounter.textContent = likeCount;
        
        // 保存到localStorage
        localStorage.setItem(`like_count_${articleId}`, likeCount);
        
        // 更新用户交互记录
        userInteractions[articleId] = articleInteractions;
        localStorage.setItem('blogInteractions', JSON.stringify(userInteractions));
      });
    } else {
      console.log('未找到点赞按钮');
    }
    
    // 收藏功能
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (bookmarkBtn) {
      console.log('找到收藏按钮');
      const bookmarkCounter = bookmarkBtn.querySelector('.action-counter');
      // 初始化收藏计数和状态
      let bookmarkCount = parseInt(localStorage.getItem(`bookmark_count_${articleId}`) || '0');
      bookmarkCounter.textContent = bookmarkCount;
      
      // 恢复用户之前的收藏状态
      if (articleInteractions.bookmarked) {
        bookmarkBtn.classList.add('active');
      }
      
      bookmarkBtn.addEventListener('click', function() {
        console.log('收藏按钮被点击');
        if (this.classList.contains('active')) {
          // 取消收藏
          bookmarkCount = Math.max(0, bookmarkCount - 1);
          this.classList.remove('active');
          articleInteractions.bookmarked = false;
          showToast('已取消收藏');
        } else {
          // 添加收藏
          bookmarkCount++;
          this.classList.add('active');
          articleInteractions.bookmarked = true;
          showToast('已添加到收藏');
          
          // 收藏动画
          this.classList.add('bookmark-animation');
          setTimeout(() => this.classList.remove('bookmark-animation'), 500);
        }
        
        // 更新显示的计数
        bookmarkCounter.textContent = bookmarkCount;
        
        // 保存到localStorage
        localStorage.setItem(`bookmark_count_${articleId}`, bookmarkCount);
        
        // 更新用户交互记录
        userInteractions[articleId] = articleInteractions;
        localStorage.setItem('blogInteractions', JSON.stringify(userInteractions));
        
        // 更新收藏列表
        updateBookmarksList(articleId, document.title, articleInteractions.bookmarked);
      });
    } else {
      console.log('未找到收藏按钮');
    }
    
    // 评论功能
    const commentBtn = document.getElementById('commentBtn');
    if (commentBtn) {
      console.log('找到评论按钮');
      commentBtn.addEventListener('click', function() {
        console.log('评论按钮被点击');
        // 滚动到评论区
        const commentSection = document.querySelector('#comments') || document.querySelector('.comment-section');
        if (commentSection) {
          commentSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          showToast('评论功能即将上线，敬请期待！');
        }
      });
    } else {
      console.log('未找到评论按钮');
    }
    
    // 分享功能
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      console.log('找到分享按钮');
      shareBtn.addEventListener('click', function() {
        console.log('分享按钮被点击');
        if (navigator.share) {
          // 使用原生分享API
          navigator.share({
            title: document.title,
            url: window.location.href,
            text: document.querySelector('meta[name="description"]')?.content || document.title
          }).catch(error => {
            console.log('分享失败:', error);
            showShareDialog();
          });
        } else {
          // 降级为弹出式分享对话框
          showShareDialog();
        }
      });
    } else {
      console.log('未找到分享按钮');
    }
  }

  // 显示分享对话框
  function showShareDialog() {
    // 检查是否已存在分享对话框
    let shareDialog = document.getElementById('shareDialog');
    if (shareDialog) {
      shareDialog.style.display = 'flex';
      return;
    }
    
    // 创建分享对话框
    shareDialog = document.createElement('div');
    shareDialog.id = 'shareDialog';
    shareDialog.classList.add('share-dialog');
    
    const currentUrl = window.location.href;
    const shareOptions = [
      { name: '复制链接', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>', action: () => copyToClipboard(currentUrl) },
      { name: '微信', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 13.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm7 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.5 2.5c0-1.93-.55-3.73-1.5-5.25-.34.02-.68.03-1.03.03s-.68-.01-1.02-.03c1.21 1.75 1.87 3.93 1.5 6.25h-13C3.71 14.07 5.31 8.5 10 8.5c-.45-1.21-1.5-2.19-2.86-2.43C7.32 6.02 7.66 6 8 6c4.42 0 8 3.58 8 8 0 .71-.11 1.39-.28 2.05.82-.03 1.55-.44 2.06-1.05.15.32.22.67.22 1z"/><path d="M16.65 14.54a3.566 3.566 0 0 0-.79-3.43c-.79-.79-1.96-1.05-3.04-.68l-4.37-4.37c.74-2.5-.56-5.15-3.07-5.93-.32-.1-.65-.14-.99-.14-.68 0-1.35.21-1.9.6-.86.61-1.41 1.55-1.48 2.58-.07 1.03.37 2.08 1.17 2.77L5.86 9.7c-.35 1.09-.09 2.27.7 3.05.54.54 1.3.86 2.12.86.69 0 1.37-.21 1.95-.61l4.31 4.37c-.26.51-.4 1.1-.36 1.73.04.61.27 1.18.64 1.64.37.45.85.8 1.4.98.55.18 1.13.19 1.69.02.56-.17 1.05-.51 1.43-.96.38-.45.61-1.01.66-1.62.05-.59-.1-1.22-.41-1.75l-3.34-3.87z"/></svg>', action: () => showQRCode(currentUrl) },
      { name: '微博', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 8.5h4.95a4.5 4.5 0 1 0 0-9H9v9zm11 3v1.5c0 1.93-.55 3.73-1.5 5.25v.25c0 1.66-1.34 3-3 3h-7a3 3 0 0 1-3-3v-.17c-2.06-1.6-3.5-4.14-3.5-7.08v-1.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5c0 1.93.78 3.68 2 4.88v.12a1 1 0 0 0 1 1h2v-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h2a1 1 0 0 0 1-1V22h-7a5 5 0 0 1-5-5v-.12A7.95 7.95 0 0 1 2 11.5v-1.5c0-1.66 1.34-3 3-3h1a3 3 0 0 1 3 3v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3c0-1.66 1.34-3 3-3h1a3 3 0 0 1 3 3v1.5h-1.5L20 11.5z"/></svg>', action: () => shareToWeibo(document.title, currentUrl) }
    ];
    
    const dialogContent = `
      <div class="share-dialog-content">
        <h3>分享文章</h3>
        <div class="share-options">
          ${shareOptions.map(option => `
            <button class="share-option" data-action="${shareOptions.indexOf(option)}">
              <div class="share-icon">${option.icon}</div>
              <span>${option.name}</span>
            </button>
          `).join('')}
        </div>
        <button class="share-close-btn">关闭</button>
      </div>
    `;
    
    shareDialog.innerHTML = dialogContent;
    document.body.appendChild(shareDialog);
    
    // 绑定事件
    shareDialog.querySelector('.share-close-btn').addEventListener('click', () => {
      shareDialog.style.display = 'none';
    });
    
    const buttons = shareDialog.querySelectorAll('.share-option');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const actionIndex = button.dataset.action;
        shareOptions[actionIndex].action();
      });
    });
    
    // 点击外部关闭
    shareDialog.addEventListener('click', event => {
      if (event.target === shareDialog) {
        shareDialog.style.display = 'none';
      }
    });
    
    // 显示对话框
    shareDialog.style.display = 'flex';
  }

  // 复制文本到剪贴板
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('链接已复制到剪贴板');
      }).catch(err => {
        console.error('无法复制:', err);
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  // 降级复制方案
  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      showToast(successful ? '链接已复制到剪贴板' : '复制失败，请手动复制');
    } catch (err) {
      console.error('fallbackCopy 错误:', err);
      showToast('复制失败，请手动复制');
    }
    
    document.body.removeChild(textArea);
  }

  // 显示二维码
  function showQRCode(url) {
    showToast('微信分享功能即将上线');
    // TODO: 实现二维码生成
  }

  // 分享到微博
  function shareToWeibo(title, url) {
    const shareUrl = `http://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    window.open(shareUrl, '_blank');
  }

  // 更新收藏列表
  function updateBookmarksList(articleId, title, isBookmarked) {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    
    if (isBookmarked) {
      // 添加到收藏列表
      if (!bookmarks.find(b => b.id === articleId)) {
        bookmarks.push({
          id: articleId,
          title: title,
          url: window.location.pathname,
          date: new Date().toISOString()
        });
      }
    } else {
      // 从收藏列表删除
      bookmarks = bookmarks.filter(b => b.id !== articleId);
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }

  // 显示消息提示
  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // 处理图片显示问题
  function handleImageDisplay() {
    console.log('开始处理图片显示问题');
    
    // 1. 处理直接显示为文本的图片URL
    const allElements = document.querySelectorAll('.article-content *');
    allElements.forEach(el => {
      // 检查是否为纯文本元素且文本内容像图片URL
      const content = el.textContent ? el.textContent.trim() : '';
      if (content && (
          content.match(/[a-f0-9]{32}\.(webp|jpg|png)$/i) ||
          content.match(/\.(webp|jpg|png|gif|jpeg)$/i)
        ) &&
        el.childNodes.length === 1 &&
        el.childNodes[0].nodeType === Node.TEXT_NODE) {
          
        console.log('找到可能是图片URL的文本:', content);
        
        // 创建图片容器和图片元素
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container';
        
        const img = document.createElement('img');
        
        // 尝试构造正确的图片路径
        if (content.startsWith('/')) {
          // 已经是相对路径
          img.src = content;
        } else if (content.match(/[a-f0-9]{32}\.(webp|jpg|png)$/i)) {
          // 看起来像是在当前文章目录下的图片
          const articleId = window.location.pathname.split('/').pop().replace('.html', '');
          img.src = `/blog/images/${articleId}/${content}`;
        } else {
          // 默认使用占位图
          img.src = '/assets/placeholder-image.svg';
        }
        
        // 添加错误处理
        img.alt = '文章图片';
        img.setAttribute('data-original-text', content);
        img.setAttribute('data-error-handled', 'true');
        img.onerror = function() {
          if (!this.classList.contains('error')) {
            this.onerror = null;
            this.src = '/assets/placeholder-image.svg';
            this.classList.add('error');
            this.classList.add('svg-image');
          }
        };
        
        imgContainer.appendChild(img);
        
        // 替换元素
        el.parentNode.replaceChild(imgContainer, el);
      }
    });
    
    // 2. 检查图片容器内容
    const imageContainers = document.querySelectorAll('.image-container');
    console.log('找到图片容器:', imageContainers.length);
    
    imageContainers.forEach((container) => {
      // 检查容器是否只有文本内容
      if (!container.querySelector('img') && container.textContent.trim()) {
        const content = container.textContent.trim();
        console.log('图片容器内只有文本:', content);
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建图片元素
        const img = document.createElement('img');
        
        // 尝试构造正确的图片路径
        if (content.match(/[a-f0-9]{32}\.(webp|jpg|png)$/i)) {
          // webp图片
          const articleId = window.location.pathname.split('/').pop().replace('.html', '');
          img.src = `/blog/images/${articleId}/${content}`;
        } else {
          // 使用占位图
          img.src = '/assets/placeholder-image.svg';
        }
        
        // 添加错误处理
        img.alt = '文章图片';
        img.setAttribute('data-text-content', content);
        img.setAttribute('data-error-handled', 'true');
        img.onerror = function() {
          if (!this.classList.contains('error')) {
            this.onerror = null;
            this.src = '/assets/placeholder-image.svg';
            this.classList.add('error');
            this.classList.add('svg-image');
          }
        };
        
        // 添加到容器
        container.appendChild(img);
      }
    });
    
    // 3. 处理所有图片加载错误
    const images = document.querySelectorAll('img');
    console.log('找到图片元素:', images.length);
    
    images.forEach((img) => {
      // 检查是否为SVG图片
      if (img.src.toLowerCase().endsWith('.svg')) {
        console.log('检测到SVG图片:', img.src);
        img.classList.add('svg-image');
        // SVG图片不需要错误处理
        return;
      }

      // 避免重复处理已经处理过的图片
      if (img.hasAttribute('data-error-handled')) {
        return;
      }

      img.setAttribute('data-error-handled', 'true');

      if (img.complete && img.naturalHeight === 0) {
        // 已经加载失败的图片
        console.log('图片已加载失败:', img.src);
        if (!img.classList.contains('error')) {
          img.classList.add('error');

          // 如果不是占位图，则替换为占位图
          if (!img.src.includes('placeholder-image')) {
            img.setAttribute('data-failed-src', img.src);
            img.src = '/assets/placeholder-image.svg';
            img.classList.add('svg-image');
          }
        }
      } else {
        // 添加加载错误处理
        img.addEventListener('error', function() {
          console.log('图片加载失败:', this.src);
          if (!this.classList.contains('error')) {
            this.classList.add('error');

            // 如果不是占位图，则替换为占位图
            if (!this.src.includes('placeholder-image')) {
              this.setAttribute('data-failed-src', this.src);
              this.src = '/assets/placeholder-image.svg';
              this.classList.add('svg-image');
            }
          }
        });
      }
    });
  }

  /**
   * 处理博客卡片默认封面
   */
  function handleBlogCardCovers() {
    console.log('开始处理博客卡片默认封面');

    const blogCards = document.querySelectorAll('.blog-card');
    blogCards.forEach(card => {
      const img = card.querySelector('.blog-card-image img');
      const category = card.getAttribute('data-category');

      if (img && !img.hasAttribute('data-cover-handled')) {
        img.setAttribute('data-cover-handled', 'true');

        // 如果图片加载失败，根据分类设置默认封面
        img.addEventListener('error', function() {
          console.log('博客卡片图片加载失败，设置分类默认封面:', category);

          let defaultCover = '/assets/default-blog-cover.svg';

          switch(category) {
            case '技术分享':
              defaultCover = '/assets/tech-placeholder.svg';
              break;
            case '破解下载':
              defaultCover = '/assets/game-placeholder.svg';
              break;
            case '最新电影':
              defaultCover = '/assets/movie-placeholder.svg';
              break;
            case '心情随笔':
              defaultCover = '/assets/blog-placeholder.svg';
              break;
            default:
              defaultCover = '/assets/default-blog-cover.svg';
          }

          // 避免重复设置
          if (this.src !== defaultCover) {
            this.src = defaultCover;
            this.classList.add('default-cover');
          }
        });

        // 检查是否已经加载失败
        if (img.complete && img.naturalHeight === 0) {
          img.dispatchEvent(new Event('error'));
        }
      }
    });
  }

})();