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
    // 注册Service Worker用于缓存静态资源
    registerServiceWorker();
    
    // 初始化UI交互
    initUIInteractions();
    
    // 优化图片加载
    optimizeImageLoading();
  });

  /**
   * 注册Service Worker用于缓存静态资源
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
          console.log('ServiceWorker 注册成功，作用域：', registration.scope);
        }).catch(function(error) {
          console.log('ServiceWorker 注册失败：', error);
        });
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
      
      // 错误处理
      img.addEventListener('error', function() {
        this.classList.add('error');
        // 可以在这里设置备用图片
        // this.src = '/assets/placeholder.jpg';
      });
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
        { href: '/assets/fonts/main-font.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { href: '/assets/images/hero-bg.jpg', as: 'image' }
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

})();