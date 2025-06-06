const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 加载配置
let userConfig = {};
try {
    userConfig = require('../auto-update.config.js');
} catch (error) {
    console.warn('未找到配置文件，使用默认配置');
}

// 合并默认配置和用户配置
const CONFIG = {
    // 更新间隔（毫秒）
    UPDATE_INTERVAL: (userConfig.updateInterval?.[userConfig.environment] || 30) * 60 * 1000,
    // 日志文件路径
    LOG_FILE: path.join(__dirname, '../logs/auto-update.log'),
    // 项目根目录
    PROJECT_ROOT: path.join(__dirname, '..'),
    // 用户配置
    ...userConfig
};

// 统计信息
const STATS = {
    totalUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    lastUpdateTime: null,
    lastSuccessTime: null,
    consecutiveFailures: 0
};

// 确保日志目录存在
const logDir = path.dirname(CONFIG.LOG_FILE);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 日志函数
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    // 写入日志文件
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage);
}

// 执行命令的Promise包装
function executeCommand(command, args, cwd = CONFIG.PROJECT_ROOT) {
    return new Promise((resolve, reject) => {
        log(`执行命令: ${command} ${args.join(' ')}`);
        
        const process = spawn(command, args, {
            cwd,
            stdio: 'pipe',
            shell: true
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                log(`命令执行成功: ${command}`);
                resolve({ stdout, stderr });
            } else {
                log(`命令执行失败: ${command}, 退出码: ${code}`);
                log(`错误信息: ${stderr}`);
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
        
        process.on('error', (error) => {
            log(`命令执行出错: ${command}, 错误: ${error.message}`);
            reject(error);
        });
    });
}

// 检查文件是否存在且有内容
function hasValidData() {
    const dataFile = path.join(CONFIG.PROJECT_ROOT, 'src/blog/data/list.json');
    
    if (!fs.existsSync(dataFile)) {
        return false;
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        return Array.isArray(data) && data.length > 0;
    } catch (error) {
        log(`数据文件解析错误: ${error.message}`);
        return false;
    }
}

// 获取文件修改时间
function getFileModTime(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.mtime;
    } catch (error) {
        return null;
    }
}

// 执行Notion数据获取，带重试机制
async function fetchNotionData(retryCount = CONFIG.notion?.retryCount || 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            log(`获取Notion数据 (尝试 ${attempt}/${retryCount})...`);
            await executeCommand('node', ['scripts/fetchNotionOfficial.js']);
            return true;
        } catch (error) {
            lastError = error;
            log(`获取Notion数据失败 (尝试 ${attempt}/${retryCount}): ${error.message}`);
            
            if (attempt < retryCount) {
                const delay = (CONFIG.notion?.retryDelay || 5) * 1000;
                log(`等待 ${delay/1000} 秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw new Error(`获取Notion数据失败，已重试 ${retryCount} 次: ${lastError?.message}`);
}

// 执行构建，带超时控制
async function buildBlog() {
    const timeoutMinutes = CONFIG.build?.timeout || 10;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    log(`步骤2: 重新构建博客 (超时: ${timeoutMinutes} 分钟)...`);
    
    return Promise.race([
        executeCommand('npm', ['run', 'build']),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`构建超时，已超过 ${timeoutMinutes} 分钟`));
            }, timeoutMs);
        })
    ]);
}

// 健康检查
async function performHealthCheck() {
    try {
        log('执行健康检查...');
        
        // 检查数据文件
        const dataFile = path.join(CONFIG.PROJECT_ROOT, 'src/blog/data/list.json');
        if (!fs.existsSync(dataFile)) {
            throw new Error('数据文件不存在');
        }
        
        // 检查构建输出
        const indexHtml = path.join(CONFIG.PROJECT_ROOT, 'dist/index.html');
        if (!fs.existsSync(indexHtml)) {
            throw new Error('构建输出文件不存在');
        }
        
        // 检查最后更新时间
        if (STATS.lastSuccessTime) {
            const now = new Date();
            const hoursSinceLastSuccess = (now - STATS.lastSuccessTime) / (1000 * 60 * 60);
            if (hoursSinceLastSuccess > 24) {
                log(`警告: 最后成功更新已超过 ${hoursSinceLastSuccess.toFixed(1)} 小时`);
            }
        }
        
        log('健康检查通过 ✅');
        return true;
    } catch (error) {
        log(`健康检查失败 ❌: ${error.message}`);
        return false;
    }
}

// 执行更新流程
async function performUpdate() {
    STATS.totalUpdates++;
    STATS.lastUpdateTime = new Date();
    
    try {
        log('开始执行定时更新...');
        
        // 记录更新前的数据文件修改时间
        const dataFile = path.join(CONFIG.PROJECT_ROOT, 'src/blog/data/list.json');
        const beforeUpdateTime = getFileModTime(dataFile);
        
        // 1. 获取Notion数据
        log('步骤1: 获取Notion数据...');
        await fetchNotionData();
        
        // 检查数据是否有效
        if (!hasValidData()) {
            log('警告: 获取的数据无效或为空，跳过构建步骤');
            STATS.consecutiveFailures++;
            return;
        }
        
        // 检查数据是否有更新
        const afterUpdateTime = getFileModTime(dataFile);
        const hasChanges = !beforeUpdateTime || !afterUpdateTime || 
            beforeUpdateTime.getTime() !== afterUpdateTime.getTime();
            
        if (!hasChanges && CONFIG.build?.skipIfNoChanges) {
            log('数据无变化，跳过构建步骤');
            STATS.successfulUpdates++;
            STATS.lastSuccessTime = new Date();
            STATS.consecutiveFailures = 0;
            return;
        }
        
        log(hasChanges ? '检测到数据更新，开始重新构建...' : '强制重新构建...');
        
        // 2. 重新构建博客
        await buildBlog();
        
        log('✅ 定时更新完成！');
        STATS.successfulUpdates++;
        STATS.lastSuccessTime = new Date();
        STATS.consecutiveFailures = 0;
        
    } catch (error) {
        log(`❌ 更新过程中发生错误: ${error.message}`);
        STATS.failedUpdates++;
        STATS.consecutiveFailures++;
        
        // 检查是否达到错误阈值
        if (CONFIG.monitoring?.errorThreshold && 
            STATS.consecutiveFailures >= CONFIG.monitoring.errorThreshold) {
            log(`警告: 连续失败次数 (${STATS.consecutiveFailures}) 已达到阈值 (${CONFIG.monitoring.errorThreshold})`);
            // 这里可以添加通知逻辑，如发送邮件或其他通知
        }
    }
}

// 生成状态报告
function generateStatusReport() {
    const now = new Date();
    const uptime = process.uptime();
    
    // 格式化运行时间
    const formatUptime = () => {
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        return `${days}天 ${hours}小时 ${minutes}分钟 ${seconds}秒`;
    };
    
    // 计算成功率
    const successRate = STATS.totalUpdates > 0 
        ? ((STATS.successfulUpdates / STATS.totalUpdates) * 100).toFixed(2) 
        : '0.00';
    
    // 格式化最后更新时间
    const formatLastTime = (timestamp) => {
        if (!timestamp) return '从未';
        
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        
        if (minutes < 60) return `${minutes}分钟前`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}小时前`;
        
        const days = Math.floor(hours / 24);
        return `${days}天前`;
    };
    
    return {
        timestamp: now.toISOString(),
        uptime: formatUptime(),
        stats: {
            total: STATS.totalUpdates,
            successful: STATS.successfulUpdates,
            failed: STATS.failedUpdates,
            successRate: `${successRate}%`,
            lastUpdate: formatLastTime(STATS.lastUpdateTime),
            lastSuccess: formatLastTime(STATS.lastSuccessTime),
            consecutiveFailures: STATS.consecutiveFailures
        },
        config: {
            environment: CONFIG.environment || 'development',
            updateInterval: `${CONFIG.UPDATE_INTERVAL / 1000 / 60}分钟`,
            healthCheckEnabled: !!CONFIG.monitoring?.healthCheck
        },
        status: STATS.consecutiveFailures >= (CONFIG.monitoring?.errorThreshold || 3) ? '异常' : '正常'
    };
}

// 打印状态报告
function printStatusReport() {
    const report = generateStatusReport();
    
    log('----------------------------------------');
    log('📊 自动更新服务状态报告');
    log('----------------------------------------');
    log(`运行时间: ${report.uptime}`);
    log(`环境: ${report.config.environment}`);
    log(`更新间隔: ${report.config.updateInterval}`);
    log(`总更新次数: ${report.stats.total}`);
    log(`成功次数: ${report.stats.successful}`);
    log(`失败次数: ${report.stats.failed}`);
    log(`成功率: ${report.stats.successRate}`);
    log(`最后更新: ${report.stats.lastUpdate}`);
    log(`最后成功: ${report.stats.lastSuccess}`);
    log(`连续失败: ${report.stats.consecutiveFailures}`);
    log(`当前状态: ${report.status}`);
    log('----------------------------------------');
    
    return report;
}

// 启动定时更新
function startAutoUpdate() {
    log(`🚀 启动自动更新服务，更新间隔: ${CONFIG.UPDATE_INTERVAL / 1000 / 60} 分钟`);
    
    // 创建定时器集合
    const timers = [];
    
    // 立即执行一次更新
    performUpdate();
    
    // 设置更新定时器
    timers.push(setInterval(performUpdate, CONFIG.UPDATE_INTERVAL));
    
    // 设置健康检查定时器
    if (CONFIG.monitoring?.healthCheck) {
        const healthCheckInterval = (CONFIG.monitoring?.healthCheckInterval || 60) * 60 * 1000;
        log(`启用健康检查，间隔: ${healthCheckInterval / 1000 / 60} 分钟`);
        timers.push(setInterval(performHealthCheck, healthCheckInterval));
    }
    
    // 设置状态报告定时器 (每小时)
    timers.push(setInterval(printStatusReport, 60 * 60 * 1000));
    
    // 优雅关闭处理
    const cleanup = () => {
        log('正在关闭自动更新服务...');
        timers.forEach(timer => clearInterval(timer));
        
        // 打印最终状态报告
        printStatusReport();
        
        log('自动更新服务已停止 👋');
        process.exit(0);
    };
    
    process.on('SIGINT', () => {
        log('收到停止信号 (SIGINT)');
        cleanup();
    });
    
    process.on('SIGTERM', () => {
        log('收到终止信号 (SIGTERM)');
        cleanup();
    });
    
    // 打印初始状态报告
    printStatusReport();
    
    return {
        stop: cleanup,
        getStatus: generateStatusReport
    };
}

// 如果直接运行此脚本
if (require.main === module) {
    startAutoUpdate();
}

module.exports = {
    startAutoUpdate,
    performUpdate,
    CONFIG
};