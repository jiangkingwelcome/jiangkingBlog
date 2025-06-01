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
  const metaList = articles.map(({ id, title, date, ...rest }) => ({
    id, title, date, ...rest
  }));
  fs.writeFileSync(path.join(dataDir, 'list.json'), JSON.stringify(metaList, null, 2));

  // 每篇文章单独保存详细内容
  await Promise.all(articles.map(async article => {
    const pageUrl = `https://notion-api.splitbee.io/v1/page/${article.id}`;
    const detail = await fetch(pageUrl).then(res => res.json());
    fs.writeFileSync(
      path.join(dataDir, `${article.id}.json`),
      JSON.stringify({ ...article, detail }, null, 2)
    );
  }));

  console.log('Notion 全量数据已分文件保存到 src/blog/data/');
}

fetchAll(); 