# WoW Forever Talent Calculator — SEO 运营计划

- 生产域名：https://wowforevertalent.app
- GSC Property：`sc-domain:wowforevertalent.app`（2026-09-16 已验证）
- GA4 Property：`G-S8DFC9KTJW`（账号 wowforevertalent）
- 时区：Asia/Shanghai（GSC 数据按 Pacific Time 标注，联读时注意）
- 方法论依据：Cbrain/wiki —《网站运营分阶段 TODO 模板》《GSC 数据备份与运营跟踪模板》《SEO 动作日志模板》《GSC数据诊断》《工具站运营》《精品工具页面方法论》
- 配套文件：[action-log.md](./action-log.md)（动作日志）· [reports/](./reports/)（每日数据报告，自动生成）
- 创建：2026-09-20 · 数据窗口：上线（2026-09-16）至今

---

## 一、运营快照（每周一更新）

## 运营快照 2026-09-24

- 当前阶段：**S2 已进入**（150 点击 / 2440 曝光 / 平均排名 10.3；索引单日 +4 至 23）
- demand_status：游戏 2026-11-04 上线，需求窗口明确且持续增长
- build_status：verified_local + ci_verified（Cloudflare Pages 自动构建）
- deployment_status：verified（push 即部署）
- live_status：verified_live（首页/职业页/Legacy/Wiki 全部 200）
- search_status：23/27+ 索引（+4）；150 点击 / 2440 曝光 / 排名 10.3（窗口 09-15~09-21）；首页 description 实验今日启动
- growth_status：GA4 过去 7 天 315 用户 / 604 浏览；share_copy / save_build 关键事件已标记
- blocker_status：GA4↔GSC 关联向导需人工完成（自动化不生效）
- GSC 最近完整日期：2026-09-21（T-3）
- 今日唯一重点：description 实验上线（已部署），观察窗口至 10-01
- 当前 P0：无
- 下次复查：每日 09:00（自动）

## 二、阶段判定：S1→S2

**进入 S2 的证据**（已具备大半）：
- ✅ 重点页已索引（19/27，3 天内）
- ✅ 自然搜索流量已出现（google/organic 93 用户 / 115 会话）
- ⏳ GSC 查询/页面级反馈尚未返回 → S2 的 B2 关键词表暂时无法建立
- ✅ 技术错误不再主导数据（无 P0）

**S2 阶段目标**（按 wiki 定义）：证明"哪些页面、查询、体验和渠道值得继续投入"。

---

## 三、每日 TODO（自动任务 09:00 执行，人工复核）

每日由定时任务自动执行并写入 `reports/YYYY-MM-DD.md`，回填本文件第四节：

```text
优先级 | 任务 | 触发信号 | 验收标准
```

- [ ] **P0 生产健康**：首页、/mage/、/legacy/、/wiki/、robots.txt、sitemap.xml 全部 200；不 200 → P0 告警
- [ ] **P0 部署一致性**：线上一致于最新 commit（build ID 断言）
- [ ] **P1 GSC 总量（A1）**：T-3 日期的点击/曝光/CTR/平均排名，对比前一日同口径
  - 告警线：曝光较前日腰斩且持续 3 天 → 检查算法更新/技术问题/索引异常
  - 口诀：排名微降+曝光点击大涨 = 覆盖率扩大（变强）；曝光点击齐跌 = 收缩（警惕）
- [ ] **P1 GSC 查询（A2）**：查询 × 页面 × 设备明细入库（数据返回后）
  - 机会词筛选：曝光 ≥ 10 且排名 10–20 → 进入优化队列；CTR < 2% 且曝光 ≥ 30 → 复查 title/description
- [ ] **P1 GA4**：活跃用户/会话/关键事件（share_copy、save_build、share_create）+ 渠道分布
- [ ] **P2 索引快照**：已索引页面数（记录观察值，不向前填充）
- [ ] **日志**：当天任何已发生动作写入 action-log.md（有动作才写）

## 四、每周任务（周一随每日任务一并执行）

- [ ] B1 趋势总表：本周 vs 上周（等长完整窗口），写入周报
- [ ] B2 关键词明细：28 天窗口（数据足够后），分类 品牌/核心/长尾机会，裁决 保持/提CTR/补内容/补内链/等待
- [ ] B3 页面生命周期：重点 URL 的索引/首次曝光/首个可见查询（D7/D30 复查点）
- [ ] 核心 SERP 抽查：手动检查 `wow forever talent calculator`、`wow forever [class] talent calc` 的排名与 SERP 形态
- [ ] 内链机会：高流量页 → 低曝光页的导流（如首页/Changes → 职业页）
- [ ] 外链/渠道动作评估（S1 任务延续：社区、导航站、第一批 referring domains）

## 五、当前任务清单（触发信号 → 验收标准）

