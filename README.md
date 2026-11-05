# ATLAS · Developer Studio

## 新增：在线游戏大厅

访问 [ATLAS 游戏大厅](https://aincfh.github.io/dev-control-center/#arcade) —— 汇总多个独立游戏仓库。提供类型筛选、关键词搜索、仅看可试玩、浏览器本地收藏，以及直达每款游戏的源码和在线运行入口。所有入口都基于实际 GitHub Pages 部署记录核验；未发布或未通过 Playtest 的项目只给出源代码链接，不提供虚假的可玩按钮。游戏封面仅有注明的真实仓库截图，其余是主题动效，不冒充游戏实拍。

当前游戏大厅收录 11 个独立项目，其中 10 款已有本账号 GitHub Pages 部署与浏览器验收记录。《Qubecraft 方块世界》已通过完整 Playtest 并进入可游玩状态，但仍属于开发中版本；其中 MORI 在缺少 WebGL 的浏览器会自动显示安全降级画面。项目覆盖《日落餐馆》《天堂小岛》《山野钓行 NEXT》《湖光物语》《Qubecraft》《Cimulity》《Mori》《午夜工厂》《小城人生》《蔚蓝海岸》等 10 款独立项目。页面使用 `arcade.js` 的可测试注册表，另有 `tests/arcade.test.js` 和真实 Chrome 手机/桌面测试。


公开只读的 GitHub 多项目开发控制台。已从纯仓库展示页升级为**真实构建状态、项目任务与交付监控**。

## 在线访问

https://aincfh.github.io/dev-control-center/

## 已实现

- 公开仓库发现、搜索、分类筛选、排序、响应式项目详情；
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
