# 自动更新功能使用说明

## 概述

自动更新功能可以定期从 Notion 数据库获取最新内容，并自动重新构建博客。当您在 Notion 中修改文章内容时，博客会自动同步更新。

## 快速开始

### 1. 启动自动更新服务

```bash
# 使用默认配置启动
npm run auto-update

# 或者指定环境启动
npm run auto-update:dev    # 开发环境（5分钟间隔）
npm run auto-update:prod   # 生产环境（30分钟间隔）
npm run auto-update:test   # 测试环境（1分钟间隔）
```

### 2. 停止服务

按 `Ctrl+C` 停止自动更新服务。

## 配置说明

### 配置文件

配置文件位于项目根目录：`auto-update.config.js`

```javascript
module.exports = {
    // 更新间隔设置（分钟）
    updateInterval: {
        development: 5,   // 开发环境：5分钟
        production: 30,   // 生产环境：30分钟
        test: 1          // 测试环境：1分钟
    },
    
    // 当前环境
    environment: 'development',
    
    // 其他配置...
};
```

### 主要配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `updateInterval` | 各环境的更新间隔（分钟） | dev:5, prod:30, test:1 |
| `environment` | 当前环境 | 'development' |
| `logging.enabled` | 是否启用日志 | true |
| `notion.retryCount` | Notion API 失败重试次数 | 3 |
| `notion.retryDelay` | 重试间隔（秒） | 5 |
| `build.skipIfNoChanges` | 数据无变化时跳过构建 | true |
| `build.timeout` | 构建超时时间（分钟） | 10 |
| `monitoring.healthCheck` | 是否启用健康检查 | true |
| `monitoring.errorThreshold` | 错误通知阈值 | 3 |

## 功能特性

### 🔄 智能更新
- 只有当 Notion 数据发生变化时才重新构建
- 支持强制更新模式
- 自动跳过无效数据

### 🛡️ 错误处理
- Notion API 调用失败自动重试
- 构建超时保护
- 连续失败监控和告警

### 📊 监控统计
- 实时运行状态监控
- 更新成功率统计
- 详细的日志记录

### 🏥 健康检查
- 定期检查数据文件完整性
- 检查构建输出文件
- 监控最后成功更新时间

## 日志管理

### 日志位置
- 控制台输出：实时显示
- 日志文件：`logs/auto-update.log`

### 日志内容
- 更新开始/结束时间
- Notion 数据获取状态
- 构建过程信息
- 错误和警告信息
- 统计报告

## 状态监控

### 状态报告
服务会定期（每小时）输出状态报告，包含：

- 运行时间
- 更新统计（总次数、成功次数、失败次数、成功率）
- 最后更新时间
- 连续失败次数
- 当前状态（正常/异常）

### 手动查看状态
```bash
# 查看日志文件
tail -f logs/auto-update.log

# 或者在服务运行时按 Ctrl+C 查看最终报告
```

## 部署建议

### 开发环境
```bash
# 短间隔，便于测试
npm run auto-update:dev
```

### 生产环境
```bash
# 使用 PM2 或其他进程管理器
pm2 start "npm run auto-update:prod" --name "blog-auto-update"

# 或者使用 nohup
nohup npm run auto-update:prod > auto-update.log 2>&1 &
```

### 系统服务（Linux）
创建 systemd 服务文件：

```ini
# /etc/systemd/system/blog-auto-update.service
[Unit]
Description=Blog Auto Update Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/your/blog
ExecStart=/usr/bin/npm run auto-update:prod
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl enable blog-auto-update
sudo systemctl start blog-auto-update
```

## 故障排除

### 常见问题

1. **Notion API 调用失败**
   - 检查 `.env` 文件中的 API 密钥
   - 确认网络连接正常
   - 查看重试日志

2. **构建失败**
   - 检查依赖是否完整：`npm install`
   - 查看构建日志中的具体错误
   - 确认磁盘空间充足

3. **数据文件异常**
   - 手动运行：`npm run fetch:notion`
   - 检查 `src/blog/data/list.json` 文件
   - 验证 Notion 数据库结构

4. **服务异常停止**
   - 查看日志文件：`logs/auto-update.log`
   - 检查系统资源使用情况
   - 确认进程管理器配置

### 调试模式

```bash
# 设置详细日志
DEBUG=* npm run auto-update:dev

# 或者修改配置文件中的日志级别
```

## 最佳实践

1. **合理设置更新间隔**
   - 开发环境：5-10分钟
   - 生产环境：30-60分钟
   - 避免过于频繁的更新

2. **监控服务状态**
   - 定期查看日志
   - 设置告警机制
   - 监控磁盘空间

3. **备份重要数据**
   - 定期备份 Notion 数据
   - 备份构建输出
   - 保留日志文件

4. **环境隔离**
   - 开发和生产使用不同配置
   - 测试环境独立部署
   - 使用环境变量管理敏感信息

## 扩展功能

### 自定义通知
可以在 `scripts/autoUpdate.js` 中添加自定义通知逻辑：

```javascript
// 在错误阈值达到时发送通知
if (STATS.consecutiveFailures >= CONFIG.monitoring.errorThreshold) {
    // 发送邮件、Slack 消息等
    await sendNotification('博客自动更新服务异常');
}
```

### 集成 Webhook
可以添加 Webhook 支持，实现 Notion 数据变化时的即时更新。

### 多站点支持
可以扩展脚本以支持多个博客站点的同时更新。