| 优先级 | 任务 | 触发信号 | 验收标准 | 状态 |
| --- | --- | --- | --- | --- |
| P1 | 点亮 save_build 关键事件 | 事件已入队收集 | GA4 事件列表出现且星标点亮 | ⏳ 等 24h |
| P1 | GSC↔GA4 关联 | 两者同账号同权限 | GA4 报告出现 Search Console 数据 | not_started |
| P1 | 查询数据返回后建 B2 基线 | GSC 效果报告出现查询行 | 关键词表 ≥ 1 个快照 | blocked（等数据） |
| P2 | Changes 页 → 职业页内链强化 | Changes 跳出率 16.7%、参与度最高 | 每个职业页从 Changes 获得内链入口 | not_started |
| P2 | 首页二跳引导 | 首页跳出率 59.2%（工具页正常偏高） | Legacy/Wiki/Changes 入口更醒目 | not_started |
| P2 | 第一批 referring domains（详见 [link-building.md](./link-building.md)：A 目录/GitHub 零风险先行，B 社区养号，C Beta 数据钩子） | S1 外链任务延续；John 公式外链乘数 | D30 内 ≥ 5 个真实相关来源域名 | in_progress（清单已建） |
| P2 | 9 职业页内容对齐 Druid 模板 | Druid 页跳出率 18.2% 表现最好 | 内容质量对齐 + 有数据后复查 CTR | not_started |
| P1 | Beta 数据更新内容页 | 9-17 Beta 已开，数据源会重建 | 数据更新后 Changes/Legacy 页同步 + 日志记录 | in_progress（等待源） |
| P2 | **变现准备：AdSense 申请** | **日均 UV ≥ 300 且连续 2 周**（GA4 报告监控） | AdSense 过审 + ads.txt 上线；合规页已齐 | not_started（等触发信号） |
| P3 | Adsterra 评估 | AdSense 有 2-4 周真实 RPM 数据 | 对比 RPM/UX 后裁决是否作补充或兜底 | not_started（明确不在当前流量段申请） |
| P3 | GA4 关键事件补充（compare 打开、Legacy 规划使用） | 关键事件基线稳定 | 事件上报且标记 | not_started |

---

## 六、阈值配置（本项目）

- 最小曝光样本：10（低于此不因排名波动行动）
- 低 CTR 复查阈值：CTR < 2% 且曝光 ≥ 30
- 高 CTR 参考阈值：> 5%
- 机会词排名带：10–20
- 品牌词：`wowforevertalent`、`wow forever talent`（报告时提供 all / non-brand 两个视图）
- 默认查询窗口：7d（数据少时用 28d）
- 页面 cohort 复查点：D7 / D30
- 数据延迟缓冲：T-3，回补最近 7 天
- **变现触发阈值**：日均 UV ≥ 300 连续 2 周 → 启动 AdSense 申请（每日 GA4 检查监控此值）

## 七、下一步优化方向（按优先级）

1. **等查询数据 → 定关键词主攻方向**（预计 3–7 天内返回）。第一批要回答：`wow forever talent calculator` 类工具词排名多少？哪些职业词（如 druid/mage talent calculator）先出曝光？机会词排名 10–20 的直接进 S2 优化队列。
2. **Changes 页是内容杠杆**：跳出率 16.7% 说明"改了什么"是刚需。补每个职业的"Top 10 changes"内容块并内链到对应计算器，把高参与度导成工具使用。
3. **Legacy/Wiki 两个新页等待出词**：刚上线暂无数据，不额外投入，等 B3 生命周期数据说话。
4. **外链冷启动**（S1 任务）：Reddit r/classicwow 等社区 Beta 讨论期发真实有用的分享（注意社区规则）、提交导航站/工具目录；拒绝批量垃圾外链。
5. **Beta 数据更新节点**：数据源（talentsforever）从 Beta 客户端重建后，第一时间更新快照并写 Changes 日志——"第一个准确反映 Beta 数据的计算器"是天然的内容与外链钩子。
6. **11 月上线前的关键节点**：上线日（11-04/05）前后搜索需求会暴涨，提前 1–2 周确保所有页面内容对齐正式版数据。

---

## 附：数据读取顺序（每日执行标准流程）

```text
生产健康（curl 首页/核心页/robots/sitemap）
  -> 部署一致性（最新 commit vs 线上）
  -> GSC A1 总量（T-3）+ 同比前日
  -> GSC A2 查询明细（数据返回后）
  -> GSC 索引快照
  -> GA4 用户/会话/关键事件/渠道
  -> 写 reports/YYYY-MM-DD.md
  -> 回填本文件快照与任务状态
  -> 有动作写 action-log.md
```

> 数据不可用时的纪律：写明"数据源不可用"并继续可执行任务，**绝不补造数字**。
