const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    LOG_FILE: path.join(__dirname, '../logs/incremental-update.log'),
    // 项目根目录
    PROJECT_ROOT: path.join(__dirname, '..'),
    // 临时构建目录
    TEMP_BUILD_DIR: path.join(__dirname, '../temp-build'),
    // 增量更新配置
    incremental: {
        enabled: true,
        // 检查文件变化的间隔（秒）
        checkInterval: 60,
        // 原子更新（先构建到临时目录，再原子性替换）
        atomicUpdate: true,
        // 备份目录
        backupDir: path.join(__dirname, '../backup'),
        // 最大备份数量
        maxBackups: 5
    },
    // 用户配置
    ...userConfig
};

// 统计信息
const STATS = {
    totalUpdates: 0,
    incrementalUpdates: 0,
    fullUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    lastUpdateTime: null,
    lastSuccessTime: null,
    consecutiveFailures: 0,
    filesChanged: [],
    lastDataHash: null
};

// 确保必要目录存在
function ensureDirectories() {
    // 确保增量配置存在
    if (!CONFIG.incremental) {
        CONFIG.incremental = {
            enabled: true,
            atomicUpdate: true,
            checkInterval: 60,
            maxBackups: 5,
            backupDir: path.join(__dirname, '../backup')
        };
    }
    
    // 确保backupDir存在
    if (!CONFIG.incremental.backupDir) {
        CONFIG.incremental.backupDir = path.join(__dirname, '../backup');
    }
    
    const dirs = [
        path.dirname(CONFIG.LOG_FILE),
        CONFIG.TEMP_BUILD_DIR,
        CONFIG.incremental.backupDir
    ];
    
    dirs.forEach(dir => {
        if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// 日志函数
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    // 写入日志文件
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage);
}

// 计算文件哈希
function calculateFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
        return null;
    }
}

// 计算数据变化
function analyzeDataChanges() {
    const dataFile = path.join(CONFIG.PROJECT_ROOT, 'src/blog/data/list.json');
    
    if (!fs.existsSync(dataFile)) {
        return { hasChanges: false, changeType: 'none' };
    }
    
    const currentHash = calculateFileHash(dataFile);
    
    if (!STATS.lastDataHash) {
        STATS.lastDataHash = currentHash;
        return { hasChanges: true, changeType: 'initial' };
    }
    
    if (currentHash !== STATS.lastDataHash) {
        // 分析具体变化
        const changes = analyzeSpecificChanges(dataFile);
        STATS.lastDataHash = currentHash;
        return { hasChanges: true, changeType: 'update', changes };
    }
    
    return { hasChanges: false, changeType: 'none' };
}

// 分析具体文章变化
function analyzeSpecificChanges(dataFile) {
    try {
        const currentData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        const backupDataFile = path.join(CONFIG.incremental.backupDir, 'last-data.json');
        
        let previousData = [];
        if (fs.existsSync(backupDataFile)) {
            previousData = JSON.parse(fs.readFileSync(backupDataFile, 'utf8'));
        }
        
        const changes = {
            added: [],
            modified: [],
            deleted: [],
            total: 0
        };
        
        // 创建ID映射
        const previousMap = new Map(previousData.map(item => [item.id, item]));
        const currentMap = new Map(currentData.map(item => [item.id, item]));
        
        // 检查新增和修改
        for (const [id, current] of currentMap) {
            if (!previousMap.has(id)) {
                changes.added.push(current);
            } else {
                const previous = previousMap.get(id);
                if (JSON.stringify(current) !== JSON.stringify(previous)) {
                    changes.modified.push({ id, current, previous });
                }
            }
        }
        
        // 检查删除
        for (const [id, previous] of previousMap) {
            if (!currentMap.has(id)) {
                changes.deleted.push(previous);
            }
        }
        
        changes.total = changes.added.length + changes.modified.length + changes.deleted.length;
        
        // 备份当前数据
        fs.writeFileSync(backupDataFile, JSON.stringify(currentData, null, 2));
        
        return changes;
    } catch (error) {
        log(`分析数据变化时出错: ${error.message}`);
        return { added: [], modified: [], deleted: [], total: 0 };
    }
}

