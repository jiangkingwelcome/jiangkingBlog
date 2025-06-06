require('dotenv').config();
const fetch = require('node-fetch');

async function testNotionAPI() {
  console.log('测试Notion API令牌...');
  console.log('NOTION_TOKEN存在:', !!process.env.NOTION_TOKEN);
  
  if (!process.env.NOTION_TOKEN) {
    console.log('❌ 未找到NOTION_TOKEN环境变量');
    return;
  }
  
  // 测试页面ID
  const testPageId = '101b99ae-1cea-800e-9c1a-db9f6fea801c';
  
  try {
    const pageUrl = `https://www.notion.so/api/v3/loadPageChunk`;
    const requestBody = {
      pageId: testPageId,
      limit: 100,
      cursor: { stack: [] },
      chunkNumber: 0,
      verticalColumns: false
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`
    };
    
    console.log('发送API请求...');
    const response = await fetch(pageUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    console.log('响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API请求失败:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API请求成功');
    console.log('recordMap存在:', !!data.recordMap);
    console.log('signed_urls存在:', !!data.recordMap?.signed_urls);
    
    if (data.recordMap?.signed_urls) {
      const signedUrlsCount = Object.keys(data.recordMap.signed_urls).length;
      console.log(`📊 获取到 ${signedUrlsCount} 个signed URLs`);
      
      // 显示前3个signed URLs作为示例
      const urls = Object.entries(data.recordMap.signed_urls).slice(0, 3);
      urls.forEach(([original, signed], index) => {
        console.log(`  ${index + 1}. 原始: ${original.substring(0, 50)}...`);
        console.log(`     签名: ${signed.substring(0, 50)}...`);
      });
    } else {
      console.log('⚠️ 未获取到signed URLs');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testNotionAPI();