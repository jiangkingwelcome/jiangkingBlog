/**
 * GitHub Trending 定时抓取任务
 * 该脚本用于定期更新 GitHub Trending 数据
 * 可以通过 cron 定时执行
 */

const githubService = require('../services/githubService');
const githubTrendingDbService = require('../services/githubTrendingDbService');
const fs = require('fs');
const path = require('path');

// 定义输出目录
const outputDir = path.join(__dirname, '..', 'data', 'github-trending');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 需要抓取的配置
const configurations = [
  // 每日热门，无语言限制
  { language: null, since: 'daily' },
  
  // 每周热门，无语言限制
  { language: null, since: 'weekly' },
  
  // 每月热门，无语言限制
  { language: null, since: 'monthly' },
  
  // 各种语言的每日热门
  { language: 'javascript', since: 'daily' },
  { language: 'typescript', since: 'daily' },
  { language: 'python', since: 'daily' },
  { language: 'java', since: 'daily' },
  { language: 'go', since: 'daily' },
  { language: 'rust', since: 'daily' },
  { language: 'c++', since: 'daily' },
];

/**
 * 主要任务执行函数
 */
async function updateGithubTrending() {
  console.log(`[${new Date().toISOString()}] 开始更新 GitHub Trending 数据...`);
  
  try {
    // 记录更新统计信息
    const stats = {
      success: 0,
      failed: 0,
      total: configurations.length,
      dbStats: {
        totalInserted: 0,
        totalUpdated: 0,
        totalFailed: 0
      }
    };
    
    // 创建更新时间记录
    const updateInfo = {
      lastUpdate: new Date().toISOString(),
      nextScheduledUpdate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4小时后
      status: 'in_progress',
      results: []
    };
    
    // 保存初始进度
    fs.writeFileSync(
      path.join(outputDir, 'update-status.json'), 
      JSON.stringify(updateInfo, null, 2)
    );
    
    // 依次处理每个配置
    for (const config of configurations) {
      const language = config.language || 'all';
      const since = config.since;
      
      try {
        console.log(`[${new Date().toISOString()}] 正在获取 ${language} ${since} 趋势...`);
        
        // 获取数据
        const start = Date.now();
        const repos = await githubService.getTrendingRepos({
          language: config.language,
          since: config.since
        });
        const timeUsed = Date.now() - start;
        
        // 生成文件名
        const fileName = `github-trending-${language}-${since}.json`;
        const filePath = path.join(outputDir, fileName);
        
        // 保存到文件
        fs.writeFileSync(filePath, JSON.stringify(repos, null, 2));
        
        // 保存到数据库
        let dbStats = { inserted: 0, updated: 0, failed: 0 };
        try {
          dbStats = await githubTrendingDbService.saveReposToDb(repos, since);
          stats.dbStats.totalInserted += dbStats.inserted;
          stats.dbStats.totalUpdated += dbStats.updated;
          stats.dbStats.totalFailed += dbStats.failed;
          console.log(`✅ 数据库保存成功: 插入 ${dbStats.inserted}, 更新 ${dbStats.updated}, 失败 ${dbStats.failed}`);
        } catch (dbError) {
          console.error(`❌ 保存到数据库失败:`, dbError);
        }
        
        // 记录结果
        const result = {
          language,
          since,
          count: repos.length,
          timeUsed: `${timeUsed}ms`,
          file: fileName,
          status: 'success',
          dbStats
        };
        
        updateInfo.results.push(result);
        stats.success++;
        
        console.log(`✅ 已更新 ${language} ${since} 趋势: ${repos.length} 个仓库 (${timeUsed}ms)`);
      } catch (error) {
        console.error(`❌ 获取 ${language} ${since} 趋势失败:`, error.message);
        
        updateInfo.results.push({
          language,
          since,
          status: 'error',
          error: error.message
        });
        
        stats.failed++;
      }
      
      // 每次抓取后短暂等待，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 更新最终状态
    updateInfo.status = 'completed';
    updateInfo.summary = `成功: ${stats.success}, 失败: ${stats.failed}, 总数: ${stats.total}, 数据库: ${stats.dbStats.totalInserted}新增/${stats.dbStats.totalUpdated}更新`;
    
    // 保存最终状态
    fs.writeFileSync(
      path.join(outputDir, 'update-status.json'), 
      JSON.stringify(updateInfo, null, 2)
    );
    
    console.log(`[${new Date().toISOString()}] GitHub Trending 数据更新完成! ${updateInfo.summary}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 更新过程中发生错误:`, error);
  }
}

// 立即执行一次抓取
updateGithubTrending().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});

// 导出函数供其他模块使用
module.exports = updateGithubTrending; 