// 执行命令
function executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd || CONFIG.PROJECT_ROOT,
            stdio: 'pipe',
            shell: true,
            ...options
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`命令执行失败 (退出码: ${code}): ${stderr || stdout}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

// 创建备份
function createBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(CONFIG.incremental.backupDir, `backup-${timestamp}`);
        
        // 备份dist目录
        const distPath = path.join(CONFIG.PROJECT_ROOT, 'dist');
        if (fs.existsSync(distPath)) {
            fs.cpSync(distPath, backupPath, { recursive: true });
            log(`创建备份: ${backupPath}`);
        }
        
        // 清理旧备份
        cleanOldBackups();
        
        return backupPath;
    } catch (error) {
        log(`创建备份失败: ${error.message}`);
        return null;
    }
}

// 清理旧备份
function cleanOldBackups() {
    try {
        const backupDir = CONFIG.incremental.backupDir;
        const backups = fs.readdirSync(backupDir)
            .filter(name => name.startsWith('backup-'))
            .map(name => ({
                name,
                path: path.join(backupDir, name),
                mtime: fs.statSync(path.join(backupDir, name)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);
        
        // 保留最新的几个备份
        const toDelete = backups.slice(CONFIG.incremental.maxBackups);
        
        for (const backup of toDelete) {
            fs.rmSync(backup.path, { recursive: true, force: true });
            log(`删除旧备份: ${backup.name}`);
        }
    } catch (error) {
        log(`清理备份失败: ${error.message}`);
    }
}

// 原子性更新
async function atomicUpdate(changes) {
    const tempDir = CONFIG.TEMP_BUILD_DIR;
    const distDir = path.join(CONFIG.PROJECT_ROOT, 'dist');
    
    try {
        // 1. 清理临时目录
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });
        
        // 2. 复制当前dist到临时目录
        if (fs.existsSync(distDir)) {
            fs.cpSync(distDir, tempDir, { recursive: true });
        }
        
        // 3. 在临时目录中执行增量构建
        await performIncrementalBuild(tempDir, changes);
        
        // 4. 创建备份
        const backupPath = createBackup();
        
        // 5. 原子性替换（快速移动操作）
        const oldDistDir = `${distDir}.old.${Date.now()}`;
        
        // 重命名当前dist为临时名称
        if (fs.existsSync(distDir)) {
            fs.renameSync(distDir, oldDistDir);
        }
        
        // 将临时构建目录重命名为dist
        fs.renameSync(tempDir, distDir);
        
        // 删除旧的dist目录
        if (fs.existsSync(oldDistDir)) {
            setTimeout(() => {
                fs.rmSync(oldDistDir, { recursive: true, force: true });
            }, 5000); // 5秒后删除，给正在访问的用户一些缓冲时间
        }
        
        log('✅ 原子性更新完成');
        return true;
        
    } catch (error) {
        log(`原子性更新失败: ${error.message}`);
        
        // 清理临时目录
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        
        throw error;
    }
}

// 执行增量构建
async function performIncrementalBuild(buildDir, changes) {
    const originalCwd = process.cwd();
    
    try {
        // 临时修改工作目录
        process.chdir(CONFIG.PROJECT_ROOT);
        
        if (changes.total === 0) {
            log('无变化，跳过构建');
            return;
        }
        
        log(`执行增量构建，变化数量: ${changes.total}`);
        log(`- 新增: ${changes.added.length}`);
        log(`- 修改: ${changes.modified.length}`);
        log(`- 删除: ${changes.deleted.length}`);
        
        // 根据变化类型决定构建策略
        if (changes.added.length > 0 || changes.modified.length > 0) {
            // 重新生成博客页面
            await executeCommand('npx', ['gulp', 'blog-pug']);
            await executeCommand('npx', ['gulp', 'blog-css']);
            await executeCommand('npx', ['gulp', 'blog-detail']);
            
            STATS.incrementalUpdates++;
        }
        
        if (changes.deleted.length > 0) {
            // 处理删除的文章
            for (const deleted of changes.deleted) {
                const htmlFile = path.join(buildDir, 'blog', `${deleted.id}.html`);
                if (fs.existsSync(htmlFile)) {
                    fs.unlinkSync(htmlFile);
                    log(`删除文件: ${deleted.id}.html`);
                }
            }
        }
        
        // 更新主页（如果有文章变化）
        if (changes.total > 0) {
            await executeCommand('npx', ['gulp', 'pug']);
        }
        
    } finally {
        process.chdir(originalCwd);
    }
}

// 执行Notion数据获取
async function fetchNotionData() {
    try {
        log('获取Notion数据...');
        await executeCommand('node', ['scripts/fetchNotionOfficial.js']);
        return true;
    } catch (error) {
        throw new Error(`获取Notion数据失败: ${error.message}`);
    }
}

// 执行更新流程
async function performUpdate() {
    STATS.totalUpdates++;
    STATS.lastUpdateTime = new Date();
    
    try {
        log('开始执行增量更新检查...');
        
        // 1. 获取Notion数据
        await fetchNotionData();
        
        // 2. 分析数据变化
        const analysis = analyzeDataChanges();
        
        if (!analysis.hasChanges) {
            log('数据无变化，跳过构建');
            STATS.successfulUpdates++;
            STATS.lastSuccessTime = new Date();
            STATS.consecutiveFailures = 0;
            return;
        }
        
        log(`检测到数据变化 (${analysis.changeType})`);
        
        // 3. 执行增量更新
        if (CONFIG.incremental.enabled && CONFIG.incremental.atomicUpdate) {
            await atomicUpdate(analysis.changes || {});
        } else {
            // 传统全量构建
            await executeCommand('npm', ['run', 'build']);
            STATS.fullUpdates++;
        }
        
        log('✅ 增量更新完成！');
        STATS.successfulUpdates++;
        STATS.lastSuccessTime = new Date();
        STATS.consecutiveFailures = 0;
        STATS.filesChanged = analysis.changes || {};
        
    } catch (error) {
        log(`❌ 更新过程中发生错误: ${error.message}`);
        STATS.failedUpdates++;
        STATS.consecutiveFailures++;
    }
}

// 生成状态报告
function generateStatusReport() {
    const now = new Date();
    const uptime = process.uptime();
    
    const formatUptime = () => {
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        return `${days}天 ${hours}小时 ${minutes}分钟`;
    };
    
    const successRate = STATS.totalUpdates > 0 
        ? ((STATS.successfulUpdates / STATS.totalUpdates) * 100).toFixed(2) 
        : '0.00';
    
    return {
        timestamp: now.toISOString(),
        uptime: formatUptime(),
        environment: process.env.NODE_ENV || 'development',
        updateInterval: `${CONFIG.UPDATE_INTERVAL / 60000} 分钟`,
        statistics: {
            总更新次数: STATS.totalUpdates,
            成功次数: STATS.successfulUpdates,
            失败次数: STATS.failedUpdates,
            增量更新: STATS.incrementalUpdates,
            全量更新: STATS.fullUpdates,
            成功率: `${successRate}%`,
            连续失败: STATS.consecutiveFailures,
            最后更新: STATS.lastUpdateTime ? STATS.lastUpdateTime.toLocaleString('zh-CN') : '从未',
            最后成功: STATS.lastSuccessTime ? STATS.lastSuccessTime.toLocaleString('zh-CN') : '从未'
        },
        configuration: {
            增量更新: CONFIG.incremental.enabled ? '启用' : '禁用',
            原子更新: CONFIG.incremental.atomicUpdate ? '启用' : '禁用',
            检查间隔: `${CONFIG.incremental.checkInterval} 秒`,
            最大备份: CONFIG.incremental.maxBackups
        },
        lastChanges: STATS.filesChanged
    };
}

// 打印状态报告
function printStatusReport() {
    const report = generateStatusReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 增量更新服务状态报告');
    console.log('='.repeat(60));
    console.log(`🕐 运行时间: ${report.uptime}`);
    console.log(`🌍 环境: ${report.environment}`);
    console.log(`⏱️  更新间隔: ${report.updateInterval}`);
    console.log('');
    
    console.log('📈 统计信息:');
    Object.entries(report.statistics).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    console.log('');
    
    console.log('⚙️  配置信息:');
    Object.entries(report.configuration).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    
    if (report.lastChanges && report.lastChanges.total > 0) {
        console.log('');
        console.log('📝 最近变化:');
        console.log(`   新增文章: ${report.lastChanges.added?.length || 0}`);
        console.log(`   修改文章: ${report.lastChanges.modified?.length || 0}`);
        console.log(`   删除文章: ${report.lastChanges.deleted?.length || 0}`);
    }
    
    console.log('='.repeat(60) + '\n');
}

// 启动自动更新服务
function startIncrementalUpdate() {
    // 先确保目录存在（这也会初始化配置）
    ensureDirectories();
    
    log('🚀 启动增量更新服务...');
    log(`环境: ${process.env.NODE_ENV || 'development'}`);
    log(`更新间隔: ${CONFIG.UPDATE_INTERVAL / 60000} 分钟`);
    log(`增量更新: ${CONFIG.incremental.enabled ? '启用' : '禁用'}`);
    log(`原子更新: ${CONFIG.incremental.atomicUpdate ? '启用' : '禁用'}`);
    log(`备份目录: ${CONFIG.incremental.backupDir}`);
    log(`最大备份数: ${CONFIG.incremental.maxBackups}`);
    
    // 立即执行一次更新
    performUpdate();
    
    // 设置定时更新
    const updateTimer = setInterval(() => performUpdate(), CONFIG.UPDATE_INTERVAL);
    
    // 设置状态报告定时器（每小时）
    const statusTimer = setInterval(() => printStatusReport(), 60 * 60 * 1000);
    
    // 优雅关闭
    process.on('SIGINT', () => {
        log('收到关闭信号，正在优雅关闭...');
        clearInterval(updateTimer);
        clearInterval(statusTimer);
        printStatusReport();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        log('收到终止信号，正在优雅关闭...');
        clearInterval(updateTimer);
        clearInterval(statusTimer);
        printStatusReport();
        process.exit(0);
    });
    
    log('✅ 增量更新服务已启动');
}

// 如果直接运行此脚本
if (require.main === module) {
    startIncrementalUpdate();
}

module.exports = {
    startIncrementalUpdate,
    performUpdate,
    generateStatusReport,
    analyzeDataChanges,
    atomicUpdate
};