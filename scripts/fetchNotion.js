const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const databaseId = '54a47a0d391d412f912f907d897e52bd';
const tableUrl = `https://notion-api.splitbee.io/v1/table/${databaseId}`;
const dataDir = 'src/blog/data';

async function fetchAll() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

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

  // 每篇文章单独保存详细内容
  await Promise.all(articles.map(async article => {
    const pageUrl = `https://notion-api.splitbee.io/v1/page/${article.id}`;
    const detail = await fetch(pageUrl).then(res => res.json());

    // 生成 contentHtml
    let contentHtml = '';
    const mainBlock = detail[article.id]?.value;
    if (mainBlock && Array.isArray(mainBlock.content)) {
      mainBlock.content.forEach(blockId => {
        const block = detail[blockId]?.value;
        if (!block || !block.type) return;
        const text = block.properties?.title?.map(arr => arr[0]).join('') || '';
        if (!text) return;
        if (block.type === 'header') {
          contentHtml += `<h1>${text}</h1>`;
        } else if (block.type === 'sub_header') {
          contentHtml += `<h2>${text}</h2>`;
        } else if (block.type === 'text') {
          contentHtml += `<p>${text}</p>`;
        } else {
          contentHtml += `<div>${text}</div>`;
        }
      });
    }

    fs.writeFileSync(
      path.join(dataDir, `${article.id}.json`),
      JSON.stringify({ ...article, detail, contentHtml }, null, 2)
    );
  }));

  console.log('Notion 全量数据已分文件保存到 src/blog/data/');
}

fetchAll(); 