const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const axios = require('axios');

// 创建忽略SSL证书错误的HTTPS代理
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const databaseId = '54a47a0d391d412f912f907d897e52bd';
const tableUrl = `https://notion-api.splitbee.io/v1/table/${databaseId}`;
const dataDir = 'src/blog/data';
const imageDir = 'src/blog/images'; // 图片缓存目录

// 创建本地图片 - 生成占位图片
async function createLocalImage(text, localPath) {
  const dir = path.dirname(localPath);
  const imageName = path.basename(localPath);
  const extension = path.extname(localPath).toLowerCase();
  
  try {
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 重要修改：始终使用.svg扩展名保存占位图
    // 这样浏览器可以正确解析SVG内容
    const targetPath = localPath.replace(/\.(webp|png|jpg|jpeg|gif)$/i, '.svg');
    console.log(`将占位图保存为SVG格式: ${localPath} -> ${targetPath}`);
    
    // 创建一个SVG格式的占位图（更友好的展示效果）
    // 使用简单的纯色背景，减小体积，占用更少资源
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
    // 创建失败时返回null，使用备用图片策略
    return null;
  }
}

// 辅助函数，用于在SVG中转义XML字符
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .substring(0, 100); // 限制长度
}

// 实现类似NotionNext的图片URL映射逻辑
function mapImageUrl(url, block = null, recordMap = null) {
  if (!url) return null;
  
  // 处理相对路径
  if (url.startsWith('/')) {
    return `https://www.notion.so${url}`;
  }
  
  // 处理data URI
  if (url.startsWith('data:')) {
    return url;
  }
  
  // 检查是否有signed URLs（类似NotionNext的逻辑）
  if (recordMap && recordMap.signed_urls && block && recordMap.signed_urls[block.id]) {
    console.log(`使用signed URL: ${block.id}`);
    return recordMap.signed_urls[block.id];
  }
  
  // 关键修复：对于所有外部图片URL，直接返回原始URL
  // 根据搜索结果，Notion的图片代理格式可能不正确，先尝试直接下载
  if (url.startsWith('http')) {
    return url;
  }
  
  // 兜底处理
  return url;
}

