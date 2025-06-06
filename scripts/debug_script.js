const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 诊断特定图片URL的下载问题
async function diagnoseImageDownload(imageUrl, articleId = 'test') {
  console.log(`\n🔍 开始诊断图片下载问题`);
  console.log(`📷 图片URL: ${imageUrl}`);
  console.log(`📁 文章ID: ${articleId}`);
  
  // 1. 分析URL类型
  console.log(`\n=== URL分析 ===`);
  if (imageUrl.startsWith('data:')) {
    console.log(`✅ 类型: Base64数据URI`);
  } else if (imageUrl.includes('amazonaws.com') || imageUrl.includes('s3.')) {
    console.log(`☁️ 类型: Amazon S3存储`);
  } else if (imageUrl.includes('notion.so') || imageUrl.includes('notion-static.com')) {
    console.log(`📄 类型: Notion官方图片`);
  } else if (imageUrl.includes('unsplash.com')) {
    console.log(`🖼️ 类型: Unsplash图片`);
  } else {
    console.log(`🌐 类型: 其他外部图片`);
  }
  
  // 2. 测试不同的访问方法
  const methods = [
    {
      name: '直接访问',
      url: imageUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    },
    {
      name: 'Notion代理',
      url: `https://www.notion.so/image/${encodeURIComponent(imageUrl)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.notion.so/'
      }
    },
    {
      name: 'WeServ代理',
      url: `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  ];
  
  console.log(`\n=== 访问测试 ===`);
  for (const method of methods) {
    try {
      console.log(`\n🔄 测试: ${method.name}`);
      console.log(`🌐 URL: ${method.url.substring(0, 100)}...`);
      
      const response = await fetch(method.url, {
        method: 'HEAD', // 只获取头部信息，不下载内容
        headers: method.headers,
        timeout: 10000
      });
      
      console.log(`📊 状态码: ${response.status} ${response.statusText}`);
      console.log(`📏 内容长度: ${response.headers.get('content-length') || '未知'}`);
      console.log(`🏷️ 内容类型: ${response.headers.get('content-type') || '未知'}`);
      
      if (response.status === 200) {
        console.log(`✅ 访问成功!`);
        
        // 如果成功，尝试获取前100字节查看内容
        try {
          const testResponse = await fetch(method.url, {
            headers: method.headers,
            timeout: 10000
          });
          
          const buffer = await testResponse.buffer();
          const preview = buffer.toString('utf8', 0, Math.min(100, buffer.length));
          
          if (preview.includes('<') && (preview.includes('Error') || preview.includes('AccessDenied'))) {
            console.log(`⚠️ 但返回的是错误响应: ${preview}`);
          } else if (buffer.length > 0) {
            console.log(`✅ 内容正常，文件大小: ${buffer.length} bytes`);
          }
        } catch (contentErr) {
          console.log(`⚠️ 获取内容时出错: ${contentErr.message}`);
        }
      } else {
        console.log(`❌ 访问失败`);
      }
      
    } catch (err) {
      console.log(`❌ 请求失败: ${err.message}`);
    }
  }
  
  // 3. 检查本地环境
  console.log(`\n=== 本地环境检查 ===`);
  const testDir = path.join(__dirname, '../src/blog/images', articleId);
  
  try {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
      console.log(`✅ 创建测试目录: ${testDir}`);
    } else {
      console.log(`✅ 测试目录已存在: ${testDir}`);
    }
    
    // 测试写入权限
    const testFile = path.join(testDir, 'test-write.txt');
    fs.writeFileSync(testFile, 'test content');
    fs.unlinkSync(testFile);
    console.log(`✅ 目录写入权限正常`);
    
  } catch (err) {
    console.log(`❌ 本地环境问题: ${err.message}`);
  }
  
  // 4. 给出建议
  console.log(`\n=== 建议 ===`);
  if (imageUrl.includes('amazonaws.com') || imageUrl.includes('s3.')) {
    console.log(`💡 S3图片可能需要签名URL，建议检查API返回的signed_urls字段`);
  }
  if (imageUrl.includes('notion')) {
    console.log(`💡 Notion图片建议使用官方代理: https://www.notion.so/image/...`);
  }
  console.log(`💡 如果所有方法都失败，可能是图片权限问题，建议使用占位图`);
}

// 批量诊断函数
async function diagnoseBatch(imageUrls, articleId = 'test') {
  console.log(`\n🔍 批量诊断 ${imageUrls.length} 个图片URL`);
  
  for (let i = 0; i < imageUrls.length; i++) {
    console.log(`\n--- 图片 ${i + 1}/${imageUrls.length} ---`);
    await diagnoseImageDownload(imageUrls[i], articleId);
    
    // 避免请求过于频繁
    if (i < imageUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 检查特定文章的图片URL
async function checkArticleImages(articleId) {
  console.log(`\n📄 检查文章 ${articleId} 的图片`);
  
  try {
    // 从保存的JSON文件中读取文章数据
    const dataDir = path.join(__dirname, '../src/blog/data');
    const articleFile = path.join(dataDir, `${articleId}.json`);
    
    if (!fs.existsSync(articleFile)) {
      console.log(`❌ 文章文件不存在: ${articleFile}`);
      return;
    }
    
    const articleData = JSON.parse(fs.readFileSync(articleFile, 'utf8'));
    const detail = articleData.detail || {};
    
    // 提取所有图片URL
    const imageUrls = [];
    for (const [blockId, block] of Object.entries(detail)) {
      if (block?.value?.type === 'image') {
        const imageUrl = block.value.properties?.source?.[0]?.[0];
        if (imageUrl) {
          imageUrls.push(imageUrl);
          console.log(`🖼️ 发现图片: ${blockId} -> ${imageUrl.substring(0, 80)}...`);
        }
      }
    }
    
    if (imageUrls.length === 0) {
      console.log(`📭 文章中没有发现图片`);
      return;
    }
    
    console.log(`📊 总共发现 ${imageUrls.length} 个图片`);
    
    // 逐个诊断
    await diagnoseBatch(imageUrls, articleId);
    
  } catch (err) {
    console.error(`❌ 检查文章图片时出错: ${err.message}`);
  }
}

// 导出诊断函数
module.exports = {
  diagnoseImageDownload,
  diagnoseBatch,
  checkArticleImages
};

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
使用方法:
  node debug_script.js <imageUrl>                    # 诊断单个图片URL
  node debug_script.js article <articleId>          # 检查特定文章的所有图片
  
示例:
  node debug_script.js "https://example.com/image.jpg"
  node debug_script.js article "abc123def456"
    `);
  } else if (args[0] === 'article' && args[1]) {
    checkArticleImages(args[1]).catch(console.error);
  } else {
    diagnoseImageDownload(args[0]).catch(console.error);
  }
}