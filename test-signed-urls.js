require('dotenv').config();
const fetch = require('node-fetch');

async function testSignedUrls() {
  console.log('🔍 检查Notion API token...');
  console.log('NOTION_TOKEN exists:', !!process.env.NOTION_TOKEN);
  console.log('NOTION_TOKEN length:', process.env.NOTION_TOKEN ? process.env.NOTION_TOKEN.length : 0);
  
  if (!process.env.NOTION_TOKEN) {
    console.log('❌ 没有找到NOTION_TOKEN');
    return;
  }
  
  // 测试一个具体的页面ID
  const testPageId = '801ee0f9-18bb-49fa-8529-074d46ab5181';
  
  console.log(`\n🚀 测试获取页面 ${testPageId} 的signed URLs...`);
  
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
    
    console.log('📡 发送API请求...');
    const response = await fetch(pageUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    console.log('📊 响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API请求失败:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API请求成功');
    console.log('📄 recordMap keys:', Object.keys(data.recordMap || {}));
    
    if (data.recordMap && data.recordMap.signed_urls) {
      const signedUrls = data.recordMap.signed_urls;
      console.log(`🔑 获取到 ${Object.keys(signedUrls).length} 个signed URLs`);
      
      // 显示前3个signed URLs
      const keys = Object.keys(signedUrls).slice(0, 3);
      keys.forEach((key, index) => {
        console.log(`  ${index + 1}. ${key.substring(0, 60)}...`);
        console.log(`     -> ${signedUrls[key].substring(0, 60)}...`);
      });
    } else {
      console.log('❌ 没有获取到signed URLs');
      console.log('📋 完整响应结构:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testSignedUrls();