// 下载图片并保存到本地
// 下载图片函数，增强版 - 参考NotionNext实现
async function downloadImage(url, localPath, retryCount = 0, block = null, recordMap = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // 使用mapImageUrl处理URL
      const mappedUrl = mapImageUrl(url, block, recordMap);
      console.log(`准备下载图片: ${mappedUrl ? mappedUrl.substring(0, 50) : 'null'}...`);
      
      if (!mappedUrl) {
        console.log('图片URL为空，创建占位图');
        return resolve(createLocalImage("URL为空", localPath));
      }
      
      // 处理Base64图片
      if (mappedUrl.startsWith('data:image/')) {
        try {
          const base64Data = mappedUrl.split(',')[1];
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
        return resolve(createLocalImage("Base64图片失败", localPath));
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
        // 删除空文件，重新下载
        console.log(`发现空图片文件，将重新下载: ${localPath}`);
        fs.unlinkSync(localPath);
      }

      console.log(`开始下载图片: ${url.substring(0, 50)}... -> ${localPath} (尝试 ${retryCount + 1})`);
      
      // 准备请求参数
      let actualUrl = url;
      let isNotionS3 = url.includes('s3.us-west-2.amazonaws.com') || 
                       url.includes('prod-files-secure.s3') || 
                       url.includes('secure.notion-static.com');
      
      // 针对WebP格式检测
      const isWebpUrl = url.toLowerCase().includes('.webp');
      const targetPath = isWebpUrl ? 
        localPath.replace(/\.webp$/i, '.png') : 
        localPath;
        
      // 尝试多种下载方法
      let downloadSuccess = false;
      
      // 方法1: 使用axios下载
      if (!downloadSuccess) {
        try {
          console.log(`尝试使用axios下载: ${mappedUrl.substring(0, 50)}...`);
          const response = await axios({
            method: 'get',
            url: mappedUrl,
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/avif,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              'Sec-Fetch-Dest': 'image',
              'Sec-Fetch-Mode': 'no-cors',
              'Sec-Fetch-Site': 'cross-site',
              'Referer': 'https://www.notion.so/',
              'Origin': 'https://www.notion.so'
            },
            maxRedirects: 5
          });
          
          if (response.status === 200 && response.data) {
            // 检查响应内容是否为错误信息
            const responseText = Buffer.from(response.data).toString();
            if (responseText.includes('<Error>') || responseText.includes('AccessDenied') || responseText.includes('<Code>')) {
              console.error(`axios下载返回错误响应: ${responseText.substring(0, 100)}...`);
              throw new Error('下载返回错误响应');
            }
            
            fs.writeFileSync(targetPath, Buffer.from(response.data));
            console.log(`成功通过axios下载图片: ${url.substring(0, 50)}... -> ${targetPath}`);
            downloadSuccess = true;
            return resolve(targetPath);
          }
        } catch (err) {
          console.error(`axios下载图片失败: ${err.message}`);
        }
      }
      
      // 方法2: Notion S3链接特殊处理 - 直接使用https.get绕过限制
      if (!downloadSuccess && isNotionS3) {
        try {
          console.log(`使用直接HTTPS请求下载Notion图片: ${mappedUrl.substring(0, 50)}...`);
          
          // 使用原生https.get方法下载S3内容
          const protocol = mappedUrl.startsWith('https:') ? https : http;
          const req = protocol.get(mappedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
              'Referer': 'https://www.notion.so/',
              'Origin': 'https://www.notion.so',
            },
            // 增加超时时间
            timeout: 30000,
            // 忽略SSL错误
            rejectUnauthorized: false
          });
          
          await new Promise((resolveReq, rejectReq) => {
            const chunks = [];
            
            req.on('response', (res) => {
              if (res.statusCode !== 200) {
                rejectReq(new Error(`HTTP请求错误: ${res.statusCode}`));
                return;
              }
              
              res.on('data', (chunk) => chunks.push(chunk));
              res.on('end', () => {
                try {
                  const buffer = Buffer.concat(chunks);
                  if (buffer.length > 0) {
                    // 检查响应内容是否为错误信息
                    const responseText = buffer.toString();
                    if (responseText.includes('<Error>') || responseText.includes('AccessDenied') || responseText.includes('<Code>')) {
                      console.error(`S3下载返回错误响应: ${responseText.substring(0, 100)}...`);
                      rejectReq(new Error('S3下载返回错误响应'));
                      return;
                    }
                    
                    fs.writeFileSync(targetPath, buffer);
                    console.log(`成功下载S3图片: ${url.substring(0, 50)}... -> ${targetPath}`);
                    downloadSuccess = true;
                    resolveReq();
                  } else {
                    rejectReq(new Error('下载的图片数据为空'));
                  }
                } catch (err) {
                  rejectReq(new Error(`保存S3图片失败: ${err.message}`));
                }
              });
            });
            
            req.on('error', (err) => {
              rejectReq(new Error(`S3图片请求错误: ${err.message}`));
            });
            
            req.on('timeout', () => {
              req.destroy();
              rejectReq(new Error(`S3图片请求超时`));
            });
            
            // 确保请求被发送
            req.end();
          }).then(() => {
            if (downloadSuccess) {
              return resolve(targetPath);
            }
          }).catch((err) => {
            console.error(err.message);
          });
        } catch (err) {
          console.error(`S3图片HTTPS请求失败: ${err.message}`);
        }
      }
      
      // 方法3: 使用fetch方法下载
      if (!downloadSuccess) {
        try {
          // 准备请求参数
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': mappedUrl.includes('unsplash.com') ? 'https://unsplash.com/' : 'https://www.notion.so/'
          };
          
          // 尝试直接下载
          console.log(`尝试使用fetch下载: ${mappedUrl.substring(0, 50)}...`);
          const response = await fetch(mappedUrl, { 
            headers,
            redirect: 'follow',
            timeout: 30000,
            agent: mappedUrl.startsWith('https') ? httpsAgent : null
          });
          
          if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
          }
          
          const buffer = await response.buffer();
          if (buffer.length > 0) {
            // 检查响应内容是否为错误信息
            const responseText = buffer.toString();
            if (responseText.includes('<Error>') || responseText.includes('AccessDenied') || responseText.includes('<Code>')) {
              console.error(`fetch下载返回错误响应: ${responseText.substring(0, 100)}...`);
              throw new Error('fetch下载返回错误响应');
            }
            
            fs.writeFileSync(targetPath, buffer);
            console.log(`成功通过fetch下载图片: ${url.substring(0, 50)}... -> ${targetPath}`);
            downloadSuccess = true;
            return resolve(targetPath);
          } else {
            throw new Error('下载的图片数据为空');
          }
        } catch (err) {
          console.error(`fetch下载图片失败: ${err.message}`);
        }
      }
      
      // 方法4: 尝试使用图片代理服务
      if (!downloadSuccess) {
        try {
          const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(mappedUrl)}`;
          console.log(`尝试通过代理下载: ${proxyUrl.substring(0, 50)}...`);
          
          const proxyResponse = await fetch(proxyUrl, { 
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
            },
            timeout: 30000
          });
          
          if (!proxyResponse.ok) {
            throw new Error(`HTTP错误: ${proxyResponse.status} ${proxyResponse.statusText}`);
          }
          
          const buffer = await proxyResponse.buffer();
          if (buffer.length > 0) {
            // 检查响应内容是否为错误信息
            const responseText = buffer.toString();
            if (responseText.includes('<Error>') || responseText.includes('AccessDenied') || responseText.includes('<Code>')) {
              console.error(`代理下载返回错误响应: ${responseText.substring(0, 100)}...`);
              throw new Error('代理下载返回错误响应');
            }
            
            fs.writeFileSync(targetPath, buffer);
            console.log(`成功通过代理下载图片: ${url.substring(0, 50)}... -> ${targetPath}`);
            downloadSuccess = true;
            return resolve(targetPath);
          } else {
            throw new Error('代理下载的图片数据为空');
          }
        } catch (proxyErr) {
          console.error(`代理下载图片失败: ${proxyErr.message}`);
        }
      }
      
      // 方法5: 尝试使用另一个代理服务
      if (!downloadSuccess) {
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(mappedUrl)}`;
          console.log(`尝试通过AllOrigins代理下载: ${proxyUrl.substring(0, 50)}...`);
          
          const proxyResponse = await fetch(proxyUrl, { 
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
            },
            timeout: 30000
          });
          
          if (!proxyResponse.ok) {
            throw new Error(`HTTP错误: ${proxyResponse.status} ${proxyResponse.statusText}`);
          }
          
          const buffer = await proxyResponse.buffer();
          if (buffer.length > 0) {
            // 检查响应内容是否为错误信息
            const responseText = buffer.toString();
            if (responseText.includes('<Error>') || responseText.includes('AccessDenied') || responseText.includes('<Code>')) {
              console.error(`AllOrigins代理下载返回错误响应: ${responseText.substring(0, 100)}...`);
              throw new Error('AllOrigins代理下载返回错误响应');
            }
            
            fs.writeFileSync(targetPath, buffer);
            console.log(`成功通过AllOrigins代理下载图片: ${url.substring(0, 50)}... -> ${targetPath}`);
            downloadSuccess = true;
            return resolve(targetPath);
          } else {
            throw new Error('AllOrigins代理下载的图片数据为空');
          }
        } catch (proxyErr) {
          console.error(`AllOrigins代理下载图片失败: ${proxyErr.message}`);
        }
      }
      
      // 方法6: 尝试使用Notion专用代理
      if (!downloadSuccess && mappedUrl.includes('notion')) {
        try {
          // 构建Notion专用代理URL
          const notionProxyUrl = `https://www.notion.so/image/${encodeURIComponent(mappedUrl)}`;
          console.log(`尝试通过Notion官方代理下载: ${notionProxyUrl.substring(0, 50)}...`);
          
          const notionResponse = await fetch(notionProxyUrl, { 
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
              'Referer': 'https://www.notion.so/'
            },
            timeout: 30000
          });
          
          if (!notionResponse.ok) {
            throw new Error(`HTTP错误: ${notionResponse.status} ${notionResponse.statusText}`);
          }
          
          const buffer = await notionResponse.buffer();
          if (buffer.length > 0) {
            // 检查响应内容是否为错误信息
            const responseText = buffer.toString();
            if (responseText.includes('<Error>') || responseText.includes('AccessDenied') || responseText.includes('<Code>')) {
              console.error(`Notion官方代理下载返回错误响应: ${responseText.substring(0, 100)}...`);
              throw new Error('Notion官方代理下载返回错误响应');
            }
            
            fs.writeFileSync(targetPath, buffer);
            console.log(`成功通过Notion官方代理下载图片: ${url.substring(0, 50)}... -> ${targetPath}`);
            downloadSuccess = true;
            return resolve(targetPath);
          } else {
            throw new Error('Notion官方代理下载的图片数据为空');
          }
        } catch (notionProxyErr) {
          console.error(`Notion官方代理下载图片失败: ${notionProxyErr.message}`);
        }
      }
      
      // 所有方法都失败，重试或返回默认图
      if (!downloadSuccess) {
        if (retryCount < 2) {
          console.log(`重试下载 (${retryCount + 1}/2): ${mappedUrl.substring(0, 50)}...`);
          setTimeout(() => {
            downloadImage(url, localPath, retryCount + 1, block, recordMap)
              .then(resolve)
              .catch(reject);
          }, 3000); // 延迟3秒后重试
        } else {
          console.log(`所有下载方法失败，使用占位图: ${mappedUrl.substring(0, 50)}...`);
          // 创建SVG占位图并返回正确的SVG路径
          const svgPath = await createLocalImage("下载失败", localPath);
          return resolve(svgPath);
        }
      }
    } catch (err) {
      console.error(`图片处理过程出错: ${mappedUrl ? mappedUrl.substring(0, 50) : 'null'}... - ${err.message}`);
      const svgPath = await createLocalImage("处理错误", localPath);
      return resolve(svgPath);
    }
  });
}

