# Vercel 部署指南

本文档提供在 Vercel 上部署此博客的步骤和注意事项。

## 部署步骤

1. **Fork 或克隆本仓库**到您的 GitHub 账户

2. **在 Vercel 上导入项目**
   - 登录 Vercel 账户
   - 点击 "New Project"
   - 选择您的 GitHub 仓库
   - 选择导入

3. **配置环境变量**
   在 Vercel 项目设置中添加以下环境变量：
   - `NOTION_TOKEN`: Notion API 令牌
   - `NOTION_DATABASE_ID`: Notion 数据库 ID

4. **部署设置**
   - 构建命令: 已在 vercel.json 中配置
   - 输出目录: 已在 vercel.json 中配置
   - 安装命令: `npm install`

5. **点击部署**，Vercel 将自动构建和部署您的网站

## 注意事项

- **增量更新**：在 Vercel 无服务器环境中不支持自动增量更新功能。如需此功能，请考虑使用 Vercel Cron Jobs。

- **环境变量**：确保在 Vercel 项目设置中正确配置所有必要的环境变量。

- **构建过程**：默认构建过程是 `npm run fetch:notion && npm run build`，这会从 Notion 获取数据并构建静态站点。

- **部署钩子**：可以配置 Vercel 部署钩子，以便在 Notion 内容更新时触发重新部署。

## 定期重新部署

要设置定期重新部署（确保内容保持最新）：

1. 在 Vercel 控制台中，进入项目设置
2. 选择 "Git" 标签
3. 找到 "Deploy Hooks" 部分并创建新的 Hook
4. 使用一个定时任务服务（如 cron-job.org）定期触发该 Hook

## 问题排查

如果部署遇到问题：

1. 检查构建日志是否有错误
2. 确认所有环境变量已正确设置
3. 验证 Notion API 令牌是否有效且权限正确 