# ATLAS · Developer Studio

## 定位：跨领域软件研发工作空间

ATLAS 是多项目 **Developer Studio**，覆盖系统软件 / Web OS、全栈 Web 应用、Android 原生应用、开发工具、AI 与自动化方向，以及独立游戏。游戏大厅只是其中一个独立分区，不代表平台总体定位。

**已有的公开非游戏项目：** [AincFh OS](https://github.com/AincFh/AincFh)、[A.T. Field](https://github.com/AincFh/my-anime-blog)、[轻记 QingJi](https://github.com/AincFh/QingJi)、[Squiffy Fork](https://github.com/AincFh/squiffy) 和 ATLAS 控制中心本身。各项目实际完成度必须以其仓库、CI、真实功能与部署证据为准；Squiffy 保留上游作者和 Fork 属性。

**跨领域 GitHub 软件实验室已扩展：** 2026-11-06 的最新数据集包含 **4,191 条公开仓库参考、26 个研究分类（18 个非游戏方向）**。除原有系统、AI、桌面、移动、Web、数据、开发工具等方向，还新增笔记与协作、通讯、安全隐私、科学工程、财务商业和无障碍技术。精选 **36 个 GitHub 公开仓库核实的第三方软件档案**，可查看原作者简介、快照、实时 GitHub 详情，并进行最多四仓库对比及研发候选孵化。第三方项目不属于 ATLAS 已交付产品，仓库许可证字段仅供研究参考，不能替代源码/素材复用授权。详见 [GitHub 星图](https://aincfh.github.io/dev-control-center/#universe)、[PR #36](https://github.com/AincFh/dev-control-center/pull/36)、[Issue #32](https://github.com/AincFh/dev-control-center/issues/32) 和 [跨领域路线图](docs/PORTFOLIO_ROADMAP.md)。

**后续实际产品开发：** 在现有 AincFh OS、A.T. Field、轻记 QingJi、ATLAS 工程控制台的基础上，继续投入 Windows 工具、AI Agents、跨平台应用、数据与创意生产等完整产品；相关新方向在正式立项和验收前不得标记为已交付。

公开站点只展示 GitHub 公共信息，不公开内部仓库，不持有管理令牌。开发产物继续独立仓库化，并以 Issue → PR → CI → 产品测试 → 发布验收形成可追溯闭环。

## 外部软件研究与比较

进入 [GitHub 跨领域软件实验室](https://aincfh.github.io/dev-control-center/#universe)，优先浏览非游戏应用，筛选 18 个方向和 36 个有 GitHub 元信息快照的第三方实例。可对四个仓库进行主动实时比较；公开 API 达到限额时保留未知状态。精选档案与大量外部索引均不可冒充 ATLAS 自研产品。数据分类是 GitHub 主题检索归档，可能需人工纠正；正式开发需许可证和资产审核。

## 新增：在线游戏大厅

访问 [ATLAS 游戏大厅](https://aincfh.github.io/dev-control-center/#arcade) —— 汇总多个独立游戏仓库。提供类型筛选、关键词搜索、仅看可试玩、浏览器本地收藏，以及直达每款游戏的源码和在线运行入口。所有入口都基于实际 GitHub Pages 部署记录核验；未发布或未通过 Playtest 的项目只给出源代码链接，不提供虚假的可玩按钮。游戏封面仅有注明的真实仓库截图，其余是主题动效，不冒充游戏实拍。

当前游戏大厅收录 11 个独立项目，其中 10 款已有本账号 GitHub Pages 部署与浏览器验收记录。《Qubecraft 方块世界》已通过完整 Playtest 并进入可游玩状态，但仍属于开发中版本；其中 MORI 在缺少 WebGL 的浏览器会自动显示安全降级画面。项目覆盖《日落餐馆》《天堂小岛》《山野钓行 NEXT》《湖光物语》《Qubecraft》《Cimulity》《Mori》《午夜工厂》《小城人生》《蔚蓝海岸》等 10 款独立项目。页面使用 `arcade.js` 的可测试注册表，另有 `tests/arcade.test.js` 和真实 Chrome 手机/桌面测试。


公开只读的 GitHub 多项目开发控制台。已从纯仓库展示页升级为**真实构建状态、项目任务与交付监控**。

## 在线访问

https://aincfh.github.io/dev-control-center/

## 已实现

- 公开仓库发现、搜索、跨领域分类筛选（系统、AI、Windows、Android、SaaS、设计、开发工具、游戏等）、排序、响应式项目详情；
- 开源游戏发现实验室：21 个经筛选来源、10 个 MIT Fork，按类型搜索筛选；清晰区分原创仓库、Fork 与仅参考；
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

### 新增城市生活与太空经营

- City of Small Chances：作者 Mon-ius 的 MIT 3D 城市生活游戏 Fork，独立 Actions + Pages、真实浏览器人物移动和移动端验收完成，已开放试玩；该玩法不是 ATLAS 原创。
- Spacefortress：作者 Jaredcastorena 的 MIT 太空殖民地模拟 Fork 已配置 Actions/Pages；在完整单测和线上浏览器测试完成以前，ATLAS 仅开放源码入口，不显示未经验证的试玩地址。

## Edition 03 · Creator Workspace 视觉重构

采用独立的 8 个工作区视图，不再将游戏、研究、所有仓库及 CI 全部堆在同一长页面上。默认浅色 Apple 式精密工作台，游戏展示使用独立深色艺术区域；系统组件、选项卡与 GitHub 实时数据统一排版。支持手机横向导航、永久保存浅色/深色主题、Cmd/Ctrl+K 快捷搜索与 `#arcade` 等可直接分享的页面地址。所有页面仍只读、不存储 GitHub Token，也不把 Fork 误称为原创作品。


《SPACEFORTRESS · 星际前哨》系 [Jaredcastorena/spacefortress](https://github.com/Jaredcastorena/spacefortress) MIT 开源项目的独立 Fork；AincFh 的 [Pages](https://aincfh.github.io/spacefortress/) 已通过主分支 4 组 CI + deploy，真实浏览器打开过初始殖民地、显示七名船员并验证游戏时间推进。**属于可玩的开发中模拟游戏，不代表上游 roadmap 中所有系统均已完成。**

## 发布缓存与版本一致性

GitHub Pages 可能将静态 JS/CSS 在浏览器缓存约 600 秒。为避免出现“CI 已成功，但用户仍看到旧版游戏大厅”的情况，`npm run build` 只在 `dist/` 发布产物中给入口脚本、CSS 和每一层本地 ES import 增加 `?v=<commit>-<run>` 发布指纹；源代码保持整洁。

`dist/data/build.json` 保存指纹；`scripts/verify-dist.mjs` 会确认首页与全部依赖统一使用同一个版本，并禁止缺失模块。如果用户长期不刷新已缓存的旧 HTML，仍需按 GitHub Pages 的缓存 TTL 获取新入口；此机制避免新首页继续引用旧 JS/CSS，不能改变服务端 HTTP 缓存策略。

## Edition 04 · Galaxy Universe + Kinetic Workspace

- **GitHub 星图**：按真实 GitHub 搜索结果收录 1,580 个外部仓库参考。八个方向、36 组来源检索、去重。来源从不归为自有产品或 Fork，许可证与可玩性必须按需查询并审核。
- 可交互 Canvas 星图、类别与作者检索、按类别交错展示、24 张卡片分页、本机关注列表、点击详情读取实时 GitHub Stars／许可证／最新更新时间（不伪造元信息）。
- UI 增加轻量交互反馈、尊重减少动画设置的视觉动效，并按要求在普通页面禁止复制、粘贴、右键和文字选中（浏览器端体验限制，不是对公开源码的访问保护）。


## Edition 05 · 项目孵化工作台

ATLAS 不再只有 GitHub 搜索星图。#incubator 是独立的、无需服务器和账号密钥的研究决策工作台：

- 从 1,580 条外部项目索引中点击 **加入候选池**，自动保留 owner/repo 来源、研究类别并去重；
- 五阶段本地看板：待研究 → 技术评估 → 方案设计 → 待立项，另有暂缓；支持搜索、按阶段筛选和分批显示；
- 独立编辑弹窗中可写 2,000 字研究备注，并逐项登记四项**人工核查**（代码许可、素材权利、实际运行、差异化范围）。这些勾选不是 GitHub 或 ATLAS 自动认证；
- 按当前编辑内容生成预填写 GitHub Issue 草稿，跳转后仍由用户在 GitHub 确认提交；本平台**不会**写 GitHub、创建仓库或冒充真实开发进度；
- 研究记录保存在当前浏览器 localStorage。支持 JSON 备份的导入、导出（包含研究备注和人工标记），以免浏览器清理导致进度丢失。备份不自动跨设备同步；
- 单个浏览器至多管理 2,000 个候选，五阶段按需分批渲染，避免一次生成数千个 DOM 卡片；
- 对应 incubator-core.js 域测试与 tests/universe.browser.py 实际浏览器流程检查。

**事实边界**：外部 GitHub 索引 ≠ 自己的游戏 ≠ Fork 许可通过 ≠ 可以玩 ≠ 通过上线验收。候选池也不是公开 GitHub Issues 数据库；正式立项仍须走 Issue → PR → CI → 浏览器验收 → 发布。


## Edition 06 · 研发总控（Mission Control）

[#mission](https://aincfh.github.io/dev-control-center/#mission) 将公开 GitHub 多仓库**状态快照**转换成可操作的研发决策界面：

- 展示完整公开仓库数、失败 CI、开放 PR、开放 Issue、待核验 CI；区分失败、运行中、成功、跳过与未知，不把 CI 成功当成游戏完成；
- 依照公开证据标记构建失败、PR 审查、Issue 排期、API 截断、缺乏 CI 以及长期无推送，但仅将其标为观察信号，不作无依据的故障判断；
- 追加可审查的 GitHub Issue/PR 标题样本（每仓库最多各 5 条）、最近更新时间和真正的 GitHub 打开链接，汇总为跨项目待办；新增任务数据在 Actions 定时构建的公开 JSON 中，网站不接触任何 GitHub Token；
- 关键词搜索、关注、CI 失败/PR/待核验/游戏筛选、风险优先排序；本地关注用 localStorage 保存；
- 各项目提供六项手动 QA 证据清单、笔记、保存恢复。**不是系统自动通过的发布门禁**，也不会自动修改 GitHub；
- 下载包含 CI、风险、任务样本、快照时效和人工记录的 Markdown 交接报告。公开快照超过两小时会标注“可能过期”；
- 支持桌面、触屏、深色主题及 reduced-motion，自动化门禁包含 Node 测试、Pages 发布 ES 模块指纹检查以及真实 Chromium 桌面/移动端 QA。

公开状态快照每小时尝试更新。连接失败或数据缺失会显示“未知”，而不是假装 CI 通过。GitHub API 的 Issue / PR 每页最多取 100 条，达到阈值时数量仅为**下限**。有权修改 GitHub 的 Agent 仍通过授权 GitHub 连接工作，Pages 本身只提供公开只读入口。


## Edition 07 · 全局命令搜索

主页面右上角搜索以及快捷键 **Ctrl / ⌘ + K** 现在打开统一命令面板（不是单纯跳转到“全部仓库”）。无需跳出当前页面，即可搜索并执行：

- ATLAS 各个工作区的页面导航，例如游戏大厅、项目孵化、研发总控、交付健康；
- 游戏大厅中已标记可试玩的具体游戏入口；未满足上线门禁的游戏只能跳转其 GitHub 源码，不能被命令搜索绕过；
- 本账户完整公开仓库清单，不将私有仓库泄漏到浏览器；
- 懒加载的 GitHub 外部项目星图索引（仅作为第三方研究参考），动态索引增长后也可搜索；
- 键盘上、下方向键选择，Enter 执行，Escape 关闭，点击结果执行；搜索记录仅存储最近八条命令 ID 于本地浏览器。

命令面板不会持有 GitHub Token，也不能直接创建 Issue、合并 PR 或修改远端项目。应用和游戏链接均来自已登记的可信入口，外部仓库链接只由校验通过的 GitHub 仓库名生成。


## Edition 08 · 可追溯的开发链路

新增 [开发链路](https://aincfh.github.io/dev-control-center/#trace) 工作区，对自有公开 GitHub 仓库提供 **开放 PR、最近合并 PR、明确 Issue 引用、同提交 CI 和当前 Pages 状态** 的只读追踪。

- 只解析同仓库 PR 描述里的 Fixes/Closes/Resolves #N 关闭关键字，不根据标题猜测需求关系。
- PR 检查严格匹配源 SHA + 分支 + pull_request 事件；合并后 CI 只匹配合并提交 SHA + 默认分支 + push/dispatch 事件。
- 区分“PR 开放”“检查通过”“代码已合并”“仓库 Pages 已公开”。Pages 已发布并不证明具体 PR 已部署，不能自动显示该 PR 已上线。
- 详情面板保留 GitHub Issue / Actions 原始链接与明确的状态来源，支持搜索、按仓库与阶段过滤、Markdown 交接报告。
- 公开快照采样每仓库最多 8 条开放 PR、6 条最近已合并 PR、8 条开放 Issue，以及近期 PR Actions 运行；缺失数据必须标记未知。
- Node 领域测试验证引用关系、URL 安全和 SHA 关联；Chromium 验证桌面/手机与交互。

ATLAS 依然是公开只读观测层。真正的 GitHub 修改、游戏 Playtest 和发布验收必须在独立仓库中完成。


## Edition 09 · 精确合并提交的 GitHub Pages 部署证明

新增对 GitHub Deployments API 的只读采样，并严格对齐 PR 的 **merge commit SHA + base branch + github-pages 环境**。匹配成功后读取该 Deployment 的最新 Status：

- Latest status = success：标记“同提交 GitHub Pages 部署确认”，显示对应 SHA 和 GitHub Deployment 原始证据。
- Latest status = failure/error：标记部署失败；queued / pending / waiting / in_progress 标记处理中。
- PR 尚未合并、SHA 对不上、部署记录未进入采样窗口、API 出错、权限不足：一律保留“无法核验”，不把仓库已有 Pages 页面冒充该 PR 已上线。
- 匹配 Deployment 成功后，发布 URL 仍需与仓库 Pages URL 同源且路径匹配才予显示。这样不会把不受信任的跳转注入公开页面。

只采样最近 50 个 Pages Deployment，每仓库最多核实 4 个合并 PR 的部署状态，按公开信息分批获取。**部署成功只证明 GitHub 环境记录，不代表完整 Playtest、性能验收和用户端质量全部通过。**


## Edition 10 · Pages 状态证据一致性修复

在线快照核验发现 GitHub Pages 公开站点有成功的同 SHA Deployment，但某些仓库的 Pages API 返回了非 built 状态，旧代码错误显示为“未发布”。

修复策略：若 Pages API 明确为 built/active/published 且 URL 为 HTTPS，则标记 published；否则允许 30 日内 **同仓库、同合并提交 SHA、github-pages 环境且最新状态为 success** 的 Deployment 作为 Pages 发布证据，并保留来源、部署 SHA、验证时间。两种证据都缺失时显示 unknown，不编造“未发布”。

前台项目详情现在区分“Pages API 已证实”和“GitHub Deployment 提交级已证实”。源证据不能替代浏览器打开后的真实游戏 Playtest。


## Edition 11 · 已部署站点在线 HTTP / 静态资源巡检

此前 ATLAS 只区分 GitHub 构建和部署状态，无法发现网站发布之后返回 HTTP 404 或 JS/CSS 静态资源丢失。本次新增第三层独立证据：

1. 只有已有公开 Pages 发布证据的仓库才会检测；仅允许访问 aincfh.github.io 下该仓库的首页路径，拒绝跨域跳转与任意外部 URL。
2. 记录首页 HTTP 响应码、HTML 类型和基本结构；从页面最多抽取 6 个同源 JS/CSS 引用并分别检查状态。
3. 单独标记 reachable、resource_error、http_error、content_error、network_error 和无数据；返回 200 不意味着游戏已经正常运行。
4. 研发总控增加线上资源可达/异常计数、站点逐条列表及问题过滤；状态报告也有独立的 HTTP 探针结论。
5. 定时构建时重新检查，代表一次带时间戳的公开网络观测，非持续 Uptime 服务或 SLA。

**边界**：探针不执行浏览器 JavaScript、WebGL、音频、键盘/触控、存档、性能测试，也不自动修复目标游戏。它只填补发布成功与完整游戏验收之间的一个质量层。


## Edition 12 · 跨仓库真实游戏浏览器验收（首批 4 款）

游戏大厅现在独立显示 **真实 Chromium 游戏运行记录**，而不是从 GitHub CI 或 Pages HTTP 200 推断“游戏可玩”。

验证对象及实际操作：
- **COZY BISTRO 日落餐馆**：进入游戏、点击开店、实际推进餐厅订单引擎、刷新后确认营业存档恢复、390px 响应式检查。
- **PARADISE ISLE 天堂小岛**：在完全独立的 Chrome 用户资料中创建新岛存档、打开背包、手动保存、刷新并重新载入存档、390px 视口检查。
- **WILDLANDS NEXT 山野钓行**：真实 Three.js/WebGL 世界与活体鱼群启动、点击开始、按住/松开钓竿完成抛投，及移动端页面检查。
- **FISHING WORLD 湖光物语**：真实 WebGL 启动、点击进入游戏、点击抛竿使钓鱼阶段转换，及移动端布局检查。

运行方式：GitHub Actions 的 live-game-qa.yml 每日 UTC 03:27 或手动触发；4 款游戏分别运行无痕 Chromium 会话，采集脚本错误与可复核的检查项；截图和 JSON 由 Actions Artifact 留存，公开执行摘要进入 data/game-runtime.json 并更新 Pages。实际失败仍如实发布结果，最后令该 QA 工作流标红，不允许把失败包装为成功。

站点将“通过”“失败/超时”“未运行或过期”分开，36 小时后结果自动标记过期。此检查仅覆盖首批 4 款游戏的部分关键流程，不等于全部游戏实现、深度玩法、长期性能和完整可用性全部验收；未检测的其他游戏不出现伪造的通过标识。

自动化代码、输入内容和运行摘要公开；不收集真实用户存档、不要求游戏账户、不在浏览器页面存储 GitHub Token。


## Edition 13 · 从 4 个扩大到 7 个真实游戏运行场景

对现有每天运行的真实 Chromium 自动验收新增三款游戏，不改变“仅真实浏览器操作才算证据”的门槛：

- MIDNIGHT FACTORY 午夜工厂：打开新手引导、实际切换中英文、进入原始工厂 iframe，确认真正的资金、Canvas 和 15+ 建造按钮，点击矿机工具切换，再验证 390px 页面。
- CITY OF SMALL CHANCES 小城人生：真正启动 WebGL 城市，按住 W 键行走并比较真实角色世界坐标；切换 390px 后再按住屏幕方向键验证触控位移与松开状态。
- MORI PET 宠物日记：运行 React UI、完成首次新手引导，真实点击 Feed，核对持久化存档中的行为计数，再刷新验证数据未丢失和手机布局。

此时已覆盖 7/11 个游戏目录入口，但其余四款仍不能标记为运行验收通过。每日真实 QA 会如实汇报每一款的通过、失败、超时或缺失；浏览器测试里的检查成功只证明指定操作路径和环境。


## Edition 14 · 游戏运行故障成为独立发布风险

ATLAS 的研发总控现在读取每日公开 Chromium 游戏验收记录，按项目展示“真实浏览器通过 / 实际验收失败”，同时独立计数。游戏的 CI Success、Pages Deployment Success、HTTP 资源成功，都不会覆盖真实操作失败。

- 只有校验过仓库身份且 **36 小时内** 的报告能够影响当前风险队列，运行失败或超时（包括 MORI 首次剧情验收失败）设为高优先级工作项；过期结果保留历史记录，但不误报为当前故障。
- 新增“浏览器玩法验收失败”过滤器，跨仓库直接列出有实际失败结果的游戏，附带 GitHub Actions 原始执行 URL 的访问入口。
- 可导出的交接报告独立统计真实游戏测试的通过、失败和过期，不再只写 CI 或 HTTP 静态资源状态。
- 自动化单元测试刻意设置“CI 成功 + Pages 发布 + HTTP 可达 + Chromium 失败”样本，断言仍然标为需要处理；Chromium ATLAS UI 测试覆盖实际筛选、数量、移动端展示。
- 不把任何局部通过当作完整游戏发行认证。无法验证的游戏仍需独立 Playtest、许可和性能验收。


## Edition 15 · 所有 10 款已开放网页游戏进入真实浏览器验收

此前独立 Chromium 巡检只覆盖 7 款已发布游戏，剩余 3 款经验证的游戏入口未纳入统一测试。本版扩展至游戏大厅中全部 **10 款公开可试玩** 游戏，另有 1 个尚未达到发布门槛的 AZURE COAST 仍被阻断，不会将其伪装为通过。

新增公开游戏的真实浏览器行为：
- **QUBECRAFT 方块世界**：通过真实世界管理器、填写名称与种子、选择创造模式并创建世界；验证体素世界与角色初始化，然后通过暂停菜单保存退出，检查世界仍在列表；最后检查 390px 页面。
- **CIMULITY 城市模拟**：真实 Next.js/Pixi 城市 Canvas 启动、暂停和恢复模拟时间、打开与关闭存档管理器，手机 Build 工具栏打开/关闭。
- **SPACEFORTRESS 星际前哨**：等距殖民地 Canvas、资源与区域加载，真实打开和关闭殖民地面板、指南；点击保存并等待浏览器存储成功确认；移动端基本宽度验证。

3 款新增对象被加入 GitHub Actions 每日公开 Chromium 独立会话流程与可信 ID 校验；仅在真正执行后才展示结果。十款的这些小范围关键操作通过，也仍不足以宣布任一游戏达到完整产品级验收。

## Edition 16 · QubeCraft / Cimulity 真实验收等待条件修复

首次十款线上运行 #42009542622 中，8/10 款通过。方块世界与城市模拟已通过启动、核心交互检查，但存档操作的测试等待逻辑超时。

- QubeCraft 的 Chromium 无指针锁定，单独按 Esc 不符合该游戏的实际暂停操作。验收仅对此游戏采用公开支持的 ?touch=1 触控模式，真实点击游戏可见的 Pause 按钮，先核验暂停菜单，再点击保存退出，确认测试创建的 ATLAS QA / Creative 世界仍在世界列表里。不直接调用游戏内部菜单方法。
- Cimulity 使用 React vaultOpen 条件渲染，真正点击关闭后会从 DOM 移除存档弹窗而非隐藏；检查改为等待 city-vault-dialog 节点不存在。
- 两项改动仅改变 ATLAS 真实验收，不修改目标游戏、不伪造通过记录。合并后必须重新执行完整的十款 Chromium 游戏。

## Edition 17 · 游戏浏览器验收截图与可量化运行证据

在既有十款独立 Selenium/Chromium 游戏测试基础上，每一款在**完成真实核心操作后**捕获一张桌面游戏截图，在**完成真实移动布局/交互后**再捕获一张移动端截图。失败时保留原有错误现场截图和逐项失败报告。使用独立浏览器 Profile，不涉及真实用户数据。
公开 game-runtime.json 新增 screenshot 文件名列表与实测执行时间、最后一次页面导航 DOM 就绪耗时及资源数量，提供可追溯的证据元数据。截图文件归档到对应 GitHub Actions run 的 Artifacts（默认保留 10 天），官网仅提供运行记录链接，不把图片伪装为 CDN 长期可用资源。
所有文件名经固定已知游戏 ID 白名单过滤，拒绝外部 URL、任意路径和用户可控 HTML 注入。页面显示浏览器运行耗时、抽样截图张数及原始 Actions 下载入口；这些数字仅是观察值，**不能单凭一次 DOM 就绪时间来认定帧率、FPS、游戏性能或发布质量达标**。

## Edition 18 · 游戏测试代码发生变更时自动运行实机验收

除每日 UTC 03:27 定时执行与显式 workflow_dispatch 以外，ATLAS 实际游戏 Chromium 验收在以下代码合并到 main 后自动执行：live-game-qa.yml 工作流本身、tests/live_games.browser.py。
工作流不会对公开结果 data/game-runtime.json 的自动提交再次触发，避免递归排队和无意义的 Actions 消耗。真实运行完成后，继续提交公开通过/失败证据并触发 Pages 更新；实际游戏失败仍会将该 QA 运行标记为失败。

## Edition 19 · 午夜工厂内置教程遮挡的真实操作验收

首次引入每游戏截图的自动 QA 运行 #42018072064 真实取得 20 张桌面和手机截图，最终 9/10 款通过。午夜工厂失败原因不是页面无法启动，而是**原游戏 iframe 内的首次引导横幅 tutorial-banner 覆盖了矿机建造按钮**，Selenium 用户点击被拒绝。这属于真实用户也可能遇到的界面流程。
修复只修改自动化操作顺序：进入原游戏后，等待首次提示条出现，通过其自带的 tutorial-skip 按钮真实点击关闭，再验证矿机工具选择和取消。不会使用 JavaScript 直接隐藏横幅、写入本地已完成标志或调用游戏内部控制方法。新增 tutorial 单独检查项。
该测试脚本合并到 main 后，将由 Edition 18 的受限 push 事件自动重新触发完整十款 Chromium 验收；失败也继续保留截图和错误记录。