// 从URL生成安全的文件名
function getImageNameFromUrl(url) {
  try {
    // 处理相对路径
    if (url.startsWith('/')) {
      const safePath = url.substring(1).replace(/[\/\\:*?"<>|]/g, '_');
      return safePath;
    }
    
    // 处理data URI
    if (url.startsWith('data:image/')) {
      const hash = crypto.createHash('md5').update(url.substring(0, 100)).digest('hex');
      const extension = url.substring(11, url.indexOf(';')) || 'png';
      return `base64_${hash}.${extension}`;
    }
    
    try {
      const urlObj = new URL(url);
      let fileName = path.basename(urlObj.pathname);
      
      // 如果没有扩展名，添加默认扩展名
      if (!path.extname(fileName)) {
        fileName = `${fileName}.png`;
      }
      
      // 加入URL哈希前缀防止重名
      const urlHash = Buffer.from(url).toString('base64')
        .replace(/[/+=]/g, '_')
        .substring(0, 8);
      
      return `${urlHash}_${fileName}`;
    } catch (e) {
      // URL解析失败时使用备用方案
      const safeUrl = url.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 30);
      return `img_${Date.now()}_${safeUrl}.png`;
    }
  } catch (e) {
    // 完全失败时的兜底方案
    return `img_${Date.now()}.png`;
  }
}

// 清理已经生成的数据
async function cleanAllData() {
  // 清理所有JSON文件
  const dataPattern = path.join(dataDir, '*.json');
  if (fs.existsSync(dataDir)) {
    fs.readdirSync(dataDir).forEach(file => {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(dataDir, file));
      }
    });
  }
}

