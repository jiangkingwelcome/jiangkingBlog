const fs = require('fs');
const path = require('path');
const pug = require('pug');

// 确保dist目录存在
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 读取配置
const config = require('./config.json');

// 编译Pug模板
try {
  console.log('尝试编译GitHub热门项目页面...');
  
  const pugFilePath = path.join(__dirname, 'src', 'page', 'html', 'github-trending.pug');
  console.log(`模板路径: ${pugFilePath}`);
  
  if (!fs.existsSync(pugFilePath)) {
    console.error(`错误：找不到模板文件 ${pugFilePath}`);
    process.exit(1);
  }
  
  const compiledFunction = pug.compileFile(pugFilePath);
  const html = compiledFunction({ config });
  
  // 写入编译后的HTML到dist目录
  const outputPath = path.join(distDir, 'github-trending.html');
  fs.writeFileSync(outputPath, html);
  
  console.log(`成功生成GitHub热门项目页面: ${outputPath}`);
} catch (error) {
  console.error('编译过程中出错:', error);
  process.exit(1);
} 