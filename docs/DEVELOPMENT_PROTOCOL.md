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


## Phase 3：需求到发布的证据关联

ATLAS 开发链路工作区（#trace）只从公开 GitHub REST API 获取 Issue、PR、Actions 及 Pages 的可观察证据。

| 阶段 | 关联条件 | 能证明 | 不能证明 |
| --- | --- | --- | --- |
| Issue → PR | 同仓库 PR 正文包含 Fixes/Closes/Resolves #N | PR 声明关联某 Issue | GitHub 已执行关闭、需求已完成 |
| PR → CI | PR HEAD SHA、HEAD 分支、pull_request 事件严格匹配 | 此 PR 提交的可见工作流结论 | 所有检查完成、PR 已合并 |
| Merge → CI | merge commit SHA、默认分支、push/dispatch 事件匹配 | 此合并提交的可见主分支运行 | 游戏已完成全部验收 |
| 默认分支 → Pages | Pages API 当前公开状态 | 仓库存在已构建站点 | 这次 PR 的代码具体已上线 |

所有阶段缺少可核验信息都显示“未知”，不能拿另一个事件的绿色 CI 替代。PR 工作流和 GitHub Pages 部署绝不是同一回事。

交接时应保留 Issue、PR、提交 SHA、对应 Actions 运行和真实浏览器验证证据。开发链路可以导出 Markdown 报告，但只是公开样本，不代表整个仓库历史。Github Pages 不携带 PAT、不访问私有仓库，也没有远程合并发布权限。


### Phase 3 补充：同 SHA GitHub Pages Deployment 证明

在已合并 PR 中，根据 merge commit SHA + base branch 精确匹配公开 GitHub Deployment 的 sha/ref，且必须属于 github-pages 环境。只有对应 Deployment 最新状态为 success 才能标记“提交级 Pages 部署已确认”。

环境 URL 需严格校验与 Pages API 返回 URL 的 origin 与路径，拒绝非 HTTPS 和不同来源，避免公开数据中的恶意跳转。已启用 Pages 或主分支 CI 通过不足以作为特定提交的发布证明。若仅查询到 in_progress / failure / 无状态，必须保留原始结论。

此检查只读取 GitHub 公共 REST；GitHub Actions 给部署读取权限，但公开网页没有 GitHub Token。合并后的状态可以被后续部署覆盖，应结合 GitHub 最新状态及实际浏览器功能继续验收。


### Phase 3 补充：线上 HTTP / 静态资源核验

GitHub Pages 成功部署后，ATLAS 需要实际访问公开页面并检查 HTML 及最多 6 个同仓库的 JS/CSS 资源。新探针只能进行 HTTPS 静态资源请求，不能运行未知第三方脚本，不收集用户数据、不持有令牌。公开状态快照的每个项目附带独立 probe 字段。

CI success ≠ GitHub Pages Deployment success ≠ HTTP/静态资源可达 ≠ 游戏完整 Playtest 通过。这四个独立证据必须在产品验收时分别核查。出现资源异常需要人工查看目标站点、相对路径和模块导入图，不得靠自动置绿掩盖失败。


### Phase 4：真正的线上游戏运行验收

ATLAS 的静态站点 HTTP 探针只能检验页面与少量资源可达，不能代替游戏运行。新增独立每日 Chromium 游戏巡检，直接访问已部署的实际游戏网站，使用干净的 Chrome Profile，真实触发按钮、读取游戏状态并验证存档恢复。

每次报告包含 schemaVersion=1、运行时间、GitHub Actions 任务原始 URL、4 个具名项目的测试结果、逐项检查状态与耗时和失败原因。只允许明确受支持的仓库 ID；无数据、超时、运行失败、已过期均不能被 CI 构建或 HTML 探针“自动置绿”。

自动化报告仅是一次真实浏览器的抽样操作，不是长期帧率/内存基线，也不代表已完成所有游戏任务。每款游戏继续维护其独立、完整的回归测试；新增游戏之前必须根据其真实 UI 与状态机制定义验证场景，不能以泛化页面加载作为游戏玩法通过。

安全：独立浏览器环境不会污染用户本地存档；专用 QA workflow 使用有最小 GitHub 写权限的 GitHub Actions Token 发布公开摘要并触发 ATLAS Pages 更新；前台静态站点无 Token，不得自动合并 PR 或操作用户私人资料。


## Phase 5：跨领域非游戏产品成为一级工作流（Issue #32）

ATLAS 不以游戏为唯一或默认目标。项目路线应包含真实、公开且有明确来源的系统软件（AincFh OS）、全栈内容社区（A.T. Field）、原生 Android 应用（轻记 QingJi）、创作工具 Fork（Squiffy）和工程平台（ATLAS）。游戏继续按独立仓库迭代，但不能占据全部研发优先级或首页内容。

外部 GitHub 索引当前仍是游戏/模拟参考库，不能把其千级数量宣传成 ATLAS 已交付项目，也不能声称已完成跨领域检索。未来跨领域分类与数据构建必须先验证来源与授权，再设计真实搜索、筛选、孵化、交接和质量门禁。

非游戏产品采用与游戏同样严格、但按形态不同的验收口径：Web OS 核验窗口/文件/主题/输入/性能；全栈站点核验认证、数据、安全、迁移与发布；Android 原生应用核验构建、设备交互、离线存储与兼容性；开发工具核验真实任务完成与故障恢复。任何一个项目都不能以绿色 CI 替代产品验收。

私有 Saintlaurent / shengluolan-app 始终不进入公开 GitHub 快照、项目卡或外部源索引。规划在公开文档中只描述方向和脱敏信息，不公开内部功能与源码。