// 处理页面中所有图片，进行下载
async function processBlockImages(blocks, pageId, detail) {
  // 创建保存图片的目录
  const dataDir = path.join(__dirname, '../src/blog/data');
  const imagesDir = path.join(__dirname, '../src/blog/images');
  const pageImagesDir = path.join(imagesDir, pageId);
  
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(pageImagesDir)) fs.mkdirSync(pageImagesDir, { recursive: true });
  
  console.log(`🖼️ 处理文章 ${pageId} 中的图片...`);
  
  // 遍历blocks，查找图片
  let imageCount = 0;
  for (const [blockId, block] of Object.entries(blocks)) {
    if (!block.value) continue;
    
    // 处理transclusion_container，递归处理其内容
    if (block.value.type === 'transclusion_container' && Array.isArray(block.value.content)) {
      for (const contentBlockId of block.value.content) {
        if (detail[contentBlockId]) {
          // 递归处理嵌套块，并将处理结果更新回detail对象
          const processedBlocks = await processBlockImages({ [contentBlockId]: detail[contentBlockId] }, pageId, detail);
          // 更新原始detail对象中的块
          if (processedBlocks[contentBlockId]) {
            detail[contentBlockId] = processedBlocks[contentBlockId];
          }
        }
      }
    }
    
    if (block.value.type === 'image') {
      imageCount++;
      
      // 获取图片URL
      const imageUrl = block.value.properties?.source?.[0]?.[0];
      if (!imageUrl) continue;
      
      console.log(`  处理图片块: ${blockId}, URL: ${imageUrl.substring(0, 50)}...`);
      
      // 生成文件名
      let filename = '';
      if (imageUrl.includes('/')) {
        // 网络URL，使用基于URL的哈希作为文件名
        const urlHash = Buffer.from(imageUrl).toString('base64').replace(/[/+=]/g, '_').substring(0, 12);
        // 获取原始扩展名，如果没有则使用.png
        const originalExt = path.extname(imageUrl) || '.png';
        filename = `${urlHash}${originalExt}`;
      } else {
        // 本地图片，使用原始名称
        filename = path.basename(imageUrl);
      }
      
      // 本地文件路径
      const localPath = path.join(pageImagesDir, filename);
      
      try {
        // 尝试下载图片
        console.log(`  下载图片: ${imageUrl.substring(0, 50)}... => ${localPath}`);
        
        try {
          // 使用增强版downloadImage函数下载图片 - 传递block和detail参数以支持signed URLs
          const downloadedPath = await downloadImage(imageUrl, localPath, 0, block.value, detail);
          console.log(`  ✅ 图片下载成功或创建了占位图: ${downloadedPath}`);
          
          // 更新文件名，使用下载后的实际路径
          // 这很重要，因为如果是占位图，扩展名会变成.svg
          filename = path.basename(downloadedPath);
          
          // 非常重要：将文件名保存到block中，以便在渲染时使用
          block.value.imageFilename = filename;
        } catch (downloadError) {
          console.error(`  ❌ 图片下载完全失败: ${imageUrl}`, downloadError.message);
          
          // 创建占位图片（作为最后的备用方案）
          const placeholderDir = path.join(__dirname, '../src/assets');
          const placeholderPath = path.join(placeholderDir, 'placeholder-image.svg');
          
          if (fs.existsSync(placeholderPath)) {
            // 创建SVG占位图 - 始终使用.svg扩展名
            const svgPath = path.join(pageImagesDir, `${path.basename(filename, path.extname(filename))}.svg`);
            fs.copyFileSync(placeholderPath, svgPath);
            console.log(`  ⚠️ 创建备用占位图: ${svgPath}`);
            
            // 更新文件名为SVG
            filename = path.basename(svgPath);
            block.value.imageFilename = filename;
          }
        }
      } catch (error) {
        console.error(`  ❌ 处理图片失败: ${imageUrl}`, error.message);
        
        // 确保即使在完全失败的情况下也设置一个占位图
        const placeholderDir = path.join(__dirname, '../src/assets');
        const placeholderPath = path.join(placeholderDir, 'placeholder-image.svg');
        
        if (fs.existsSync(placeholderPath)) {
          // 创建SVG占位图 - 始终使用.svg扩展名
          const svgPath = path.join(pageImagesDir, `fallback_${Date.now()}.svg`);
          fs.copyFileSync(placeholderPath, svgPath);
          console.log(`  🔄 创建最终备用占位图: ${svgPath}`);
          
          // 更新文件名为SVG
          filename = path.basename(svgPath);
          block.value.imageFilename = filename;
        }

      }
    }
  }
  
  console.log(`📊 图片处理完成: ${imageCount} 个图片`);
  return blocks;
}

