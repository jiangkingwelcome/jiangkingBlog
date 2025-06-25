/**
 * GitHub趋势数据库服务
 * 提供GitHub趋势数据与数据库交互的功能
 */

const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

class GithubTrendingDbService {
  /**
   * 将GitHub趋势仓库数据存储到数据库
   * @param {Array} repos - 仓库数据数组
   * @param {string} period - 时间周期(daily, weekly, monthly)
   * @returns {Promise<Object>} - 存储结果统计
   */
  async saveReposToDb(repos, period) {
    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      throw new Error('无效的仓库数据');
    }
    
    if (!period || !['daily', 'weekly', 'monthly'].includes(period)) {
      throw new Error('无效的时间周期，必须是daily、weekly或monthly');
    }
    
    const stats = {
      total: repos.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      historyRecorded: 0
    };
    
    const connection = await pool.getConnection();
    
    try {
      // 开始事务
      await connection.beginTransaction();
      const today = new Date().toISOString().split('T')[0]; // 获取当前日期，格式为YYYY-MM-DD
      
      for (const repo of repos) {
        try {
          // 创建唯一ID
          const repoId = `${repo.owner}_${repo.name}_${period}`;
          
          // 保存或更新仓库信息
          const [result] = await connection.execute(`
            INSERT INTO github_trending_repos 
            (id, owner, name, full_name, url, description, language, language_color, stars, forks, stars_added, period, avatar_url, is_popular, is_fast_growing, contributors) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              stars = VALUES(stars),
              forks = VALUES(forks),
              stars_added = VALUES(stars_added),
              description = VALUES(description),
              language_color = VALUES(language_color),
              is_popular = VALUES(is_popular),
              is_fast_growing = VALUES(is_fast_growing),
              contributors = VALUES(contributors),
              last_seen = CURRENT_TIMESTAMP
          `, [
            repoId,
            repo.owner,
            repo.name,
            repo.fullName,
            repo.url,
            repo.description || '',
            repo.language || null,
            repo.languageColor || null,
            repo.stars || 0,
            repo.forks || 0,
            repo.starsAdded || 0,
            period,
            repo.avatarUrl || null,
            repo.isPopular ? 1 : 0,
            repo.isFastGrowing ? 1 : 0,
            JSON.stringify(repo.contributors || [])
          ]);
          
          if (result.affectedRows > 0) {
            if (result.insertId) {
              stats.inserted++;
            } else {
              stats.updated++;
            }
            
            // 记录历史数据
            await connection.execute(`
              INSERT INTO github_trending_history
              (repo_id, stars, forks, stars_added, recorded_date, period)
              VALUES (?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                stars = VALUES(stars),
                forks = VALUES(forks),
                stars_added = VALUES(stars_added)
            `, [
              repoId,
              repo.stars || 0,
              repo.forks || 0,
              repo.starsAdded || 0,
              today,
              period
            ]);
            
            stats.historyRecorded++;
          }
        } catch (repoError) {
          console.error('保存仓库失败:', repoError);
          stats.failed++;
        }
      }
      
      // 提交事务
      await connection.commit();
      return stats;
      
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      console.error('保存GitHub趋势数据失败:', error);
      throw error;
    } finally {
      // 释放连接
      connection.release();
    }
  }
  
  /**
   * 从数据库获取GitHub趋势仓库
   * @param {Object} options - 查询选项
   * @param {string} options.language - 编程语言(可选)
   * @param {string} options.period - 时间周期(daily, weekly, monthly)
   * @param {number} options.limit - 返回结果数量限制(可选，默认25)
   * @param {number} options.offset - 分页偏移量(可选，默认0)
   * @returns {Promise<Array>} - 仓库数据数组
   */
  async getTrendingRepos({ language = null, period = 'daily', limit = 25, offset = 0 } = {}) {
    try {
      let query = `
        SELECT 
          id, owner, name, full_name as fullName, url, description, 
          language, language_color as languageColor, 
          stars, forks, stars_added as starsAdded, 
          stars_added as starsToday,
          period, avatar_url as avatarUrl,
          is_popular as isPopular, is_fast_growing as isFastGrowing,
          contributors,
          first_seen as firstSeen, last_seen as lastSeen
        FROM github_trending_repos
        WHERE period = ?
      `;
      
      const queryParams = [period];
      
      if (language) {
        query += ' AND language = ?';
        queryParams.push(language);
      }
      
      query += ' ORDER BY stars_added DESC, stars DESC';
      
      if (limit > 0) {
        query += ' LIMIT ?';
        queryParams.push(parseInt(limit));
        
        if (offset > 0) {
          query += ' OFFSET ?';
          queryParams.push(parseInt(offset));
        }
      }
      
      const [rows] = await pool.execute(query, queryParams);
      
      // 处理JSON字段
      return rows.map(repo => {
        try {
          // 解析contributors字段
          if (repo.contributors && typeof repo.contributors === 'string') {
            repo.contributors = JSON.parse(repo.contributors);
          } else {
            repo.contributors = [];
          }
          
          // 转换布尔值
          repo.isPopular = Boolean(repo.isPopular);
          repo.isFastGrowing = Boolean(repo.isFastGrowing);
          
          // 添加前端可能需要的其他字段
          repo.label = repo.isPopular ? '🔥 热门' : repo.isFastGrowing ? '⚡ 快速增长' : '';
          
          return repo;
        } catch (e) {
          console.error('处理仓库数据失败:', e);
          return repo;
        }
      });
      
    } catch (error) {
      console.error('获取GitHub趋势数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取支持的编程语言列表
   * @returns {Promise<Array>} - 语言列表
   */
  async getSupportedLanguages() {
    try {
      const [rows] = await pool.execute(`
        SELECT DISTINCT language 
        FROM github_trending_repos 
        WHERE language IS NOT NULL 
        ORDER BY language
      `);
      
      return rows.map(row => row.language);
    } catch (error) {
      console.error('获取语言列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取特定仓库的历史趋势数据
   * @param {string} owner - 仓库所有者
   * @param {string} name - 仓库名称
   * @param {string} period - 时间周期(daily, weekly, monthly)
   * @param {number} days - 获取历史数据的天数(默认30天)
   * @returns {Promise<Array>} - 历史数据数组
   */
  async getRepoTrendHistory(owner, name, period = 'daily', days = 30) {
    try {
      const repoId = `${owner}_${name}_${period}`;
      
      const [rows] = await pool.execute(`
        SELECT 
          h.stars, 
          h.forks, 
          h.stars_added as starsAdded, 
          h.stars_added as starsToday,
          h.recorded_date as date,
          h.period
        FROM github_trending_history h
        WHERE h.repo_id = ?
        AND h.recorded_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
        ORDER BY h.recorded_date
      `, [repoId, days]);
      
      return rows;
    } catch (error) {
      console.error('获取仓库趋势历史数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取GitHub趋势的统计信息
   * @returns {Promise<Object>} - 统计信息
   */
  async getTrendingStats() {
    try {
      // 获取各个时间段的仓库数量
      const [periodCounts] = await pool.execute(`
        SELECT period, COUNT(*) as count
        FROM github_trending_repos
        GROUP BY period
      `);
      
      // 获取语言分布
      const [languageCounts] = await pool.execute(`
        SELECT language, COUNT(*) as count
        FROM github_trending_repos
        WHERE language IS NOT NULL
        GROUP BY language
        ORDER BY count DESC
        LIMIT 20
      `);
      
      // 获取最新更新时间
      const [lastUpdated] = await pool.execute(`
        SELECT MAX(last_seen) as last_updated
        FROM github_trending_repos
      `);
      
      // 获取热门项目和快速增长项目数量
      const [popularStats] = await pool.execute(`
        SELECT 
          SUM(is_popular) as popular_count,
          SUM(is_fast_growing) as fast_growing_count
        FROM github_trending_repos
      `);
      
      return {
        periodCounts: periodCounts.map(item => ({
          period: item.period,
          count: item.count
        })),
        languageCounts: languageCounts.map(item => ({
          language: item.language,
          count: item.count
        })),
        lastUpdated: lastUpdated[0].last_updated,
        popularStats: {
          popularCount: popularStats[0].popular_count || 0,
          fastGrowingCount: popularStats[0].fast_growing_count || 0
        },
        totalRepos: periodCounts.reduce((sum, item) => sum + item.count, 0)
      };
    } catch (error) {
      console.error('获取GitHub趋势统计失败:', error);
      throw error;
    }
  }
}

module.exports = new GithubTrendingDbService(); 