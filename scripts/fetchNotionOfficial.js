const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 初始化 Notion 客户端
const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY
});

// 配置
const databaseId = process.env.NOTION_DATABASE_ID || '54a47a0d391d412f912f907d897e52bd';
const dataDir = 'src/blog/data';
const imageDir = 'src/blog/images';

// 创建忽略SSL证书错误的HTTPS代理
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// 辅助函数，用于在SVG中转义XML字符
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .substring(0, 100);
}

// 创建本地图片 - 生成占位图片
async function createLocalImage(text, localPath) {
  const dir = path.dirname(localPath);
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const targetPath = localPath.replace(/\.(webp|png|jpg|jpeg|gif)$/i, '.svg');
    console.log(`将占位图保存为SVG格式: ${localPath} -> ${targetPath}`);
    
    const placeholderData = `<svg width="720" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="400" fill="#f0f0f0"/>
  <rect x="20" y="20" width="680" height="360" rx="8" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  <text x="360" y="180" font-family="Arial" font-size="18" text-anchor="middle" fill="#64748b">加载中...</text>
  <text x="360" y="210" font-family="Arial" font-size="14" text-anchor="middle" fill="#94a3b8">${escapeXml(text || "点击重试")}</text>
</svg>`;

    fs.writeFileSync(targetPath, placeholderData);
    console.log(`创建占位图片: ${targetPath}`);
    return targetPath;
  } catch (err) {
    console.error(`创建占位图片失败: ${err.message}`);
    return null;
  }
}

// 从 Notion 官方 API 获取图片的实际 URL
function getImageUrl(block) {
  if (block.type === 'image') {
    if (block.image.type === 'external') {
      return block.image.external.url;
    } else if (block.image.type === 'file') {
      return block.image.file.url;
    }
  }
  return null;
}

