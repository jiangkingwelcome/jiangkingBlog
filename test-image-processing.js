const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function processSpecificArticle() {
  const articleId = '101b99ae-1cea-808b-a9b9-f76ec28ddc76';
  console.log('开始处理文章:', articleId);
  
  const pageUrl = `https://notion-api.splitbee.io/v1/page/${articleId}`;
  const detail = await fetch(pageUrl).then(res => res.json());
  
  console.log('获取到的detail对象包含', Object.keys(detail).length, '个块');
  
  let imageBlockCount = 0;
  for (const blockId in detail) {
    if (detail[blockId]?.value?.type === 'image') {
      imageBlockCount++;
      console.log('发现图片块:', blockId, 'URL:', detail[blockId].value.properties?.source?.[0]?.[0]?.substring(0, 50) + '...');
    }
  }
  
  console.log('总共发现', imageBlockCount, '个图片块');
}

processSpecificArticle().catch(console.error);