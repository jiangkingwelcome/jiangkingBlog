/**
 * 复制CSS修复文件到dist目录
 */

const fs = require('fs');
const path = require('path');

// 确保目标目录存在
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// 源文件和目标文件路径
const sourceFile = path.join(__dirname, 'src', 'css', 'blog', 'comment-fixes.css');
const targetFile = path.join(__dirname, 'dist', 'css', 'blog', 'comment-fixes.css');

// 确保目标目录存在
ensureDirectoryExistence(targetFile);

// 复制文件
fs.copyFile(sourceFile, targetFile, (err) => {
  if (err) {
    console.error('复制CSS文件失败:', err);
    process.exit(1);
  }
  console.log('CSS修复文件已成功复制到dist目录');
}); 