// 下载图片并保存到本地
async function downloadImage(url, localPath, retryCount = 0) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!url) {
        console.log('图片URL为空，跳过处理');
        return resolve(null);
      }
      
      // 处理Base64图片
      if (url.startsWith('data:image/')) {
        try {
          const base64Data = url.split(',')[1];
          if (base64Data) {
            const dir = path.dirname(localPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(localPath, Buffer.from(base64Data, 'base64'));
            console.log(`Base64图片已保存: ${localPath}`);
            return resolve(localPath);
          }
        } catch (err) {
          console.error(`处理Base64图片失败: ${err.message}`);
        }
        console.log('Base64图片处理失败，跳过');
        return resolve(null);
      }

      // 检查文件是否已存在
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        console.log(`创建图片目录: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
        console.log(`图片已存在，跳过下载: ${localPath}`);
        return resolve(localPath);
      } else if (fs.existsSync(localPath) && fs.statSync(localPath).size === 0) {
        console.log(`发现空图片文件，将重新下载: ${localPath}`);
        fs.unlinkSync(localPath);
      }

      console.log(`开始下载图片: ${url.substring(0, 50)}... -> ${localPath} (尝试 ${retryCount + 1})`);
      
      // 尝试使用axios下载
      try {
        const response = await axios({
          method: 'get',
          url: url,
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/avif,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': 'https://www.notion.so/'
          },
          maxRedirects: 5
        });
        
        if (response.status === 200 && response.data) {
          fs.writeFileSync(localPath, Buffer.from(response.data));
          console.log(`成功下载图片: ${url.substring(0, 50)}... -> ${localPath}`);
          return resolve(localPath);
        }
      } catch (err) {
        console.error(`axios下载图片失败: ${err.message}`);
      }
      
      // 重试或返回占位图
      if (retryCount < 2) {
        console.log(`重试下载 (${retryCount + 1}/2): ${url.substring(0, 50)}...`);
        setTimeout(() => {
          downloadImage(url, localPath, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, 3000);
      } else {
        console.log(`所有下载方法失败，跳过图片: ${url.substring(0, 50)}...`);
        return resolve(null);
      }
    } catch (err) {
      console.error(`图片处理过程出错: ${url ? url.substring(0, 50) : 'null'}... - ${err.message}`);
      console.log('图片处理出错，跳过');
      return resolve(null);
    }
  });
}

// 从URL生成安全的文件名
function getImageNameFromUrl(url) {
  try {
    if (url.startsWith('/')) {
      const safePath = url.substring(1).replace(/[\/\\:*?"<>|]/g, '_');
      return safePath;
    }
    
    if (url.startsWith('data:image/')) {
      const hash = crypto.createHash('md5').update(url.substring(0, 100)).digest('hex');
      const extension = url.substring(11, url.indexOf(';')) || 'png';
      return `base64_${hash}.${extension}`;
    }
    
    try {
      const urlObj = new URL(url);
      let fileName = path.basename(urlObj.pathname);
      
      if (!path.extname(fileName)) {
        fileName = `${fileName}.png`;
      }
      
      const urlHash = Buffer.from(url).toString('base64')
        .replace(/[/+=]/g, '_')
        .substring(0, 8);
      
      return `${urlHash}_${fileName}`;
    } catch (e) {
      const safeUrl = url.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 30);
      return `img_${Date.now()}_${safeUrl}.png`;
    }
  } catch (e) {
    return `img_${Date.now()}.png`;
  }
}

// 递归获取页面的所有块
async function getPageBlocks(pageId) {
  const blocks = [];
  let cursor = undefined;
  
  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100
    });
    
    blocks.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);
  
  // 递归获取子块
  for (const block of blocks) {
    if (block.has_children) {
      const children = await getPageBlocks(block.id);
      block.children = children;
    }
  }
  
  return blocks;
}

// 处理页面中的所有图片
async function processPageImages(blocks, pageId) {
  const pageImagesDir = path.join(imageDir, pageId);
  
  if (!fs.existsSync(pageImagesDir)) {
    fs.mkdirSync(pageImagesDir, { recursive: true });
  }
  
  console.log(`🖼️ 处理文章 ${pageId} 中的图片...`);
  
  let imageCount = 0;
  
  async function processBlock(block) {
    if (block.type === 'image') {
      imageCount++;
      const imageUrl = getImageUrl(block);
      
      if (!imageUrl) {
        console.log(`  图片块 ${block.id} 没有有效的URL`);
        return;
      }
      
      console.log(`  处理图片块: ${block.id}, URL: ${imageUrl.substring(0, 50)}...`);
      
      const filename = getImageNameFromUrl(imageUrl);
      const localPath = path.join(pageImagesDir, filename);
      
      try {
        const downloadedPath = await downloadImage(imageUrl, localPath);
        if (downloadedPath) {
          console.log(`  ✅ 图片下载成功: ${downloadedPath}`);
          // 保存文件名到块数据中
          block.imageFilename = path.basename(downloadedPath);
        } else {
          console.log(`  ⚠️ 图片下载失败，跳过: ${imageUrl.substring(0, 50)}...`);
          // 不设置imageFilename，让后续处理跳过这个图片
        }
      } catch (error) {
        console.error(`  ❌ 处理图片失败: ${imageUrl}`, error.message);
        console.log(`  ⚠️ 图片处理异常，跳过`);
        // 不设置imageFilename，让后续处理跳过这个图片
      }
    }
    
    // 递归处理子块
    if (block.children) {
      for (const child of block.children) {
        await processBlock(child);
      }
    }
  }
  
  for (const block of blocks) {
    await processBlock(block);
  }
  
  console.log(`📊 图片处理完成: ${imageCount} 个图片`);
  return blocks;
}

// 将 Notion 块转换为 HTML
function blockToHtml(block, pageId) {
  let html = '';
  
  // 获取文本内容
  function getRichText(richTextArray) {
    if (!richTextArray) return '';
    return richTextArray.map(text => {
      let content = text.plain_text;
      
      // 处理格式
      if (text.annotations.bold) content = `<strong>${content}</strong>`;
      if (text.annotations.italic) content = `<em>${content}</em>`;
      if (text.annotations.strikethrough) content = `<del>${content}</del>`;
      if (text.annotations.underline) content = `<u>${content}</u>`;
      if (text.annotations.code) content = `<code>${content}</code>`;
      
      // 处理链接
      if (text.href) content = `<a href="${text.href}">${content}</a>`;
      
      return content;
    }).join('');
  }
  
  // 根据块类型生成HTML
  switch (block.type) {
    case 'paragraph':
      html = `<p>${getRichText(block.paragraph.rich_text)}</p>`;
      break;
      
    case 'heading_1':
      html = `<h1>${getRichText(block.heading_1.rich_text)}</h1>`;
      break;
      
    case 'heading_2':
      html = `<h2>${getRichText(block.heading_2.rich_text)}</h2>`;
      break;
      
    case 'heading_3':
      html = `<h3>${getRichText(block.heading_3.rich_text)}</h3>`;
      break;
      
    case 'bulleted_list_item':
      html = `<li>${getRichText(block.bulleted_list_item.rich_text)}</li>`;
      break;
      
    case 'numbered_list_item':
      html = `<li>${getRichText(block.numbered_list_item.rich_text)}</li>`;
      break;
      
    case 'to_do':
      const checked = block.to_do.checked;
      html = `<div class="todo-item">
                <input type="checkbox" ${checked ? 'checked' : ''} disabled>
                <span>${getRichText(block.to_do.rich_text)}</span>
              </div>`;
      break;
      
    case 'toggle':
      html = `<details>
                <summary>${getRichText(block.toggle.rich_text)}</summary>
                ${block.children ? block.children.map(child => blockToHtml(child, pageId)).join('') : ''}
              </details>`;
      break;
      
    case 'code':
      const language = block.code.language;
      html = `<pre><code class="language-${language}">${getRichText(block.code.rich_text)}</code></pre>`;
      break;
      
    case 'quote':
      html = `<blockquote>${getRichText(block.quote.rich_text)}</blockquote>`;
      break;
      
    case 'divider':
      html = '<hr>';
      break;
      
    case 'image':
      const imageFilename = block.imageFilename;
      if (imageFilename) {
        const imageSrc = `/blog/images/${pageId}/${imageFilename}`;
        html = `<div class="image-container">
                  <img src="${imageSrc}" alt="文章图片" />
                </div>`;
      } else {
        // 图片下载失败时跳过，不生成任何HTML
        html = '';
      }
      break;
      
    case 'video':
      if (block.video.type === 'external') {
        html = `<div class="video-container">
                  <iframe src="${block.video.external.url}" frameborder="0" allowfullscreen></iframe>
                </div>`;
      }
      break;
      
    case 'bookmark':
      html = `<div class="bookmark">
                <a href="${block.bookmark.url}" target="_blank">${block.bookmark.url}</a>
              </div>`;
      break;
      
    case 'callout':
      const icon = block.callout.icon?.emoji || '💡';
      html = `<div class="callout">
                <span class="callout-icon">${icon}</span>
                <div class="callout-content">${getRichText(block.callout.rich_text)}</div>
              </div>`;
      break;
      
    default:
      html = `<div class="unsupported-block">[${block.type}]</div>`;
  }
  
  // 处理子块
  if (block.children && block.children.length > 0) {
    const childrenHtml = block.children.map(child => blockToHtml(child, pageId)).join('');
    
    // 处理列表
    if (block.type === 'bulleted_list_item') {
      html = `<ul>${html}${childrenHtml}</ul>`;
    } else if (block.type === 'numbered_list_item') {
      html = `<ol>${html}${childrenHtml}</ol>`;
    } else if (block.type !== 'toggle') { // toggle已经处理了子块
      html += childrenHtml;
    }
  }
  
  return html;
}

// 清理已经生成的数据
async function cleanAllData() {
  if (fs.existsSync(dataDir)) {
    fs.readdirSync(dataDir).forEach(file => {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(dataDir, file));
      }
    });
  }
}

// 创建占位图片
async function createPlaceholderImages() {
  const assetsDir = 'src/assets';
  const placeholderPath = path.join(assetsDir, 'placeholder-image.svg');
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  if (!fs.existsSync(placeholderPath)) {
    const svgContent = `<svg width="720" height="480" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="480" fill="#f0f0f0"/>
  <rect x="20" y="20" width="680" height="440" rx="8" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  <text x="360" y="180" font-family="Arial" font-size="24" text-anchor="middle" fill="#64748b">图片暂不可用</text>
  <text x="360" y="220" font-family="Arial" font-size="18" text-anchor="middle" fill="#94a3b8">请检查Notion权限或图片源</text>
  <rect x="260" y="320" width="200" height="60" rx="8" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  <text x="360" y="355" font-family="Arial" font-size="18" text-anchor="middle" fill="#64748b">点击重试</text>
</svg>`;
    fs.writeFileSync(placeholderPath, svgContent);
    console.log(`创建了SVG占位图片: ${placeholderPath}`);
  }
}

// 获取数据库中的所有文章
async function fetchAllArticles() {
  console.log('开始清理旧数据...');
  await cleanAllData();
  
  // 确保目录存在
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
  
  // 创建占位图片
  await createPlaceholderImages();
  
  try {
    console.log('正在获取文章列表...');
    
    // 获取数据库中的所有页面
    const pages = [];
    let cursor = undefined;
    
    do {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100
      });
      
      pages.push(...response.results);
      cursor = response.next_cursor;
    } while (cursor);
    
    console.log(`获取到 ${pages.length} 篇文章`);
    
    // 处理每篇文章
    const articles = [];
    for (const page of pages) {
      try {
        // 提取文章元数据
        const properties = page.properties;
        
        const article = {
          id: page.id,
          title: properties.title?.title?.[0]?.plain_text || '无标题',
          date: properties.date?.date?.start || page.created_time,
          tags: properties.tags?.multi_select?.map(tag => tag.name) || [],
          status: properties.status?.select?.name || 'Published',
          type: properties.type?.select?.name || 'Post',
          category: properties.category?.select?.name || '',
          slug: properties.slug?.rich_text?.[0]?.plain_text || '',
          summary: properties.summary?.rich_text?.[0]?.plain_text || '',
          created_time: page.created_time,
          last_edited_time: page.last_edited_time
        };
        
        articles.push(article);
        
        // 创建文章图片目录
        const articleImageDir = path.join(imageDir, article.id);
        if (!fs.existsSync(articleImageDir)) {
          fs.mkdirSync(articleImageDir, { recursive: true });
        }
        
        console.log(`\n处理文章: ${article.title}`);
        
        // 获取文章内容块
        const blocks = await getPageBlocks(article.id);
        
        // 处理图片
        const processedBlocks = await processPageImages(blocks, article.id);
        
        // 生成HTML内容
        const contentHtml = processedBlocks.map(block => blockToHtml(block, article.id)).join('');
        
        // 保存文章详情
        const articleData = {
          ...article,
          blocks: processedBlocks,
          contentHtml
        };
        
        fs.writeFileSync(
          path.join(dataDir, `${article.id}.json`),
          JSON.stringify(articleData, null, 2)
        );
        
        console.log(`✅ 文章 "${article.title}" 处理完成`);
      } catch (error) {
        console.error(`❌ 处理文章失败: ${page.id}`, error.message);
      }
    }
    
    // 保存文章列表
    const metaList = articles.map(({ blocks, contentHtml, ...meta }) => meta);
    fs.writeFileSync(
      path.join(dataDir, 'list.json'),
      JSON.stringify(metaList, null, 2)
    );
    
    console.log(`\n✅ 所有文章处理完成！共处理 ${articles.length} 篇文章`);
  } catch (error) {
    console.error('获取文章失败:', error);
  }
}

// 处理特定文章
async function fetchSpecificArticle(articleId) {
  try {
    console.log(`正在获取文章 ${articleId} 的详细信息...`);
    
    // 确保目录存在
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
    
    // 获取页面信息
    const page = await notion.pages.retrieve({ page_id: articleId });
    
    // 提取文章元数据
    const properties = page.properties;
    const article = {
      id: page.id,
      title: properties.Name?.title?.[0]?.plain_text || '无标题',
      date: properties.Date?.date?.start || new Date().toISOString(),
      tags: properties.Tags?.multi_select?.map(tag => tag.name) || [],
      status: properties.Status?.select?.name || 'Published',
      created_time: page.created_time,
      last_edited_time: page.last_edited_time
    };
    
    // 创建文章图片目录
    const articleImageDir = path.join(imageDir, article.id);
    if (!fs.existsSync(articleImageDir)) {
      fs.mkdirSync(articleImageDir, { recursive: true });
    }
    
    // 获取文章内容块
    const blocks = await getPageBlocks(article.id);
    
    // 处理图片
    const processedBlocks = await processPageImages(blocks, article.id);
    
    // 生成HTML内容
    const contentHtml = processedBlocks.map(block => blockToHtml(block, article.id)).join('');
    
    // 保存文章详情
    const articleData = {
      ...article,
      blocks: processedBlocks,
      contentHtml
    };
    
    fs.writeFileSync(
      path.join(dataDir, `${article.id}.json`),
      JSON.stringify(articleData, null, 2)
    );
    
    console.log(`✅ 文章 "${article.title}" 处理完成`);
  } catch (error) {
    console.error(`❌ 处理文章 ${articleId} 失败:`, error.message);
  }
}

// 主函数
async function main() {
  // 检查环境变量
  if (!process.env.NOTION_TOKEN && !process.env.NOTION_API_KEY) {
    console.error('❌ 错误：未找到 NOTION_TOKEN 或 NOTION_API_KEY 环境变量');
    console.error('请在 .env 文件中设置您的 Notion API 密钥');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  const specificArticleId = args[0];
  
  if (specificArticleId) {
    console.log(`🎯 处理特定文章: ${specificArticleId}`);
    await fetchSpecificArticle(specificArticleId);
  } else {
    console.log('🚀 开始获取所有文章...');
    await fetchAllArticles();
  }
}

// 运行主函数
main().catch(console.error);