// 使用Fetch API测试点赞功能

// 测试的文章ID
const articleId = 'test-article-id';
// 测试的token，实际中应该是一个有效的JWT token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6InRlc3QiLCJpYXQiOjE2MTYxNjE2MTZ9.TestTokenSignature';

// 通过浏览器内置的fetch API测试
async function testApi() {
  try {
    console.log('测试获取文章统计信息...');
    const statsResponse = await fetch(`http://localhost:3001/api/articles/${articleId}/stats`);
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('文章统计:', statsData);
    } else {
      console.log('获取统计信息失败:', await statsResponse.text());
    }
    
    console.log('\n测试点赞文章...');
    const likeResponse = await fetch(`http://localhost:3001/api/articles/${articleId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (likeResponse.ok) {
      const likeData = await likeResponse.json();
      console.log('点赞结果:', likeData);
    } else {
      console.log('点赞失败:', likeResponse.status, await likeResponse.text());
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 在浏览器控制台中运行此脚本
console.log('请在浏览器中执行此测试');
console.log('将此脚本复制到浏览器控制台中运行');
console.log(`
测试步骤:
1. 打开博客文章页面
2. 打开浏览器开发者工具(F12)
3. 在控制台中粘贴以下代码:

async function testLikeApi() {
  const articleId = document.querySelector('.article-actions').dataset.articleId;
  console.log('文章ID:', articleId);
  
  try {
    // 测试点赞
    const response = await fetch(\`/api/articles/\${articleId}/like\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('点赞响应:', data);
  } catch (error) {
    console.error('请求失败:', error);
  }
}

testLikeApi();
`);

// 如果在Node环境下运行，提示不支持
if (typeof window === 'undefined') {
  console.log('此脚本需要在浏览器环境中运行，而不是Node.js环境');
} 