/** ATLAS domain playbooks. These are proposed engineering plans, never proof of
 * a repository's license, quality, business viability, or completed product.
 */
export const DOMAIN_GROUPS=Object.freeze([
  {
    "id": "foundation",
    "label": "系统与开发基础",
    "description": "操作系统、桌面、移动端、开发工具和基础设施",
    "categories": [
      "system",
      "desktop",
      "mobile",
      "web",
      "devtools",
      "infra",
      "database",
      "cloud",
      "networking",
      "browsers",
      "cli",
      "testing",
      "mlops"
    ]
  },
  {
    "id": "intelligent",
    "label": "AI 与工程科技",
    "description": "智能系统、自动化、机器人、硬件、地图与科学技术",
    "categories": [
      "ai",
      "automation",
      "data",
      "iot",
      "robotics",
      "gis",
      "hardware",
      "science",
      "healthtech",
      "energy"
    ]
  },
  {
    "id": "creative",
    "label": "应用与创意产品",
    "description": "内容创作、教育、办公、商业、协作、隐私与无障碍",
    "categories": [
      "media",
      "education",
      "design",
      "productivity",
      "communication",
      "security",
      "business",
      "accessibility",
      "commerce",
      "documentation",
      "office"
    ]
  },
  {
    "id": "games",
    "label": "游戏与模拟",
    "description": "游戏、沙盒、经营、剧情、Web 3D 与生存",
    "categories": [
      "life",
      "builder",
      "survival",
      "management",
      "industry",
      "story",
      "arcade",
      "web3d"
    ]
  }
]);
export const DOMAIN_BLUEPRINTS=Object.freeze({
  "system": {
    "goal": "可恢复的桌面系统壳",
    "features": [
      "窗口焦点、Dock 和会话恢复",
      "虚拟文件树和安全文件操作",
      "浏览器语言与主题持久化"
    ],
    "acceptance": "刷新后窗口状态与文件无损恢复",
    "risk": "避免宣称可直接访问原生 Windows 文件系统"
  },
  "desktop": {
    "goal": "可安装的桌面效率工具",
    "features": [
      "文件选择、主界面和后台作业",
      "安装、升级与卸载流程",
      "离线数据与本机权限控制"
    ],
    "acceptance": "Windows 干净环境完整安装与卸载",
    "risk": "不要默认获得管理员权限"
  },
  "mobile": {
    "goal": "真实设备可用的移动应用",
    "features": [
      "原生导航与输入表单",
      "离线记录与数据库迁移",
      "通知和系统主题适配"
    ],
    "acceptance": "低内存设备重启后数据不丢失",
    "risk": "权限请求最小化"
  },
  "web": {
    "goal": "完整的 Web 应用闭环",
    "features": [
      "账户与授权边界",
      "数据读写、审计和错误恢复",
      "响应式页面和部署配置"
    ],
    "acceptance": "验证注册到删除的隔离测试流程",
    "risk": "禁止把静态页面冒充生产后端"
  },
  "devtools": {
    "goal": "可执行的开发者工具",
    "features": [
      "输入/输出与可解释错误",
      "历史、配置导入导出",
      "任务执行的取消和重试"
    ],
    "acceptance": "以真实样本完成端到端任务",
    "risk": "勿上传用户密钥"
  },
  "infra": {
    "goal": "可维护的运维工作台",
    "features": [
      "监控探针与状态告警",
      "部署策略、恢复和日志",
      "最小权限的配置存储"
    ],
    "acceptance": "模拟故障后真实恢复",
    "risk": "不要泄露监控端点凭据"
  },
  "database": {
    "goal": "可用的数据存储工具",
    "features": [
      "连接测试和只读查询",
      "结构浏览与参数化编辑",
      "备份、迁移及恢复"
    ],
    "acceptance": "对隔离数据库做数据一致性测试",
    "risk": "默认只读，防止误删生产数据库"
  },
  "cloud": {
    "goal": "隔离的云资源管理原型",
    "features": [
      "资源清单与配置可视化",
      "成本/配额只读展示",
      "部署记录与回滚操作审批"
    ],
    "acceptance": "对沙盒资源验证创建与销毁",
    "risk": "绝不在公开页面保存云密钥"
  },
  "networking": {
    "goal": "网络连接诊断工作台",
    "features": [
      "DNS、延迟与路径检测",
      "日志采样和报错说明",
      "边界条件/断网恢复"
    ],
    "acceptance": "离线/超时/代理场景可重复验证",
    "risk": "不实现未授权流量拦截"
  },
  "browsers": {
    "goal": "浏览器扩展或自研 Web 组件",
    "features": [
      "内容脚本权限声明",
      "页面内交互与设置",
      "跨站行为和错误回退"
    ],
    "acceptance": "权限最小化与不同站点测试",
    "risk": "禁止暗中读取浏览历史"
  },
  "cli": {
    "goal": "稳定的终端命令行产品",
    "features": [
      "参数、帮助和退出码",
      "标准输入输出与日志",
      "跨系统安装包和补全"
    ],
    "acceptance": "非零退出码和异常输入有回归测试",
    "risk": "严禁默认执行破坏性命令"
  },
  "testing": {
    "goal": "可复用的质量测试工具",
    "features": [
      "测试计划和用例管理",
      "浏览器运行日志/截图",
      "失败重试与报告导出"
    ],
    "acceptance": "可证明报告对应真实执行",
    "risk": "不得自动把跳过测试算作通过"
  },
  "mlops": {
    "goal": "可重现的机器学习工程流程",
    "features": [
      "数据版本与实验记录",
      "推理延迟和质量测量",
      "模型交付和回滚"
    ],
    "acceptance": "可重复数据集验证漂移与错误率",
    "risk": "模型许可和敏感数据必须审查"
  },
  "ai": {
    "goal": "可控的 AI 助理/Agent",
    "features": [
      "多模型配置与提供商抽象",
      "工具调用权限和审计",
      "失败恢复与人工确认"
    ],
    "acceptance": "真实任务调用且不越权",
    "risk": "禁止在前端硬编码 API Key"
  },
  "automation": {
    "goal": "可恢复的任务编排系统",
    "features": [
      "触发器、调度与幂等任务",
      "工作流日志与回滚",
      "人工审批与重试"
    ],
    "acceptance": "并发、重放、失败恢复测试",
    "risk": "敏感动作需要显式确认"
  },
  "data": {
    "goal": "可核验的数据可视化应用",
    "features": [
      "数据导入与类型校验",
      "图表联动和筛选",
      "来源/导出与异常值处理"
    ],
    "acceptance": "展示数据与源记录一致",
    "risk": "不得伪造实时指标"
  },
  "iot": {
    "goal": "智能设备管理原型",
    "features": [
      "设备发现和配对",
      "状态同步与离线缓存",
      "固件更新和权限边界"
    ],
    "acceptance": "断网重连与固件回退测试",
    "risk": "禁止未经授权控制真实设备"
  },
  "robotics": {
    "goal": "仿真优先的机器人控制系统",
    "features": [
      "运动规划与安全停机",
      "传感器可视化",
      "仿真任务与硬件配置隔离"
    ],
    "acceptance": "先做仿真和安全停止验收",
    "risk": "硬件控制必须遵守设备安全限制"
  },
  "gis": {
    "goal": "地理信息分析工作台",
    "features": [
      "地图图层与数据源",
      "坐标系转换和空间筛选",
      "地图交互与数据导出"
    ],
    "acceptance": "坐标系误差和离线底图测试",
    "risk": "位置数据须去标识化"
  },
  "hardware": {
    "goal": "可验证的电子硬件设计流程",
    "features": [
      "原理图及元件清单",
      "电气规则检查",
      "制造数据与版本比较"
    ],
    "acceptance": "ERC/DRC 报告和样板检查",
    "risk": "不得把未经校验设计用于高风险设备"
  },
  "science": {
    "goal": "可复现的科研计算工具",
    "features": [
      "输入参数与实验记录",
      "数值模型和结果导出",
      "精度与参考数据校验"
    ],
    "acceptance": "对照公开基准并记录误差",
    "risk": "不能把模拟输出称为真实测量"
  },
  "healthtech": {
    "goal": "健康数据管理样机",
    "features": [
      "数据结构与单位校验",
      "清晰的授权和导出",
      "审计、加密与删除"
    ],
    "acceptance": "伪造测试数据覆盖异常值",
    "risk": "不得生成未经验证的诊疗结论"
  },
  "energy": {
    "goal": "能源与环境监测应用",
    "features": [
      "时序数据采集与单位转换",
      "阈值、异常检测和趋势",
      "数据出处与误差说明"
    ],
    "acceptance": "对真实或公开基准做时间窗口复核",
    "risk": "不要把预测当实时实测"
  },
  "media": {
    "goal": "本地创作与音视频工具",
    "features": [
      "文件导入、预览和编辑",
      "编码、导出与中断恢复",
      "大文件性能与权限处理"
    ],
    "acceptance": "中文路径和文件损坏时不丢原件",
    "risk": "素材版权和编码器授权要核对"
  },
  "education": {
    "goal": "学习与训练平台",
    "features": [
      "课程、任务和学习进度",
      "测验反馈与可访问性",
      "多设备同步或离线恢复"
    ],
    "acceptance": "不同学习角色流程真实验收",
    "risk": "避免虚构成绩与证书"
  },
  "design": {
    "goal": "可编辑的设计创作工具",
    "features": [
      "画布、图层和工具面板",
      "撤销、重做与文件导出",
      "高 DPI 和输入设备支持"
    ],
    "acceptance": "可回读保存后的源文件",
    "risk": "保留上游素材、字体许可证"
  },
  "productivity": {
    "goal": "笔记与个人工作空间",
    "features": [
      "富文本/Markdown 编辑",
      "搜索与标签",
      "备份恢复与离线优先"
    ],
    "acceptance": "大量笔记和冲突恢复测试",
    "risk": "用户文档默认不上传"
  },
  "communication": {
    "goal": "可控的协作与通讯应用",
    "features": [
      "消息与通知流",
      "身份、权限和频道",
      "离线重放与消息一致性"
    ],
    "acceptance": "并发收发与历史恢复",
    "risk": "消息隐私和反滥用保护"
  },
  "security": {
    "goal": "安全与隐私辅助工具",
    "features": [
      "可解释的检查结果",
      "本地密钥/凭据保护",
      "审计日志与安全更新"
    ],
    "acceptance": "复现已知风险而不泄露敏感项",
    "risk": "只做授权范围内的安全测试"
  },
  "business": {
    "goal": "财务或企业管理工具",
    "features": [
      "账目和业务实体建模",
      "多角色审批与审计",
      "报表导出和数据一致性"
    ],
    "acceptance": "以样例数据核对账务结果",
    "risk": "不得把测试账单作为真实财务记录"
  },
  "accessibility": {
    "goal": "无障碍辅助产品",
    "features": [
      "键盘导航与语义标签",
      "屏幕阅读器与对比度",
      "放大字体和减少动画"
    ],
    "acceptance": "NVDA/VoiceOver 主流程验收",
    "risk": "辅助功能必须是真实可用的"
  },
  "commerce": {
    "goal": "购物与订单管理平台",
    "features": [
      "目录、库存和结算演示",
      "订单状态机和库存扣减",
      "退货与支付幂等"
    ],
    "acceptance": "隔离环境覆盖重复订单",
    "risk": "禁止未经授权发起真实扣款"
  },
  "documentation": {
    "goal": "可检索的知识工程系统",
    "features": [
      "文档采集与版本化",
      "全文检索和交叉引用",
      "权限、编辑历史和导出"
    ],
    "acceptance": "检索结果能够追溯原文位置",
    "risk": "不能无权复制受版权保护的材料"
  },
  "office": {
    "goal": "文档与办公套件",
    "features": [
      "编辑与基础格式",
      "多格式导入导出",
      "版本历史和打印预览"
    ],
    "acceptance": "导出文档往返校验",
    "risk": "保护用户文件隐私"
  },
  "life": {
    "goal": "人生模拟游戏",
    "features": [
      "角色属性与生命周期",
      "日常行动和长期目标",
      "存档与随机事件"
    ],
    "acceptance": "多阶段人生可实际推进",
    "risk": "不能用静态选项冒充完整玩法"
  },
  "builder": {
    "goal": "城市建造模拟",
    "features": [
      "地图网格和建筑放置",
      "资源生产与道路",
      "模拟时间和存档"
    ],
    "acceptance": "从空地图建成可维持城市",
    "risk": "复杂路径避免主线程卡死"
  },
  "survival": {
    "goal": "沙盒生存游戏",
    "features": [
      "采集、制作和背包",
      "昼夜、危险和生命值",
      "世界生成与持久存档"
    ],
    "acceptance": "新建到生存一日的完整流程",
    "risk": "状态冲突和存档损坏需恢复"
  },
  "management": {
    "goal": "经营管理模拟",
    "features": [
      "供需、定价和员工",
      "库存、收支和升级",
      "目标、失败和多日推进"
    ],
    "acceptance": "可完成经营循环与结算",
    "risk": "经济数值应可追溯"
  },
  "industry": {
    "goal": "工厂与自动化模拟",
    "features": [
      "产线布局与物流",
      "加工配方和电力",
      "产能瓶颈和进度存储"
    ],
    "acceptance": "完整输入→生产→输出闭环",
    "risk": "循环依赖不能死锁"
  },
  "story": {
    "goal": "剧情互动与冒险",
    "features": [
      "分支剧情图",
      "人物状态和选择后果",
      "章节进度与存档"
    ],
    "acceptance": "关键分支能够回放复盘",
    "risk": "避免虚假选择"
  },
  "arcade": {
    "goal": "休闲与策略游戏",
    "features": [
      "核心操作和反馈",
      "胜负/得分/难度",
      "排行榜本地安全存储"
    ],
    "acceptance": "一局完整可玩且可重开",
    "risk": "输入延迟和帧率可测"
  },
  "web3d": {
    "goal": "浏览器 3D 体验",
    "features": [
      "场景、镜头和交互",
      "资源加载和性能分级",
      "触控与键鼠适配"
    ],
    "acceptance": "真实 GPU 渲染和低端回退",
    "risk": "明确资产来源和内存预算"
  }
});
const validRepo=s=>typeof s==='string'&&s.length<=240&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(s)&&s.split('/').every(part=>part!=='.'&&part!=='..');
export function domainGroup(id){return DOMAIN_GROUPS.find(g=>g.categories.includes(id))?.id||null;}
export function domainPlan(category,{repo=null,label=null}={}){
 const blueprint=DOMAIN_BLUEPRINTS[category];
 if(!blueprint)throw Error('Unknown ATLAS domain: '+category);
 if(repo&&!validRepo(repo))throw Error('Invalid GitHub repository');
 const group=DOMAIN_GROUPS.find(g=>g.categories.includes(category));
 const source=repo?'https://github.com/'+repo:null;
 return {
  category,group:group?.id||null,groupLabel:group?.label||'未分组',
  label:label||category,goal:blueprint.goal,source,
  features:[...blueprint.features],acceptance:blueprint.acceptance,risk:blueprint.risk,
  phases:[
   {id:'source',title:'01 · 上游来源与许可',tasks:[
    source?'核对 '+repo+' 的当前版本、许可证、作者、发布文档':'选定真实上游仓库并核对许可证、作者与发布文档',
    '审查源码、素材、图标、字体、依赖和模型的独立授权及商标使用',
    '记录是否原创开发、独立集成或遵守许可的 Fork；未经授权不复用']},
   {id:'prototype',title:'02 · 可运行技术验证',tasks:[
    '在隔离环境按原仓库说明构建和启动，不把 README 当实际运行结果',
    '验证核心任务：'+blueprint.features[0],
    '记录操作系统、环境、构建命令、成功与失败截图/日志']},
   {id:'product',title:'03 · 产品功能实施',tasks:[
    '交付第一阶段产品：'+blueprint.goal,
    ...blueprint.features.slice(1)]},
   {id:'quality',title:'04 · 质量与安全验收',tasks:[
    '以真实操作核验：'+blueprint.acceptance,
    '检查异常、低资源、权限、移动/桌面适配和恢复',
    '针对领域风险提出防护：'+blueprint.risk]},
   {id:'release',title:'05 · 交付与维护',tasks:[
    '完成单元测试、集成测试、真实 UI 测试、代码审查',
    '归档独立 GitHub Issue、PR、CI、发布记录和回滚方法',
    '有可验证发布证据才标记完成；否则保持待验收状态']}
  ]
 };
}
function safeCell(value){return String(value??'').replace(/\r?\n/g,' ').replace(/\|/g,'\\|');}
export function domainPlanMarkdown(plan,{generatedAt=new Date().toISOString()}={}){
 if(!plan||!DOMAIN_BLUEPRINTS[plan.category])throw Error('Invalid domain plan');
 const lines=['# ATLAS · '+plan.label+' · 产品研发蓝图','','生成时间：'+safeCell(generatedAt),
  '研发领域：'+plan.groupLabel,'目标：'+plan.goal,
  plan.source?'参考来源：'+plan.source:'参考来源：待核实真实公开仓库',
  '',
  '> 该蓝图只是工程计划，**不是**该上游项目通过许可证审查、被 ATLAS 拥有或产品已经完成的证明。',''];
 for(const phase of plan.phases){lines.push('## '+phase.title,'',...phase.tasks.map(x=>'- [ ] '+x),'');}
 lines.push('## 领域验收重点','','- '+plan.acceptance,'- 风险：'+plan.risk,'',
  '## 项目状态与事实证据','','- 研究发现：第三方开源参考（未确认可复用）',
  '- 产品实现：未开展或待提供真实 commit/CI/功能证据',
  '- 发布验收：未完成，除非另有对应部署和真实交互记录','','');
 return lines.join('\n');
}
export function domainCoverage(categories){
 const actual=new Set((Array.isArray(categories)?categories:[]).map(x=>Array.isArray(x)?x[0]:x.id));
 const expected=new Set(DOMAIN_GROUPS.flatMap(g=>g.categories));
 return {total:actual.size,covered:[...actual].filter(id=>expected.has(id)&&DOMAIN_BLUEPRINTS[id]).length,
 missing:[...actual].filter(id=>!expected.has(id)||!DOMAIN_BLUEPRINTS[id]),
 untracked:[...expected].filter(id=>!actual.has(id))};
}
