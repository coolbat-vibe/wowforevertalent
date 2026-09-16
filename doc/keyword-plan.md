# 关键词规划（TDH 框架）

文档版本：v1.0 / 2026-09-16
依据：关键词密度是内容到位的副产品，不是瞄准的靶子。规划原则 = 需求拆分到页 + T/D/H 分层布局 + 近义词轮换 + 密度事后体检。

## 1. 需求拆分：一个需求一页

| 搜索需求（意图） | 承接页面 | 状态 |
| --- | --- | --- |
| `wow forever talent calculator`（找工具） | `/` | ✅ 已覆盖 |
| `[class] talent calculator`（找单职业工具） | `/[class]/` ×9 | ✅ 已覆盖 |
| `wow forever talents` / `[class] talents`（查资料） | `/talents/`、`/talents/[class]/` ×9 | ✅ 已覆盖 |
| `wow forever talent changes` / `vs classic`（查改动） | `/changes/` | ✅ 已覆盖 |
| `wow forever legacy system` / `legacy perks`（查传承） | `/legacy/` | ✅ 已覆盖 |
| `wow forever wiki` / `what is wow forever`（了解游戏） | `/wiki/` | ✅ 已覆盖 |
| `warcraft forever talent calculator`（名称变体） | 首页 FAQ 内自然覆盖（同需求变体，不拆页） | ✅ |
| `[class] build / guide / best build`（攻略需求） | 未来 `/wiki/[class]-guide/` 等攻略页 | 📋 规划中（wiki 锚点已预留） |
| 隐私/条款/来源/对比/我的方案 | 工具与法务页，不做关键词竞争 | — |

规则：同一需求的不同表达（talent calculator / talent planner / talent build）放同一页轮换；不同需求（计算器 vs 资料 vs 攻略）必须不同页。

## 2. 每页 T/D/H 布局

| 页面 | Title（核心词前置） | H1 | H2 关键词位 | Description 要点 |
| --- | --- | --- | --- | --- |
| `/` | WoW Forever Talent Calculator — Free Online, No Sign-Up | 同核心词 | 工具区 H2 + "How Does the Talent Calculator Work?" + "What Changed in WoW Forever Talents?" + "What Is the WoW Forever Legacy System?" + **Calculator FAQ**（本次新增） | 核心词 1 次 + free/no sign-up 行动点（151 字符） |
| `/[class]/` | WoW Forever [Class] Talent Calculator — [三树] | 同核心词 | 三树名 + "What Are the [Class] Talent Trees…" + "What Changed for [Class] Talents vs Classic?" | 核心词 + trees + builds（约 190 字符，可接受） |
| `/talents/[class]/` | WoW Forever [Class] Talents — [三树] Reference | WoW Forever [Class] Talents | 三树名 + About this data | 查资料意图，与计算器页区分 |
| `/changes/` | WoW Forever Talent Changes vs Classic — All 9 Classes | WoW Forever Talent Changes | Changes by Class 等 | 已达标 |
| `/legacy/` | WoW Forever Legacy System — All 20 Legacy Perks & Free Planner | WoW Forever Legacy System & Perk Planner | "Plan Your 16 Launch Legacy Points" + "All Legacy Trees & Perks" 等 | 已达标 |
| `/wiki/` | WoW Forever Wiki — World of Warcraft: Forever Explained 魔兽世界无限（本次精简至 <70 字符） | WoW Forever Wiki | **WoW Forever** Beta & Launch Dates / The **WoW Forever** Talent System / The **WoW Forever** Legacy System / The Nine Classes in **WoW Forever**（本次加词） | 精简至约 160 字符（原 216） |
| `/sources/` | Talent Data & Sources — … | **Talent Data & Sources**（本次与 Title 对齐） | — | — |

## 3. 变体轮换词表（正文自然散布，不硬塞）

- 工具类：talent calculator / talent planner / talent build(s) / plan talents / spend points
- 资料类：talent trees / per-rank effect / talent reference / talent data
- Legacy 类：Legacy system / Legacy points / Legacy perks / Legacy trees / Legacy planner
- 游戏名：WoW Forever / World of Warcraft: Forever / Warcraft Forever / 魔兽世界"无限"（CN 页与 wiki）
- 禁止：隐藏文字、白色文字、超小字号——正文不需要这些，关键词放 T/H/首段/结尾后密度自然达标。

## 4. 密度体检基线（2026-09-16，按构建产物正文统计）

| 页面 | 总词数 | 核心词 | 变体 | 判读 |
| --- | --- | --- | --- | --- |
| `/` | 1232 | talent calculator 0.65% | talents 0.81% / build 0.97% / wow forever 0.65% | 关键位置全部到位；H2 增词后覆盖更好 |
| `/mage/`（代表职业页） | 910 | talent calculator 0.33% | talents 1.32% / build 0.77% | 近义词轮换承担覆盖，符合"不反复同一短语" |
| `/legacy/` | 1675 | legacy 1.67% | perk 0.90% | 健康 |
| `/wiki/` | 951 | wow forever 0.32% | forever 1.26% / talent 1.37% | H2 加词后提升 |

用法：每次新增内容页后重跑此统计（`doc/` 内思路，脚本可临时拼装），密度显著偏低 = 覆盖不足，显著偏高 = 生硬堆砌。

## 5. 后续内容纪律

1. 新页面先定"一个需求"，再按本表格式填 T/D/H，最后才写正文。
2. 核心词只保证出现在：Title、H1、首段第一句、至少一个 H2、结尾段。其余位置交给变体。
3. 攻略页上线时从 `/wiki/` 锚点升级为独立页，标题模式 `[Class] Talent Build Guide — WoW Forever`。
