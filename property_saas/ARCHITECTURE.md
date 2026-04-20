# 物业管理 SaaS · 架构与模块分析

这份文档按你描述的 7 个模块逐一分析：字段选择、实体关系、典型坑位、
取舍建议。本仓库里的 `property_saas/app/` 就是按这份设计落地的最小实现，
可以对照着 review 你自己的代码。

## 0. 共性设计：多租户 + 公共字段

物业管理公司的 SaaS 一定是多租户的（一套系统卖给 N 个物业公司）。
常见有 3 种部署形态：

| 模式 | 说明 | 优缺点 |
|---|---|---|
| 每公司一库 | 每个客户一个独立数据库 | 隔离性最强，运维成本高 |
| 共享库 + schema | 同库不同 schema | PG 合适，MySQL 支持差 |
| **共享库 + tenant_id** | 所有表带 `tenant_id`，应用层过滤 | 运维最简单，最常用，本仓库采用 |

对应到代码：`models/common.py` 定义了 SaaS 层的 `Tenant`，
以及一个 `tenant_fk()` 快捷方法给所有业务表用。每次查询都必须按
`tenant_id` 过滤，这是安全性的关键红线——你自己那份代码里要特别
检查有没有“忘了加 tenant_id 过滤”的查询，这是最常见的数据泄漏源。

另一个共性：`TimestampMixin` 自动维护 `created_at / updated_at`。
别用 `datetime.now()` 默认值，用数据库侧的 `func.now()`，
否则跨时区 / 批量导入时会出奇怪的漂移。

> ⚠️ 命名坑：物业系统里“租户”有两层含义——
> SaaS 层是“买你系统的物业公司”，业务层是“住在房子里的承租人”。
> 本设计里 SaaS 层叫 `Tenant`，业务层叫 `Resident`，避免重名。

---

## 1. 房产管理 (Property)

文件：`app/models/property.py`

实体：`Building → Unit`（一对多）。

| 字段 | 说明 |
|---|---|
| `Building.code` | 楼栋编号，在同一 tenant 下唯一 |
| `Unit.unit_no` | 户号（3-1-502 这种），`(tenant_id, building_id, unit_no)` 联合唯一 |
| `Unit.area_sqm` | 套内/建筑面积，用 `Numeric(10,2)` 而不是 `float` |
| `Unit.status` | vacant / occupied / rented |

**坑位**：

1. 面积、费率、金额一律用 `Decimal`，不要用 `float`。
   浮点相乘会让账单出现 `299.9999999`。
2. `Unit.status` 不是业务事实，是“派生状态”。
   最好做成 view 或由应用层根据租约/入住状态刷新，否则容易和真实
   入住情况脱节。本仓库在创建租约时会自动把 unit 改成 `rented`，
   这是最低限度的一致性保证，但更严谨的做法是加个定时对账任务。
3. 小区/项目层级：如果业务方有“多小区”，建议在 Building 之上再加
   `Project` / `Community` 表。本仓库没加，保持最小化，但 schema 保留
   了扩展空间（Building 上加 `project_id` 即可）。

## 2. 业主管理 (Owner)

文件：`app/models/owner.py`

实体：`Owner` + `OwnerUnit`（多对多，带份额）。

**关键取舍**：业主和房产之间不是一对多，是多对多——

* 一个人可能有多套房；
* 一套房可能是夫妻共有、公司名下多股东。

所以设计成关联表 `OwnerUnit`，字段包括：

* `share_ratio Numeric(5,4)`：持有比例，求和应为 1.0000，但允许暂时
  不平衡（过户中），靠后台对账报警。
* `acquired_on`：取得日期，用来算物业费减免、车位分配优先级等。

**坑位**：

1. `id_card` 在国内是强 PII，要上加密/脱敏，至少建唯一索引但返回时只
   展示后 4 位。生产环境应该列级加密。
2. 业主信息变更要有审计流水。本仓库没写 audit log 表，但 `TimestampMixin`
   给了最基本的 `updated_at`，真实项目应该再加一张 `owner_audit` 表。

## 3. 租户管理 (Resident / Lease)

文件：`app/models/resident.py`

实体：`Resident` + `Lease`。

