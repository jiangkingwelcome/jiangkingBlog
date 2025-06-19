// Service Worker版本号
const CACHE_VERSION = 'v1.0.0';

// 缓存名称
const CACHE_NAME = `jiangking-blog-${CACHE_VERSION}`;

// 需要缓存的静态资源
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/blog/index.html',
  '/about.html',
  '/github-trending.html',
  '/css/blog.css',
  '/js/blog.js',
  '/assets/avatar.jpg',
  '/assets/images/hero-bg.jpg',
  '/assets/fonts/main-font.woff2',
  // 添加其他静态资源
];

// 安装 Service Worker
self.addEventListener('install', event => {
  // 执行安装步骤
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 缓存静态资源');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
  // 清除旧版缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 清除旧缓存 ', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 处理网络请求
self.addEventListener('fetch', event => {
  // 网络优先策略，适合经常更新的内容
  if (event.request.url.includes('/blog/') || event.request.url.includes('/github-trending')) {
    networkFirstStrategy(event);
  } 
  // 缓存优先策略，适合静态资源
  else if (
    event.request.url.includes('/css/') || 
    event.request.url.includes('/js/') || 
    event.request.url.includes('/assets/') ||
    event.request.url.includes('/fonts/')
  ) {
    cacheFirstStrategy(event);
  }
  // 默认网络策略
  else {
    networkWithCacheFallbackStrategy(event);
  }
});

// 网络优先策略
function networkFirstStrategy(event) {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 如果获取成功，复制响应并缓存
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 如果网络请求失败，从缓存中获取
        return caches.match(event.request);
      })
  );
}

// 缓存优先策略
function cacheFirstStrategy(event) {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果在缓存中找到响应，则返回缓存值
        if (cachedResponse) {
          return cachedResponse;
        }
        // 否则请求网络
        return fetch(event.request)
          .then(response => {
            // 请求成功，缓存新资源
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
      })
  );
}

// 网络请求，缓存作为后备
function networkWithCacheFallbackStrategy(event) {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
}

// 预缓存其他资源
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_NEW_ASSET') {
    const urls = event.data.urls;
    if (urls && urls.length) {
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(urls);
      });
    }
  }
}); 