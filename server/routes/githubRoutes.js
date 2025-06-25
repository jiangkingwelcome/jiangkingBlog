const express = require('express');
const router = express.Router();
const githubService = require('../services/githubService');
const githubTrendingDbService = require('../services/githubTrendingDbService');
const { optionalAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// 缓存数据和时间
let trendingCache = {
  data: {},
  timestamp: {}
};

// 定义GitHub Trending数据存储路径
const trendingDataDir = path.join(__dirname, '..', 'data', 'github-trending');

// 获取热门项目（优先从数据库，然后是本地文件，最后是抓取）
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const { language = '', since = 'daily', useDb = 'true', limit = 25, offset = 0 } = req.query;
    const langKey = language || 'all';
    const cacheKey = `${langKey}-${since}`;
    const shouldUseDb = useDb !== 'false'; // 默认使用数据库
    
    // 如果指定使用数据库
    if (shouldUseDb) {
      try {
        const repos = await githubTrendingDbService.getTrendingRepos({
          language: language || null,
          period: since,
          limit: parseInt(limit) || 25,
          offset: parseInt(offset) || 0
        });
        
        // 如果从数据库获取到了数据，直接返回
        if (repos && repos.length > 0) {
          // 确保数据格式与前端匹配
          const formattedRepos = repos.map(repo => formatRepoForFrontend(repo));
          
          return res.json({
            repos: formattedRepos,
            source: 'database',
            count: repos.length
          });
        }
      } catch (dbError) {
        console.error('从数据库获取GitHub趋势失败，尝试使用文件缓存:', dbError);
        // 数据库查询失败，继续使用文件缓存
      }
    }
    
    // 首先尝试从本地JSON文件读取数据
    const jsonFilePath = path.join(trendingDataDir, `github-trending-${langKey}-${since}.json`);
    
    // 检查文件是否存在及其修改时间
    let fileData = null;
    let fileTimestamp = 0;
    let fileAge = Infinity;
    
    try {
      if (fs.existsSync(jsonFilePath)) {
        // 获取文件修改时间
        const stats = fs.statSync(jsonFilePath);
        fileTimestamp = stats.mtimeMs;
        fileAge = Date.now() - fileTimestamp;
        
        // 如果文件不超过6小时，直接使用文件数据
        if (fileAge < 6 * 60 * 60 * 1000) {  // 6小时缓存
          const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
          fileData = JSON.parse(fileContent);
          
          // 确保数据格式与前端匹配
          fileData = fileData.map(repo => formatRepoForFrontend(repo));
          
          // 如果使用数据库，尝试将文件数据保存到数据库（异步）
          if (shouldUseDb) {
            githubTrendingDbService.saveReposToDb(fileData, since).catch(err => {
              console.error('保存文件数据到数据库失败:', err);
            });
          }
        }
      }
    } catch (fileError) {
      console.error('读取本地JSON文件失败:', fileError);
      // 继续执行，尝试使用内存缓存或抓取新数据
    }
    
    // 如果有有效的文件数据，直接返回
    if (fileData) {
      return res.json({
        repos: fileData,
        source: 'file',
        timestamp: fileTimestamp,
        fileAge: Math.round(fileAge / (60 * 1000)) + ' 分钟'
      });
    }
    
    // 检查内存缓存是否有效(4小时内)
    const now = Date.now();
    const cacheTime = trendingCache.timestamp[cacheKey] || 0;
    const cacheValid = (now - cacheTime) < 4 * 60 * 60 * 1000; // 4小时缓存
    
    let repos;
    
    if (cacheValid && trendingCache.data[cacheKey]) {
      repos = trendingCache.data[cacheKey];
      
      // 确保数据格式与前端匹配
      repos = repos.map(repo => formatRepoForFrontend(repo));
      
      // 如果使用缓存数据，尝试异步写入文件和数据库
      try {
        // 写入文件
        fs.writeFile(jsonFilePath, JSON.stringify(repos, null, 2), (err) => {
          if (err) console.error('更新缓存文件失败:', err);
        });
        
        // 如果使用数据库，将数据保存到数据库（异步）
        if (shouldUseDb) {
          githubTrendingDbService.saveReposToDb(repos, since).catch(err => {
            console.error('保存内存缓存数据到数据库失败:', err);
          });
        }
      } catch (writeError) {
        console.error('写入缓存文件失败:', writeError);
      }
      
      return res.json({
        repos,
        source: 'memory_cache',
        timestamp: cacheTime,
        cacheAge: Math.round((now - cacheTime) / (60 * 1000)) + ' 分钟'
      });
    }
    
    // 抓取新数据
    repos = await githubService.getTrendingRepos({ language, since });
    
    // 确保数据格式与前端匹配
    repos = repos.map(repo => formatRepoForFrontend(repo));
    
    // 更新内存缓存
    trendingCache.data[cacheKey] = repos;
    trendingCache.timestamp[cacheKey] = now;
    
    // 异步保存到文件
    try {
      // 确保目录存在
      if (!fs.existsSync(trendingDataDir)) {
        fs.mkdirSync(trendingDataDir, { recursive: true });
      }
      
      // 异步写入文件，不阻塞响应
      fs.writeFile(jsonFilePath, JSON.stringify(repos, null, 2), (err) => {
        if (err) console.error('保存到文件失败:', err);
      });
      
      // 如果使用数据库，将数据保存到数据库（异步）
      if (shouldUseDb) {
        githubTrendingDbService.saveReposToDb(repos, since).catch(err => {
          console.error('保存抓取数据到数据库失败:', err);
        });
      }
    } catch (writeError) {
      console.error('保存到文件失败:', writeError);
    }
    
    res.json({
      repos,
      source: 'fresh',
      timestamp: now
    });
  } catch (error) {
    console.error('获取GitHub热门项目失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 格式化仓库数据以匹配前端需求
function formatRepoForFrontend(repo) {
  // 确保所有必要的字段都存在
  return {
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName || `${repo.owner}/${repo.name}`,
    url: repo.url || `https://github.com/${repo.owner}/${repo.name}`,
    description: repo.description || '',
    language: repo.language || null,
    languageColor: repo.languageColor || null,
    stars: repo.stars || 0,
    forks: repo.forks || 0,
    starsAdded: repo.starsAdded || repo.starsToday || 0,
    starsToday: repo.starsToday || repo.starsAdded || 0,
    avatarUrl: repo.avatarUrl || `https://github.com/${repo.owner}.png`,
    contributors: Array.isArray(repo.contributors) ? repo.contributors : [],
    isPopular: Boolean(repo.isPopular),
    isFastGrowing: Boolean(repo.isFastGrowing),
    period: repo.period || 'daily',
    label: repo.label || (repo.isPopular ? '🔥 热门' : repo.isFastGrowing ? '⚡ 快速增长' : '')
  };
}

// 获取最近更新状态
router.get('/trending/status', optionalAuth, (req, res) => {
  try {
    const statusFilePath = path.join(trendingDataDir, 'update-status.json');
    
    if (fs.existsSync(statusFilePath)) {
      const statusData = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
      res.json(statusData);
    } else {
      res.status(404).json({ message: '未找到更新状态信息' });
    }
  } catch (error) {
    console.error('获取更新状态失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取支持的语言列表
router.get('/trending/languages', optionalAuth, async (req, res) => {
  try {
    // 尝试从数据库获取语言列表
    try {
      const languages = await githubTrendingDbService.getSupportedLanguages();
      if (languages && languages.length > 0) {
        return res.json({ languages, source: 'database' });
      }
    } catch (dbError) {
      console.error('从数据库获取语言列表失败:', dbError);
    }
    
    // 如果数据库获取失败，从目录中扫描已有的语言数据文件
    const languages = [];
    const uniqueLanguages = new Set();
    
    if (fs.existsSync(trendingDataDir)) {
      const files = fs.readdirSync(trendingDataDir);
      
      files.forEach(file => {
        if (file.startsWith('github-trending-') && file.endsWith('.json') && file !== 'update-status.json') {
          const match = file.match(/github-trending-(.+)-(daily|weekly|monthly)\.json/);
          if (match && match[1] !== 'all') {
            uniqueLanguages.add(match[1]);
          }
        }
      });
      
      uniqueLanguages.forEach(lang => {
        languages.push(lang);
      });
    }
    
    // 如果没有找到语言，提供默认列表
    if (languages.length === 0) {
      languages.push('javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++');
    }
    
    // 按字母顺序排序
    languages.sort();
    
    res.json({ languages, source: 'file' });
  } catch (error) {
    console.error('获取语言列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取GitHub趋势数据库统计信息
router.get('/trending/stats', optionalAuth, async (req, res) => {
  try {
    const stats = await githubTrendingDbService.getTrendingStats();
    res.json(stats);
  } catch (error) {
    console.error('获取GitHub趋势统计失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取特定仓库的历史趋势
router.get('/trending/history/:owner/:name', optionalAuth, async (req, res) => {
  try {
    const { owner, name } = req.params;
    const { period = 'daily', days = 30 } = req.query;
    
    const history = await githubTrendingDbService.getRepoTrendHistory(
      owner, 
      name, 
      period, 
      parseInt(days) || 30
    );
    
    res.json({ history });
  } catch (error) {
    console.error('获取仓库趋势历史失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 