**设计关键**：把“人”和“租约”分开。同一个人（Resident）可能先后租多次，
一个租约把 `(unit, resident, start_date, end_date, rent, deposit)` 绑在一起。

| 字段 | 说明 |
|---|---|
| `Lease.start_date / end_date` | 合同有效期 |
| `Lease.monthly_rent` | 月租金 |
| `Lease.deposit` | 押金 |
| `Lease.status` | active / ended / terminated |

**坑位**：

1. **时间区间重叠**：同一 Unit 不应该同时有两个 active lease。
   仓库里的 API 没强校验，推荐在业务层加 range check，或数据库层用
   PostgreSQL `EXCLUDE USING gist` 约束（SQLite 做不到）。
2. **押金不是收入**：押金和租金语义完全不一样，押金是负债。
   别把它直接并入费用明细 `InvoiceLine`，否则财务报表会错。
3. **退租流程**：要考虑中途退租、违约金、押金抵扣水电。
   单表搞不定，真实系统通常再加一张 `LeaseSettlement`。

## 4. 车位管理 (Parking)

文件：`app/models/parking.py`

实体：`ParkingSpace` + `ParkingAssignment`。

| 字段 | 说明 |
|---|---|
| `ParkingSpace.kind` | owned / rental / visitor |
| `ParkingAssignment.owner_id` or `resident_id` | 二选一（路由里已校验） |
| `ParkingAssignment.end_date` | NULL 表示当前有效分配 |

**坑位**：

1. **二选一约束**：owner_id 和 resident_id 至少/至多填一个，schema 约束不好
   表达（check constraint 可以，但多数 ORM 里不直观）。仓库选择在
   Pydantic 层用 `@model_validator` 校验。
2. **一车位在同一时间只能有一个 active 分配**。仓库在 POST 接口里
   显式查询 `end_date IS NULL` 的分配防冲突，生产环境建议再加唯一
   索引 `WHERE end_date IS NULL`（PG 支持，MySQL 5.7+ 生成列勉强可以）。
3. 访客车位通常不走 `ParkingAssignment`，是按小时计费的临时记录，
   建议另建 `VisitorParkingLog` 表，不要混进来。

## 5. 维修管理 (Maintenance)

文件：`app/models/maintenance.py`

单表 `MaintenanceRequest` + 显式状态机。

状态流转：
```
submitted ──► assigned ──► in_progress ──► completed
     │            │                 │
     └─►cancelled└─►cancelled       └─►cancelled
```

仓库里 `routers/maintenance.py` 的 `_TRANSITIONS` 常量就是这张图的
代码化表达。任何非法跳转直接 400，避免业务层手改状态。

**坑位**：

1. **不要用 `String` 存状态**，用 `Enum`（非 native，便于跨数据库迁移）。
   否则维护到后期会出现 `Completed`、`COMPLETED`、`完成` 三种写法。
2. **cost 最终要走财务**：维修完成后通常要生成一条 `InvoiceLine`
   （fee_type = `maintenance`）。本仓库没写这个触发逻辑，留给应用
   服务层或 event handler 实现。
3. **照片/附件**：几乎每个维修单都需要图片。建议另建
   `MaintenanceAttachment` 表存 OSS key，别把 base64 塞进 description。
4. **SLA 指标**：`assigned_at / completed_at` 是为了算 TAT，做报表用。

## 6. 固定资产清单 (Fixed Asset)

文件：`app/models/asset.py`

单表 `FixedAsset`，重点是会计语义。

| 字段 | 说明 |
|---|---|
| `purchase_price` | 原值 |
| `salvage_value` | 残值 |
| `useful_life_years` | 使用年限 |
| `status` | in_use / idle / repairing / scrapped |

路由里提供了 `/assets/{id}/depreciation` 做**直线法**折旧的粗算，
返回年/月折旧额。

**坑位**：

1. **折旧不是算出来就完了**，要**按期入账**。真实系统一定有
   `DepreciationEntry(asset_id, period, amount, booked_at)` 表，
   每个月 cron 生成一条并推到总账。本仓库刻意没加，保持最小可运行。
2. **多种折旧法**：除了直线法还有双倍余额递减、工作量法。做成
   `depreciation_method` 字段 + 策略模式，比硬编码好。