async function fetchAll() {
  console.log('开始清理旧数据...');
  await cleanAllData();

  // 确保目录存在
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });

  // 创建assets目录和占位图片
  const assetsDir = 'src/assets';
  const placeholderPath = path.join(assetsDir, 'placeholder-image.svg');
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // 如果占位图片不存在，创建SVG占位图
  if (!fs.existsSync(placeholderPath)) {
    try {
      // 创建一个SVG占位图
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
      
      // 也创建PNG版本作为兼容备份
      const placeholderPngPath = path.join(assetsDir, 'placeholder-image.png');
      if (!fs.existsSync(placeholderPngPath)) {
        // 创建一个简单的彩色PNG占位图
        const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(placeholderPngPath, transparentPixel);
        console.log(`创建了PNG占位图片: ${placeholderPngPath}`);
      }
    } catch (err) {
      console.error(`创建占位图片失败: ${err.message}`);
    }
  }

  try {
    console.log('正在获取文章列表...');
    const table = await fetch(tableUrl).then(res => res.json());
    const articles = table.filter(row => row.id);

    // 只保存元数据到 list.json
    const metaList = articles.map(({ id, title, date, tags, ...rest }) => ({
      id,
      title,
      date,
      // 修正 tags 字段，去除空字符串
      tags: Array.isArray(tags) ? tags.filter(t => t && t.trim() !== '') : [],
      ...rest
    }));
    fs.writeFileSync(path.join(dataDir, 'list.json'), JSON.stringify(metaList, null, 2));

    // 预先创建所有文章的图片目录
    articles.forEach(article => {
      const articleImageDir = path.join(imageDir, article.id);
      if (!fs.existsSync(articleImageDir)) {
        try {
          fs.mkdirSync(articleImageDir, { recursive: true });
          console.log(`已创建文章图片目录: ${articleImageDir}`);
        } catch (err) {
          console.error(`创建文章图片目录失败: ${article.id} - ${err.message}`);
        }
      }
    });

    // 每篇文章单独保存详细内容
    let processedCount = 0;
    await Promise.all(articles.map(async article => {
      try {
        // 确保文章图片目录存在
        const articleImageDir = path.join(imageDir, article.id);
        if (!fs.existsSync(articleImageDir)) {
          fs.mkdirSync(articleImageDir, { recursive: true });
        }

        const pageUrl = `https://notion-api.splitbee.io/v1/page/${article.id}`;
        const detail = await fetch(pageUrl).then(res => res.json());

        // 处理文章中的所有图片
        console.log(`开始处理文章 ${article.id} 的图片...`);
        
        // 正确调用processBlockImages，传递整个detail对象
        const updatedBlocks = await processBlockImages(detail, article.id, detail);
        
        // 将更新后的blocks合并回detail对象
        Object.assign(detail, updatedBlocks);
        
        console.log(`文章 ${article.id} 的图片处理完成`);

        // 生成 contentHtml（递归处理所有 block）
        function renderBlock(blockId) {
          const block = detail[blockId]?.value;
          if (!block || !block.type) return '';
          // 处理 transclusion_container，递归其 content
          if (block.type === 'transclusion_container' && Array.isArray(block.content)) {
            return block.content.map(renderBlock).join('');
          }
          // 处理有 title 的块
          const text = block.properties?.title?.map(arr => arr[0]).join('') || '';
          let html = '';
          if (block.type === 'header') {
            html += `<h1>${text}</h1>`;
          } else if (block.type === 'sub_header') {
            html += `<h2>${text}</h2>`;
          } else if (block.type === 'text') {
            html += `<p>${text}</p>`;
          } else if (block.type === 'numbered_list') {
            html += `<li>${text}</li>`;
          } else if (block.type === 'bulleted_list') {
            html += `<li>${text}</li>`;
          } else if (block.type === 'image') {
            // 处理图片块
            let imageUrl = block.properties?.source?.[0]?.[0] || '';
            const localImagePath = block.value?.imageFilename || block.imageFilename || '';
            
            // 创建图片容器
            html += `<div class="image-container">`;
            
            // 如果有本地图片路径，使用它
            if (localImagePath && localImagePath !== '') {
              // 构建正确的相对路径
              const imageSrc = `/blog/images/${article.id}/${localImagePath}`;
              
              // 检查文件扩展名，如果是SVG，直接使用，不需要错误处理
              // 因为我们已经确保占位图是有效的SVG
              if (localImagePath.toLowerCase().endsWith('.svg')) {
                html += `<img src="${imageSrc}" alt="文章图片" class="svg-image" />`;
              } else {
                // 对于非SVG图片，添加错误处理
                html += `<img src="${imageSrc}" alt="文章图片" 
                         onerror="this.onerror=null; this.src='/assets/placeholder-image.svg'; this.classList.add('error');" />`;
              }
            } else if (imageUrl && imageUrl !== '') {
              // 尝试使用原始URL，但添加错误处理
              html += `<img src="${imageUrl}" alt="文章图片" 
                       onerror="this.onerror=null; this.src='/assets/placeholder-image.svg'; this.classList.add('error');" />`;
            } else {
              // 没有可用的图片源，使用占位图片
              html += `<img src="/assets/placeholder-image.svg" alt="占位图片" class="svg-image" />`;
            }
            
            html += `</div>`;
          } else if (block.type === 'quote') {
            html += `<blockquote>${text}</blockquote>`;
          } else if (block.type === 'code') {
            html += `<pre><code>${text}</code></pre>`;
          } else if (block.type === 'todo') {
            const checked = block.properties?.checked?.[0]?.[0] === 'Yes';
            html += `<div class="todo-item">
                      <input type="checkbox" ${checked ? 'checked' : ''} disabled>
                      <span>${text}</span>
                    </div>`;
          } else if (block.type === 'divider') {
            html += `<hr>`;
          } else if (block.type === 'page') {
            html += `<div class="page-link">${text}</div>`;
          } else {
            // 其他不支持的块类型
            html += `<div class="unsupported-block">${text}</div>`;
          }
          // 递归处理子内容
          if (Array.isArray(block.content)) {
            if (['bulleted_list', 'numbered_list'].includes(block.type)) {
              html = `<ul>${html}${block.content.map(renderBlock).join('')}</ul>`;
            } else if (block.content.length > 0) {
              html += `<div class="nested-content">${block.content.map(renderBlock).join('')}</div>`;
            }
          }
          return html;
        }
        let contentHtml = '';
        const mainBlock = detail[article.id]?.value;
        if (mainBlock && Array.isArray(mainBlock.content)) {
          contentHtml = mainBlock.content.map(renderBlock).join('');
        }

        // 保存文章详情到JSON文件
        fs.writeFileSync(
          path.join(dataDir, `${article.id}.json`),
          JSON.stringify({ ...article, detail, contentHtml }, null, 2)
        );
        console.log(`  文章详情已保存到 ${path.join(dataDir, `${article.id}.json`)}`);
        processedCount++;
      } catch (error) {
        console.error(`处理文章失败: ${article.id}`, error);
      }
    }));

    console.log('Notion 全量数据已分文件保存到 src/blog/data/');
  } catch (err) {
    console.error(`获取文章列表失败: ${err.message}`);
  }
}

