# WoW Forever Talent Calculator — SEO Action Log

- 生产域名：https://wowforevertalent.app
- GSC Property：`sc-domain:wowforevertalent.app`
- Analytics Property：GA4 `G-S8DFC9KTJW`
- 时区：Asia/Shanghai
- 证据根目录：本仓库 doc/seo-ops/ + git commit
- 固定复盘：每日 09:00 数据检查；每周一动作与结果对齐
- 最后更新：2026-09-20

## 动作日志

| ID | 日期 | 类型 | 动作 | 页面 | 目标词 | 技术改动 | 外链 | 推广动作 | 渠道 | 状态 | 观察窗口 | 证据链接 | 复查日期 | 结果 / 下一步 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20260916-01 | 2026-09-16 | 技术 | 域名从 wowforevertalentcalculator.com 切换到 wowforevertalent.app（canonical/robots/sitemap/OG 同步） | 全站 | — | canonical 全站更新；DNS 切 Cloudflare | — | — | Cloudflare | live_verified | D7 | commit 102bb73 | 2026-09-23 | — |
| 20260916-02 | 2026-09-16 | 索引 | sitemap.xml 提交至 GSC（网域属性已验证） | 全站 | — | — | — | — | GSC | live_verified | D7 | GSC sitemaps 页 | 2026-09-23 | 09-19 已读取成功，发现 27 网页 |
| 20260916-03 | 2026-09-16 | 技术 | 新增 GA4（G-S8DFC9KTJW）+ 隐私页披露 | 全站 | — | BaseLayout 加 gtag；anonymize_ip | — | — | GA4 | live_verified | D7 | commit 0faddd4 | 2026-09-23 | — |
| 20260916-04 | 2026-09-16 | 内容 | 上线 /legacy/ Legacy 系统参考 + 16 点规划器 | /legacy/ | wow forever legacy system, legacy perks | 新页面 + legacy.json 数据管线 | — | — | 本仓库 | live_verified | D7/D30 | commit 102bb73 | 2026-10-16 | — |
| 20260916-05 | 2026-09-16 | 内容 | 上线 /wiki/ 官方资料 Wiki（含国服/全球日期） | /wiki/ | wow forever wiki, what is wow forever | 新页面 | — | — | 本仓库 | live_verified | D7/D30 | commit 102bb73 | 2026-10-16 | — |
| 20260920-01 | 2026-09-20 | 体验 | GA4 关键事件埋点：share_create / share_copy / save_build | 计算器全站 | — | trackEvent helper | — | — | 本仓库 | live_verified | D7 | commit 78493cd | 2026-09-27 | share_copy 已标关键事件 |
| 20260920-02 | 2026-09-20 | GSC发现 | 首批索引数据：19/27 已索引；GA4 首周 190 用户（google/organic 93，chatgpt.com 5） | 全站 | wow forever talent calculator 族 | — | — | — | GSC / GA4 | 已记录 | D7 | doc/seo-ops/reports/ | 2026-09-27 | 查询数据返回后建 B2 |
| 20260922-01 | 2026-09-22 | 内容 | /druid/ 新增"headliner new talents"叙事块（Eclipse/Mangle/Berserk/Wild Growth，数据驱动）+ 指向 /changes/、/talents/druid/、/legacy/ 的内链 | /druid/ | wow forever druid talents | — | — | — | 本仓库 | live_verified | D7 | commit 待填（78493cd 后） | 2026-09-29 | 观察 /druid/ 点击与排名变化；有效则推广到其他 8 个职业页 |
| 20260922-02 | 2026-09-22 | GSC发现 | 查询数据返回：95→119 点击 / 1110→1590 曝光 / 平均排名 9.7；首个职业词 wow forever druid talents 出曝光（1/57） | 全站 | wow forever druid talents | — | — | — | GSC | 已记录 | D7 | doc/seo-ops/reports/2026-09-22.md | 2026-09-29 | — |
| 20260924-01 | 2026-09-24 | 索引 | 索引 19→23（+4），Crawled 队列 4→1 | 全站 | — | — | — | — | GSC | 已记录 | D7 | doc/seo-ops/reports/2026-09-24.md | 2026-10-01 | — |
| 20260924-02 | 2026-09-24 | 元信息 | 首页 description 实验上线：首句改为品牌连写词开头（含 wowforevertalent.app），单变量，观察 7 天 | / | wowforevertalent（低 CTR 词：1.6% CTR @128 曝光） | description 变更（150 字符），title 不动 | — | — | 本仓库 | live_verified（部署后复查） | D7（至 10-01） | commit 1ee6c16 | 2026-10-01 | 基线：CTR 1.6% @128 曝光；验收 ≥ 站均 6.2% 或 CTR 提升 2 倍 |
