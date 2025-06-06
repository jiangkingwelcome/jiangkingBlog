// 自动更新配置文件
module.exports = {
    // 环境配置
    environment: process.env.NODE_ENV || 'development',
    
    // 不同环境的更新间隔（分钟）
    updateInterval: {
        development: 5,    // 开发环境：5分钟
        production: 30,    // 生产环境：30分钟
        test: 1           // 测试环境：1分钟
    },
    
    // 增量更新配置
    incremental: {
        enabled: true,              // 启用增量更新
        checkInterval: 60,          // 检查文件变化的间隔（秒）
        atomicUpdate: true,         // 原子更新（先构建到临时目录，再原子性替换）
        maxBackups: 5,              // 最大备份数量
        // 智能构建策略
        smartBuild: {
            enabled: true,
            // 只有这些类型的变化才触发构建
            triggerOn: ['added', 'modified', 'deleted'],
            // 批量处理变化（避免频繁构建）
            batchChanges: true,
            batchDelay: 30000       // 批量延迟（毫秒）
        }
    },
    
    // 日志设置
    logging: {
        // 是否启用日志
        enabled: true,
        // 日志级别：info, warn, error
        level: 'info',
        // 日志文件最大大小（MB）
        maxSize: 10,
        // 保留的日志文件数量
        maxFiles: 5
    },
    
    // Notion API 设置
    notion: {
        // 请求超时时间（秒）
        timeout: 30,
        // 失败重试次数
        retryCount: 3,
        // 重试间隔（秒）
        retryDelay: 5
    },
    
    // 构建设置
    build: {
        // 是否在数据无变化时跳过构建
        skipIfNoChanges: true,
        // 构建超时时间（分钟）
        timeout: 10
    },
    
    // 监控设置
    monitoring: {
        // 是否启用健康检查
        healthCheck: true,
        // 健康检查间隔（分钟）
        healthCheckInterval: 60,
        // 错误通知阈值（连续失败次数）
        errorThreshold: 3
    }
};