/**
 * 修复现有文章数据的编码问题
 */
const fs = require('fs');
const path = require('path');

// 数据目录
const dataDir = path.join(__dirname, '../src/blog/data');

// 检查并创建目录
if (!fs.existsSync(dataDir)) {
  console.log(`数据目录 ${dataDir} 不存在，无需修复`);
  process.exit(0);
}

console.log('开始修复文章数据编码...');

// 获取所有JSON文件
const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

if (files.length === 0) {
  console.log('没有找到任何JSON文件需要修复');
  process.exit(0);
}

console.log(`找到 ${files.length} 个JSON文件需要处理`);

// 临时备份文件夹
const backupDir = path.join(__dirname, '../src/blog/data_backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 处理每个文件
files.forEach((file, index) => {
  const filePath = path.join(dataDir, file);
  const backupPath = path.join(backupDir, file);
  
  try {
    console.log(`[${index + 1}/${files.length}] 处理文件: ${file}`);
    
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'binary');
    
    // 备份原始文件
    fs.writeFileSync(backupPath, content, 'binary');
    console.log(`  已备份到 ${backupPath}`);
    
    // 尝试使用UTF-8重新编码
    try {
      // 先尝试解析JSON
      const data = JSON.parse(content);
      
      // 处理标题编码
      if (data.title && typeof data.title === 'string') {
        try {
          // 尝试修复标题编码
          const buffer = Buffer.from(data.title, 'binary');
          const decodedTitle = buffer.toString('utf8');
          if (decodedTitle !== data.title) {
            data.title = decodedTitle;
            console.log(`  修复了标题编码: ${data.title}`);
          }
        } catch (e) {
          console.log(`  无法修复标题编码: ${e.message}`);
        }
      }
      
      // 处理标签编码
      if (Array.isArray(data.tags)) {
        data.tags = data.tags.map(tag => {
          if (typeof tag === 'string') {
            try {
              const buffer = Buffer.from(tag, 'binary');
              return buffer.toString('utf8');
            } catch (e) {
              return tag;
            }
          }
          return tag;
        });
      }
      
      // 处理分类编码
      if (data.category && typeof data.category === 'string') {
        try {
          const buffer = Buffer.from(data.category, 'binary');
          data.category = buffer.toString('utf8');
        } catch (e) {
          console.log(`  无法修复分类编码: ${e.message}`);
        }
      }
      
      // 处理摘要编码
      if (data.summary && typeof data.summary === 'string') {
        try {
          const buffer = Buffer.from(data.summary, 'binary');
          data.summary = buffer.toString('utf8');
        } catch (e) {
          console.log(`  无法修复摘要编码: ${e.message}`);
        }
      }
      
      // 保存修复后的文件
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  成功修复并保存文件: ${file}`);
      
    } catch (parseError) {
      console.error(`  解析JSON失败: ${parseError.message}`);
      
      // 如果JSON解析失败，尝试直接进行编码转换
      try {
        const buffer = Buffer.from(content, 'binary');
        const utf8Content = buffer.toString('utf8');
        fs.writeFileSync(filePath, utf8Content, 'utf8');
        console.log(`  使用二进制到UTF8转换修复文件: ${file}`);
      } catch (convError) {
        console.error(`  编码转换失败: ${convError.message}`);
        // 还原备份
        fs.copyFileSync(backupPath, filePath);
        console.log(`  已还原备份文件`);
      }
    }
    
  } catch (err) {
    console.error(`处理文件失败 ${file}: ${err.message}`);
  }
});

console.log('编码修复完成！'); 