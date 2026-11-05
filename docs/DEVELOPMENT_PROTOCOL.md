# ATLAS · 开发协作与跨会话交接协议

## 当前原则

ATLAS 是公开只读项目观测层，不是持有管理员凭据的网页。它不存储 GitHub Token，不对外暴露私有仓库，不将展示按钮伪装成已经执行的开发任务。代码写入、审批和合并必须走授权的 GitHub 连接或浏览器。

## 规范化开发流程

1. **需求入库（Issue）**：说明业务背景、目标用户、范围、不做什么、可验证的验收条件和风险。
2. **独立分支**：新建 feat/<issue>-<slug> 或 fix/<issue>-<slug>，不直接覆盖其他开发者工作。
3. **代码实现**：每次改动需同步维护测试与文档；尽量一项需求对应一组可独立审查的变更。
4. **Pull Request**：关联 Issue、列明变化、测试证明、浏览器截图和回滚策略。
5. **自动门禁**：工作流成功只是必要条件；还需检查浏览器、移动端、存档和线上资源。
6. **发布及验收**：合并至 main，通过 Actions 部署，访问公开 URL 验证后才标记为已发布。
7. **可恢复交接**：Issue、PR、commit、工作流和本文档是跨聊天的事实来源，不以“之前说过”代替记录。

## 现有项目

- dev-control-center：ATLAS 统一开发控制台（公开，只读），支持 CI/PR/Issue/Pages 状态追踪。
- fishing-world-3d：轻量原创程序化 3D 休闲钓鱼版，有商店、十种鱼、图鉴、任务和本地存档。
- wildlands-anglerfishing-world-3d：独立第一人称 3D 钓鱼版，有 WASD、船、独立环境素材。
- Saintlaurent / shengluolan-app：现有私有项目，不会自动进入公开状态文件，也不应为了展示而公开。
- 其他项目：通过 GitHub 公共仓库发现自动纳入索引。

## CI 状态采集

.github/workflows/deploy.yml 每小时及主分支 push 时运行 scripts/build-status.mjs，以 GitHub Actions 内的临时 GITHUB_TOKEN 调用 GitHub REST API。构建只把公开仓库的必要字段写入 dist/data/status.json，Token 绝不进入 Pages 文件。公开网页读取静态状态快照，并允许在单仓库详情里请求公共 GitHub API 实时核验。

“构建成功”仅表示最近一次可见的默认分支工作流结论 success；它不等于部署成功、网站可访问或无 BUG。没有 CI 数据时必须显示未知。API 失败时不得推断为成功。Issue/PR 单次最多返回 100 项，达到上限时需标记为下限。定时更新不保证严格按时执行。

## 当前开发阶段

Phase 1：完成 ATLAS 与两个钓鱼游戏的原始发布。
Phase 2A：ATLAS 真实 CI 与任务监控；依照 GitHub Actions 报告验收。
Phase 2B：规范化 Issue、PR、质量门禁和跨会话交接；部分功能会持续落实。
Phase 2C：评估两套钓鱼实现的实际品质，挑选主产品路线，另一套作为独立方向保留，未经审查不合并。
Phase 2D：浏览器端到端/移动性能与恢复测试，作为后续发布门禁。

## 恢复任务的标准指令

请读取 AincFh/dev-control-center 的 docs/DEVELOPMENT_PROTOCOL.md、README.md、最新 Actions、开放 Issues/PR；如任务关联游戏，则进一步核实 fishing-world-3d 和 wildlands-anglerfishing-world-3d 的代码、测试、在线页面。以 GitHub 当前代码和运行日志为准，执行真实开发、测试与发布，最后提供实际 commit SHA / workflow 运行链接 / 验收结果。不要宣称未执行的浏览器测试已完成。

## 安全与验收底线

- 不在公开网页直接执行有权限的 GitHub 写操作。
- 不展示私有项目、secret 或用户凭据。
- 不凭猜测编造“上线”“在线”“测试通过”。
- 不对现有仓库实施删除、覆盖、改名或重写历史来消除重复；需先取得明确授权。
