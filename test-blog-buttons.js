// 测试博客详情页按钮功能
console.log('测试博客详情页按钮功能');

// 模拟DOM环境
const mockDocument = {
  getElementById: id => {
    return {
      id,
      innerHTML: '',
      style: {},
      classList: {
        add: () => console.log(`添加类到${id}`),
        remove: () => console.log(`移除类从${id}`),
        toggle: () => console.log(`切换类在${id}`),
        contains: () => false
      },
      querySelector: () => ({ textContent: '0' }),
      addEventListener: (event, callback) => {
        console.log(`为${id}添加${event}事件监听器`);
        // 模拟点击事件
        if (event === 'click') {
          console.log(`测试点击${id}:`);
          callback.call({ 
            classList: {
              add: () => console.log(`添加类到${id}`),
              remove: () => console.log(`移除类从${id}`),
              toggle: () => console.log(`切换类在${id}`),
              contains: () => false
            },
            querySelector: () => ({ textContent: '0' }),
            appendChild: () => console.log(`向${id}添加子元素`)
          });
        }
      }
    };
  },
  createElement: tag => ({
    tag,
    style: {},
    className: '',
    textContent: '',
    focus: () => {},
    select: () => {},
    appendChild: () => {}
  }),
  body: {
    appendChild: () => {},
    classList: {
      toggle: () => console.log('切换body的类'),
      contains: () => false
    }
  },
  querySelector: selector => ({
    addEventListener: (event, callback) => {
      console.log(`为${selector}添加${event}事件监听器`);
      // 模拟点击事件
      if (event === 'click') {
        console.log(`测试点击${selector}:`);
        callback.call({ 
          innerHTML: '🌙',
          classList: {
            add: () => console.log(`添加类到${selector}`),
            remove: () => console.log(`移除类从${selector}`),
            toggle: () => console.log(`切换类在${selector}`),
            contains: () => false
          }
        });
      }
    }
  }),
  querySelectorAll: () => [],
  execCommand: cmd => console.log(`执行命令: ${cmd}`)
};

// 模拟window对象
const mockWindow = {
  location: { 
    pathname: '/blog/test-article.html',
    href: 'https://jiangking.com/blog/test-article.html'
  },
  scrollTo: (opts) => console.log(`滚动到 ${JSON.stringify(opts)}`)
};

// 模拟localStorage
const mockLocalStorage = {
  storage: {},
  getItem: key => mockLocalStorage.storage[key] || null,
  setItem: (key, value) => mockLocalStorage.storage[key] = value
};

// 模拟navigator
const mockNavigator = {
  share: null
};

// 设置全局对象
global.document = mockDocument;
global.window = mockWindow;
global.localStorage = mockLocalStorage;
global.navigator = mockNavigator;
global.alert = msg => console.log(`弹出提示: ${msg}`);
global.Node = { TEXT_NODE: 3 };

// 测试setupActionButtons函数
function setupActionButtons() {
  console.log('设置页面内功能按钮');
  
  // 获取当前文章ID
  const articleId = window.location.pathname.split('/').pop().replace('.html', '');
  console.log('当前文章ID:', articleId);
  
  // 显示消息提示
  function showToast(message) {
    console.log(`显示提示消息: ${message}`);
  }
  
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
    console.log(`当前点赞数: ${likeCount}`);
    
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
      }
      
      // 更新显示的计数
      console.log(`更新点赞数为: ${likeCount}`);
      
      // 保存到localStorage
      localStorage.setItem(`like_count_${articleId}`, likeCount);
      console.log(`保存点赞数到localStorage: ${likeCount}`);
      
      // 更新用户交互记录
      userInteractions[articleId] = articleInteractions;
      localStorage.setItem('blogInteractions', JSON.stringify(userInteractions));
      console.log(`更新用户交互记录: ${JSON.stringify(articleInteractions)}`);
    });
  }
  
  // 收藏功能
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) {
    console.log('找到收藏按钮');
    const bookmarkCounter = bookmarkBtn.querySelector('.action-counter');
    // 初始化收藏计数和状态
    let bookmarkCount = parseInt(localStorage.getItem(`bookmark_count_${articleId}`) || '0');
    console.log(`当前收藏数: ${bookmarkCount}`);
    
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
      }
      
      // 更新显示的计数
      console.log(`更新收藏数为: ${bookmarkCount}`);
      
      // 保存到localStorage
      localStorage.setItem(`bookmark_count_${articleId}`, bookmarkCount);
      console.log(`保存收藏数到localStorage: ${bookmarkCount}`);
      
      // 更新用户交互记录
      userInteractions[articleId] = articleInteractions;
      localStorage.setItem('blogInteractions', JSON.stringify(userInteractions));
      console.log(`更新用户交互记录: ${JSON.stringify(articleInteractions)}`);
    });
  }
  
  // 评论功能
  const commentBtn = document.getElementById('commentBtn');
  if (commentBtn) {
    console.log('找到评论按钮');
    commentBtn.addEventListener('click', function() {
      console.log('评论按钮被点击');
      showToast('评论功能即将上线，敬请期待！');
    });
  }
  
  // 分享功能
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    console.log('找到分享按钮');
    shareBtn.addEventListener('click', function() {
      console.log('分享按钮被点击');
      if (navigator.share) {
        // 使用原生分享API
        console.log('使用原生分享API');
      } else {
        // 降级为弹出式分享对话框
        showShareDialog();
      }
    });
  }
  
  // 回到顶部功能
  const topBtn = document.getElementById('topBtn');
  if (topBtn) {
    console.log('找到回到顶部按钮');
    topBtn.addEventListener('click', function() {
      console.log('回到顶部按钮被点击');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // 显示分享对话框
  function showShareDialog() {
    console.log('显示分享对话框');
    alert('已复制链接到剪贴板，快去分享吧！');
  }
}

console.log('=== 测试底部操作按钮功能 ===');
setupActionButtons();

console.log('\n=== 测试暗色模式切换功能 ===');
// 模拟暗色模式切换
const darkModeBtn = document.querySelector('.nav-btn[title="暗色模式"]');
if (darkModeBtn) {
  darkModeBtn.addEventListener('click', function() {
    document.body.classList.toggle('light-mode');
    const isDarkMode = !document.body.classList.contains('light-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
    this.innerHTML = isDarkMode ? '🌙' : '☀️';
  });
}

console.log('\n=== 测试右上角分享按钮 ===');
// 模拟分享按钮
const shareNavBtn = document.querySelector('.nav-btn[title="分享"]');
if (shareNavBtn) {
  shareNavBtn.addEventListener('click', function() {
    console.log('右上角分享按钮被点击');
    alert('已复制链接到剪贴板，快去分享吧！');
  });
}

console.log('\n测试完成！'); 