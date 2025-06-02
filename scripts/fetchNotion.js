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
      } else if (text) {
        html += `<div>${text}</div>`;
      }
      // 递归子内容
      if (Array.isArray(block.content) && block.type !== 'transclusion_container') {
        const childrenHtml = block.content.map(renderBlock).join('');
        if (block.type === 'numbered_list') {
          html = `<ol>${html}${childrenHtml}</ol>`;
        } else if (block.type === 'bulleted_list') {
          html = `<ul>${html}${childrenHtml}</ul>`;
        } else {
          html += childrenHtml;
        }
      }
      return html;
    }
    let contentHtml = '';
    const mainBlock = detail[article.id]?.value;
    if (mainBlock && Array.isArray(mainBlock.content)) {
      contentHtml = mainBlock.content.map(renderBlock).join('');
    }

    fs.writeFileSync(
      path.join(dataDir, `${article.id}.json`),
      JSON.stringify({ ...article, detail, contentHtml }, null, 2)
    );
  }));

  console.log('Notion 全量数据已分文件保存到 src/blog/data/');
}

fetchAll(); 