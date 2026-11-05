# ATLAS · Developer Studio

公开只读的 GitHub 多项目开发控制台。已从纯仓库展示页升级为**真实构建状态、项目任务与交付监控**。

## 在线访问

https://aincfh.github.io/dev-control-center/

## 已实现

- 公开仓库发现、搜索、分类筛选、排序、响应式项目详情；
- 多项目工作台与人工维护的项目成熟度路线图（WILDLANDS、COZY BISTRO、AZURE COAST 等），每个项目独立显示实际 CI、任务和下一目标；
- GitHub Actions 最近一次主分支运行状态，区分通过/失败/运行中/未知；
- 公开 Issues 和 PR 数量、各仓库任务入口与失败运行链接；
- Pages 发布状态与预览入口（只有已确认发布才标记已发布）；
- 每小时由 Actions 收集安全公开数据并构建页面；
- 单仓库详情可直接调用 GitHub 公共 API 实时核验；
- GitHub Token 仅存在于 Actions 的运行时环境，**不存放于静态网站**；
- Node.js 22 原生测试，提交后验证并部署 GitHub Pages。

## 本地运行

Node.js 20+：

    npm test
    npm run start

静态页面可直接运行，缺少 data/status.json 时会显示公开仓库索引以及“暂无 CI 数据”，而不会伪造成功状态。

### 构建状态快照（需要 GitHub API 网络）

    GITHUB_TOKEN=<GitHub Actions 临时令牌> npm run build

生成 dist/index.html 和 dist/data/status.json，后者只含公开仓库元信息。GitHub Actions 已内置这一步，日常无需自行运行。

## 正规开发工作流

详细规则、项目清单与跨聊天恢复指令：docs/DEVELOPMENT_PROTOCOL.md。
推荐每项独立任务均遵循 Issue → branch → PR → test → review → merge → deploy。自动测试成功不代表已通过完整 UI、性能和终端设备验收。

## 限制与说明

- 不显示私有仓库；需要私有任务视图时应另建受认证保护的后台，不能往公开 Pages 中塞 PAT。
- 快照一般每小时更新，不等同于实时推送；部分 API 数据可能不可用或被限流。
- 这个网站不执行后台 Agent、远程命令或授权写操作。
- 游戏项目互为独立仓库，未经比较不要合并/删除。
