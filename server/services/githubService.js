const axios = require('axios');
const cheerio = require('cheerio');

class GithubService {
  /**
   * 获取GitHub热门项目列表
   * @param {Object} options - 查询选项
   * @param {string} options.language - 编程语言
   * @param {string} options.since - 时间周期(daily, weekly, monthly)
   * @returns {Array} - 热门项目列表
   */
  async getTrendingRepos({ language = '', since = 'daily' } = {}) {
    try {
      // 构建URL
      let url = 'https://github.com/trending';
      
      if (language) {
        url += `/${encodeURIComponent(language)}`;
      }
      
      url += `?since=${since}`;
      
      // 发送请求
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        }
      });
      
      // 使用cheerio解析HTML
      const $ = cheerio.load(response.data);
      const repos = [];
      
      // 解析仓库信息
      $('article.Box-row').each((i, elem) => {
        try {
          // 提取仓库所有者和名称
          const titleElem = $(elem).find('h2 a');
          const repoPath = titleElem.attr('href').substring(1); // 移除开头的斜杠
          const [owner, name] = repoPath.split('/');
          
          // 提取描述
          const description = $(elem).find('p').text().trim();
          
          // 提取语言
          const langElem = $(elem).find('[itemprop="programmingLanguage"]');
          const language = langElem.text().trim();
          const languageColor = $(elem).find('.repo-language-color').css('background-color');
          
          // 提取星标数
          const starsText = $(elem).find('a[href$="/stargazers"]').text().trim();
          const stars = this.parseCount(starsText);
          
          // 提取fork数
          const forksText = $(elem).find('a[href$="/forks"]').text().trim();
          const forks = this.parseCount(forksText);
          
          // 提取本周期新增star数
          const starsAddedText = $(elem).find('.d-inline-block.float-sm-right').text().trim();
          const starsAdded = this.parseCount(starsAddedText.split(' ')[0]);
          
          // 尝试提取贡献者头像
          const contributors = [];
          $(elem).find('.avatar-user').each((i, avatar) => {
            if (i < 5) { // 最多获取5个贡献者头像
              contributors.push($(avatar).attr('src'));
            }
          });
          
          // 构建仓库对象，匹配前端数据结构
          repos.push({
            owner,
            name,
            fullName: `${owner}/${name}`,
            url: `https://github.com/${repoPath}`,
            description,
            language,
            languageColor,
            stars,
            forks,
            starsAdded,
            starsToday: starsAdded, // 添加与前端匹配的字段
            avatarUrl: `https://github.com/${owner}.png`,
            contributors, // 添加贡献者头像
            // 添加前端可能需要的其他字段
            isPopular: stars > 10000, // 是否热门项目
            isFastGrowing: starsAdded > 100, // 是否快速增长
            period: since // 添加时间周期信息
          });
        } catch (err) {
          console.error('解析仓库时出错:', err);
        }
      });
      
      return repos;
    } catch (error) {
      console.error('获取GitHub热门仓库列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 解析数字文本(如"1.2k")
   * @param {string} text - 数字文本
   * @returns {number} - 解析后的数字
   */
  parseCount(text) {
    if (!text) return 0;
    
    text = text.replace(',', '');
    
    if (text.includes('k')) {
      return parseFloat(text.replace('k', '')) * 1000;
    }
    
    return parseInt(text, 10) || 0;
  }
}

module.exports = new GithubService(); 