3. **资产与维修联动**：维修单 `unit_id` 之外，应该还能挂 `asset_id`
   （修电梯、修水泵就是针对资产）。扩展点：`MaintenanceRequest.asset_id`。
4. **盘点**：固定资产一年至少盘点一次，要设计 `AssetInventory` 表
   记录盘点结果（盘盈 / 盘亏 / 正常）。

## 7. 财务费用明细 (Finance)

文件：`app/models/finance.py`

这是最容易写错、也最影响收入的模块。本仓库拆成 4 张表：

```
FeeItem         费目主数据（物业费 3.5元/㎡·月、水费 4.8元/吨 …）
Invoice         账单（账期 + 总额 + 已付 + 状态）
 └─ InvoiceLine 账单明细（=你说的“财务费用明细”）
Payment         付款流水（可多笔，支持分期）
```

关键点：

1. **FeeItem 和 InvoiceLine 分开**。FeeItem 是“价目表”，
   InvoiceLine 是“这一期收你多少”。涨价时只改 FeeItem，
   历史账单不受影响，这是会计合规的基本要求。
2. **Invoice 的 total/paid/status 是派生字段**，由
   `_recompute_invoice_totals()` 在每次加明细/付款后重新计算，
   绝对不要让前端传 total。
3. **InvoiceStatus = unpaid / partial / paid / void**。
   `partial` 一定要有，现实中超过一半的物业费是分期付的。
4. **Payment 是 append-only**。一旦写入就不允许修改，只能追加反向
   `Payment`（negative amount）来做退款，财务审计会感谢你。
5. **金额字段一律 `Numeric(12,2)`**，单价 `Numeric(12,4)`（水费
   按度数算要 4 位）。整个系统里我检查过：**没有一个 Float**。
6. **账期 vs. 开票日期 vs. 付款日期** 是三个不同概念：
   * `period_start/end`：账期（比如 2026-04 的物业费）
   * `created_at`：出账时间
   * `due_date`：应付日期
   * `Payment.paid_at`：实际收款时间
   混淆这几个是财务报表错乱的头号元凶。
7. **发票 vs. 账单**：国内语境下“发票”一般指税务发票（走税控机），
   这里的 `Invoice` 其实是“账单 / 费用通知单”。如果要接税控，
   还需要一张 `TaxInvoice` 表，并和 `Invoice` 多对一（允许合并开票）。

---

## 横切关注点（容易被忽略）

| 关注点 | 本仓库处理 | 生产建议 |
|---|---|---|
| 多租户隔离 | 所有表带 `tenant_id`、API 按 header 过滤 | 中间件强制注入、DB 行级安全 (PG RLS) |
| 鉴权 | `X-Tenant-ID` header | JWT + 角色权限，角色 ≥ 5 种（业主/租户/管家/财务/管理员）|
| 金额精度 | `Decimal` / `Numeric` | 一致，避免任何 float |
| 时区 | `DateTime(timezone=True)` | 服务端统一 UTC，展示层转 Asia/Shanghai |
| 审计 | 无 | 新增 `audit_log` 表，记录 who/when/what/diff |
| 软删除 | 无 | 加 `deleted_at`，默认查询过滤 |
| 导入导出 | 无 | 物业公司一定会要 Excel 批量导入，提早规划 |
| 文件存储 | 无 | 维修照片、合同扫描件走对象存储，DB 只存 key |
| 报表 | 无 | 月度收缴率、入住率、维修 TAT、资产折旧月表 |
| 消息通知 | 无 | 缴费提醒、维修进度，走短信/公众号/企业微信 |

---

## 你贴代码之后怎么用这份文档

把你自己那份代码贴上来后，我们逐模块走一遍：

1. 对照本文 7 个模块的字段表，看你漏了什么、多了什么。
2. 重点 review 这几类高风险点：
   * 所有查询有没有 tenant_id 过滤；
   * 金额/面积有没有用 float；
   * 状态字段是不是 enum、有没有状态机；
   * 账单 total 是不是派生的（不是前端传入）；
   * 租约 / 车位分配有没有时间区间重叠校验。
3. 跑 `uvicorn property_saas.app.main:app --reload`，对着 `/docs`
   的接口签名，和你的实现做 API diff。