// 主函数 - 支持命令行参数
async function main() {
  const args = process.argv.slice(2);
  const specificArticleId = args[0];
  
  if (specificArticleId) {
    console.log(`🎯 处理特定文章: ${specificArticleId}`);
    await fetchSpecificArticle(specificArticleId);
  } else {
    console.log('🚀 开始获取所有文章...');
    await fetchAll();
  }
}

// 处理特定文章的函数
async function fetchSpecificArticle(articleId) {
  try {
    console.log(`正在获取文章 ${articleId} 的详细信息...`);
    
    // 确保目录存在
    const dataDir = path.join(__dirname, '../src/blog/data');
    const imageDir = path.join(__dirname, '../src/blog/images');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    
    // 创建文章图片目录
    const articleImageDir = path.join(imageDir, articleId);
    if (!fs.existsSync(articleImageDir)) {
      fs.mkdirSync(articleImageDir, { recursive: true });
      console.log(`已创建文章图片目录: ${articleImageDir}`);
    }
    
    // 获取文章详情
    const pageUrl = `https://notion-api.splitbee.io/v1/page/${articleId}`;
    const detail = await fetch(pageUrl).then(res => res.json());
    
    console.log(`🖼️ 开始处理文章 ${articleId} 中的图片...`);
    
    // 处理文章中的所有图片
    // processBlockImages期望接收整个detail对象，而不是单个block
    const updatedBlocks = await processBlockImages(detail, articleId, detail);
    
    // 将更新后的blocks合并回detail对象
    Object.assign(detail, updatedBlocks);
    
    console.log(`🔍 调试信息: detail对象包含 ${Object.keys(detail).length} 个块`);
    
    // 检查是否有图片块
    let imageBlockCount = 0;
    for (const blockId in detail) {
      if (detail[blockId]?.value?.type === 'image') {
        imageBlockCount++;
        console.log(`📸 发现图片块: ${blockId}, URL: ${detail[blockId].value.properties?.source?.[0]?.[0]?.substring(0, 50)}...`);
      }
    }
    console.log(`📊 总共发现 ${imageBlockCount} 个图片块`);
    
    console.log(`✅ 文章 ${articleId} 的图片处理完成`);
    
    // 保存文章详情
    fs.writeFileSync(
      path.join(dataDir, `${articleId}.json`),
      JSON.stringify(detail, null, 2)
    );
    console.log(`📄 文章详情已保存到 ${path.join(dataDir, `${articleId}.json`)}`);
    
  } catch (error) {
    console.error(`❌ 处理文章 ${articleId} 失败:`, error.message);
  }
}

// 运行主函数
main().catch(console.error);
