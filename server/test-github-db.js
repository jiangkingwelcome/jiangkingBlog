/**
 * 测试GitHub趋势数据保存到数据库的功能
 */
const fs = require('fs');
const path = require('path');
const { testConnection, initDatabase } = require('./db');
const githubTrendingDbService = require('./services/githubTrendingDbService');

// 定义数据目录
const dataDir = path.join(__dirname, 'data', 'github-trending');

// 从文件中读取数据
async function loadDataFromFile(language, since) {
  const langKey = language || 'all';
  const fileName = `github-trending-${langKey}-${since}.json`;
  const filePath = path.join(dataDir, fileName);
  
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { data, fileName };
  }
  
  return { data: null, fileName };
}

// 主测试函数
async function testDatabaseStorage() {
  try {
    console.log('开始测试GitHub趋势数据库存储...');
    
    // 首先测试数据库连接
    console.log('测试数据库连接...');
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ 数据库连接失败，请检查配置');
      return;
    }
    console.log('✅ 数据库连接成功');
    
    // 初始化数据库表
    console.log('初始化数据库表...');
    const initialized = await initDatabase();
    if (!initialized) {
      console.error('❌ 数据库表初始化失败');
      return;
    }
    console.log('✅ 数据库表初始化成功');
    
    // 测试数据集
    const testCases = [
      { language: null, since: 'daily', description: '每日全部' },
      { language: 'javascript', since: 'daily', description: 'JavaScript每日' }
    ];
    
    // 测试每个数据集
    for (const test of testCases) {
      console.log(`\n测试 ${test.description} 数据的数据库存储...`);
      
      // 从文件加载数据
      const { data, fileName } = await loadDataFromFile(test.language, test.since);
      if (!data) {
        console.log(`❌ 未找到文件 ${fileName}，跳过此测试`);
        continue;
      }
      
      console.log(`从 ${fileName} 加载了 ${data.length} 条记录`);
      
      // 保存到数据库
      console.time('数据库保存耗时');
      try {
        const result = await githubTrendingDbService.saveReposToDb(data, test.since);
        console.timeEnd('数据库保存耗时');
        
        console.log('✅ 保存成功:', result);
        
        // 从数据库重新查询
        console.time('数据库查询耗时');
        const dbData = await githubTrendingDbService.getTrendingRepos({
          language: test.language,
          period: test.since,
          limit: 100
        });
        console.timeEnd('数据库查询耗时');
        
        console.log(`✅ 从数据库查询到 ${dbData.length} 条记录`);
        
        // 打印第一条记录作为示例
        if (dbData.length > 0) {
          console.log('示例记录:', JSON.stringify(dbData[0], null, 2));
        }
        
      } catch (error) {
        console.error('❌ 数据库操作失败:', error);
      }
    }
    
    // 测试统计功能
    console.log('\n测试数据库统计功能...');
    try {
      const stats = await githubTrendingDbService.getTrendingStats();
      console.log('✅ 获取统计信息成功:', JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error);
    }
    
    // 测试语言列表
    console.log('\n测试语言列表功能...');
    try {
      const languages = await githubTrendingDbService.getSupportedLanguages();
      console.log(`✅ 支持的语言列表 (${languages.length}):`);
      console.log(languages);
    } catch (error) {
      console.error('❌ 获取语言列表失败:', error);
    }
    
    console.log('\n测试完成!');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 执行测试
testDatabaseStorage().catch(error => {
  console.error('测试失败:', error);
}); 