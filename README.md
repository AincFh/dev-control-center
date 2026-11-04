# ATLAS · Developer Studio

可实际运行的 ChatGPT × GitHub 多仓库控制台。

## 已实现
- Apple 风格响应式工作空间；公开 GitHub 仓库实时索引，私有仓库不泄露。
- 项目卡片、快速导航、搜索、分类、Star 排序、详情、公开活动。
- GitHub API 不可用时离线回退，无需在浏览器存储 Token。
- Node.js 原生测试，推送自动验证，并通过 GitHub Actions 部署 Pages。

## 运行
Node.js 20+：`npm test`；`npm run start`（开发服务器端口 5173）。

## 部署
GitHub 仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**；主分支 push 后由工作流部署。

## 新项目
公开仓库自动发现。要指定分类/预览，请编辑 `app.js` 的 `catalog` 配置。公开控制台只读，不保存访问令牌。