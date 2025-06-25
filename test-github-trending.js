// GitHub Trending数据抓取测试脚本
const githubService = require('./server/services/githubService');
const fs = require('fs');
const path = require('path');

// 确保输出目录存在
const outputDir = path.join(__dirname, 'server', 'data', 'github-trending');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 主测试函数
async function testGithubTrending() {
  try {
    console.log('开始测试GitHub Trending数据抓取...');
    
    // 测试不同的配置
    const testCases = [
      { name: '默认(每日热门)', params: {} },
      { name: '每周热门', params: { since: 'weekly' } },
      { name: 'JavaScript项目', params: { language: 'javascript' } },
      { name: 'Python月榜', params: { language: 'python', since: 'monthly' } }
    ];
    
    // 依次测试每种情况
    for (const test of testCases) {
      console.log(`\n正在获取${test.name}...`);
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 获取数据
      const repos = await githubService.getTrendingRepos(test.params);
      
      // 计算耗时
      const timeUsed = Date.now() - startTime;
      
      console.log(`✅ 成功获取${repos.length}个仓库数据 (耗时: ${timeUsed}ms)`);
      
      // 显示前3个仓库的信息
      console.log('数据样例(前3个仓库):');
      repos.slice(0, 3).forEach((repo, index) => {
        console.log(`\n[${index + 1}] ${repo.fullName}`);
        console.log(`    描述: ${repo.description?.substring(0, 100)}${repo.description?.length > 100 ? '...' : ''}`);
        console.log(`    语言: ${repo.language || '未指定'}`);
        console.log(`    星标: ${repo.stars}, Fork数: ${repo.forks}`);
        if (repo.starsAdded) {
          console.log(`    本${test.params.since === 'weekly' ? '周' : test.params.since === 'monthly' ? '月' : '日'}新增星标: ${repo.starsAdded}`);
        }
      });
      
      // 保存完整数据到文件
      const fileName = path.join(outputDir, `github-trending-${test.params.language || 'all'}-${test.params.since || 'daily'}.json`);
      fs.writeFileSync(fileName, JSON.stringify(repos, null, 2));
      console.log(`已保存完整结果到: ${fileName}`);
    }
    
    console.log('\n✅ 所有测试完成!');
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 执行测试
testGithubTrending(); 