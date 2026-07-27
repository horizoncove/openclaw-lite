# 全流程交易模拟报告（含仲裁化解）

> 产品版本：1.9.0 · 生成于模拟脚本

## 剧本

买方设验收后支付 → 供方应征要求改预付 → 秘书处协商维持验收后并成交 → 履约激励暂挂 → 争议暂停 → 仲裁退回托管/扣暂挂激励 → 恢复履约 → 结算闭环

## 步骤纪要

### 1. 健康检查

```json
{
  "step": 1,
  "title": "健康检查",
  "version": "1.9.0",
  "storage": "json",
  "at": "2026-07-26T01:09:07.282Z"
}
```

### 2. 重置演示数据

```json
{
  "step": 2,
  "title": "重置演示数据",
  "ok": true,
  "at": "2026-07-26T01:09:07.291Z"
}
```

### 3. 需求方发布供需（验收后支付）

```json
{
  "step": 3,
  "title": "需求方发布供需（验收后支付）",
  "matchId": "N-SIM-001",
  "preferredPayMechanism": "验收后支付",
  "at": "2026-07-26T01:09:07.296Z"
}
```

### 4. 供应方应征并要求改机制为预付

```json
{
  "step": 4,
  "title": "供应方应征并要求改机制为预付",
  "bidId": "BID-006",
  "proposedPayMechanism": "预付",
  "matchStatus": "撮合中",
  "at": "2026-07-26T01:09:07.301Z"
}
```

### 5. 秘书处签注成交（协商维持验收后支付）

```json
{
  "step": 5,
  "title": "秘书处签注成交（协商维持验收后支付）",
  "rejectedBid": "BID-006",
  "deal": {
    "id": "DEAL-003",
    "status": "预算已开",
    "phase": "托管中",
    "payMechanism": "验收后支付",
    "payMechanismSource": "negotiated",
    "budget": 30000,
    "escrow": 30000,
    "unfunded": 0,
    "spent": 0,
    "brokerEarned": 0,
    "supplierEarned": 0,
    "heldBroker": 0,
    "heldSupplier": 0,
    "centerRetained": 0
  },
  "buyerWallet": {
    "org": "碑林剧本研究院",
    "balance": 12000,
    "role": "buyer",
    "locked": 30000
  },
  "supplierWallet": {
    "org": "曲江短剧工场",
    "balance": 54000,
    "role": "buyer",
    "locked": 0
  },
  "at": "2026-07-26T01:09:07.320Z"
}
```

### 6. 中心履约消耗 10k（验收后支付→激励暂挂）

```json
{
  "step": 6,
  "title": "中心履约消耗 10k（验收后支付→激励暂挂）",
  "deal": {
    "id": "DEAL-003",
    "status": "履约中",
    "phase": "履约中",
    "payMechanism": "验收后支付",
    "payMechanismSource": "negotiated",
    "budget": 30000,
    "escrow": 20000,
    "unfunded": 0,
    "spent": 10000,
    "brokerEarned": 0,
    "supplierEarned": 0,
    "heldBroker": 500,
    "heldSupplier": 800,
    "centerRetained": 8700
  },
  "expect": "brokerEarned/supplierEarned=0，heldBroker/heldSupplier>0",
  "at": "2026-07-26T01:09:07.325Z"
}
```

### 7. 二次履约消耗 8k

```json
{
  "step": 7,
  "title": "二次履约消耗 8k",
  "deal": {
    "id": "DEAL-003",
    "status": "履约中",
    "phase": "履约中",
    "payMechanism": "验收后支付",
    "payMechanismSource": "negotiated",
    "budget": 30000,
    "escrow": 12000,
    "unfunded": 0,
    "spent": 18000,
    "brokerEarned": 0,
    "supplierEarned": 0,
    "heldBroker": 900,
    "heldSupplier": 1440,
    "centerRetained": 15660
  },
  "at": "2026-07-26T01:09:07.330Z"
}
```

### 8. 买方提起争议 → 项目暂停

```json
{
  "step": 8,
  "title": "买方提起争议 → 项目暂停",
  "dispute": {
    "id": "DSP-001",
    "dealId": "DEAL-003",
    "raisedBy": "碑林剧本研究院",
    "raisedRole": "buyer",
    "reason": "第二里程碑交付物与大纲约定不符，申请仲裁：部分退回托管并扣回供给激励",
    "claimTokens": 5000,
    "status": "调解中",
    "orderId": "AL-DSP-001",
    "createdAt": "2026-07-26",
    "updatedAt": "2026-07-26"
  },
  "dealStatus": "暂停",
  "disputeOrder": {
    "id": "AL-DSP-001",
    "product": "【争议】DEAL-003 剧本/素材 AI 包",
    "center": "联盟",
    "org": "碑林剧本研究院",
    "contact": "碑林剧本研究院",
    "priority": "高",
    "status": "处理中",
    "assignee": "联盟-陈希",
    "createdAt": "2026-07-26",
    "dueAt": "2026-07-26",
    "summary": "第二里程碑交付物与大纲约定不符，申请仲裁：部分退回托管并扣回供给激励",
    "dealId": "DEAL-003"
  },
  "at": "2026-07-26T01:09:07.335Z"
}
```

### 9. 暂停期履约拦截校验

```json
{
  "step": 9,
  "title": "暂停期履约拦截校验",
  "blocked": true,
  "message": "项目争议暂停中，须仲裁结案后才能继续履约",
  "at": "2026-07-26T01:09:07.338Z"
}
```

### 10. 秘书处仲裁裁决并执行 Token 调整

```json
{
  "step": 10,
  "title": "秘书处仲裁裁决并执行 Token 调整",
  "dispute": {
    "id": "DSP-001",
    "dealId": "DEAL-003",
    "raisedBy": "碑林剧本研究院",
    "raisedRole": "buyer",
    "reason": "第二里程碑交付物与大纲约定不符，申请仲裁：部分退回托管并扣回供给激励",
    "claimTokens": 5000,
    "status": "已执行",
    "orderId": "AL-DSP-001",
    "createdAt": "2026-07-26",
    "updatedAt": "2026-07-26",
    "decision": "部分支持买方：退回托管 5000；扣回供给方暂挂激励 1200；恢复履约后可结算闭环",
    "decidedBy": "联盟-陈希",
    "adjustBuyerRefund": 5000,
    "adjustSupplierClawback": 1200
  },
  "deal": {
    "id": "DEAL-003",
    "status": "履约中",
    "phase": "履约中",
    "payMechanism": "验收后支付",
    "payMechanismSource": "negotiated",
    "budget": 30000,
    "escrow": 7000,
    "unfunded": 0,
    "spent": 18000,
    "brokerEarned": 0,
    "supplierEarned": 0,
    "heldBroker": 900,
    "heldSupplier": 240,
    "centerRetained": 15660
  },
  "buyerWallet": {
    "org": "碑林剧本研究院",
    "balance": 17000,
    "role": "buyer",
    "locked": 7000
  },
  "supplierWallet": {
    "org": "曲江短剧工场",
    "balance": 54000,
    "role": "buyer",
    "locked": 0
  },
  "at": "2026-07-26T01:09:07.342Z"
}
```

### 11. 仲裁后恢复履约（再消耗 2k）

```json
{
  "step": 11,
  "title": "仲裁后恢复履约（再消耗 2k）",
  "deal": {
    "id": "DEAL-003",
    "status": "履约中",
    "phase": "履约中",
    "payMechanism": "验收后支付",
    "payMechanismSource": "negotiated",
    "budget": 30000,
    "escrow": 5000,
    "unfunded": 0,
    "spent": 20000,
    "brokerEarned": 0,
    "supplierEarned": 0,
    "heldBroker": 1000,
    "heldSupplier": 400,
    "centerRetained": 17400
  },
  "at": "2026-07-26T01:09:07.347Z"
}
```

### 12. 结算闭环：释放剩余暂挂 + 退回未用托管

```json
{
  "step": 12,
  "title": "结算闭环：释放剩余暂挂 + 退回未用托管",
  "deal": {
    "id": "DEAL-003",
    "status": "已结算",
    "phase": "已闭环",
    "payMechanism": "验收后支付",
    "payMechanismSource": "negotiated",
    "budget": 30000,
    "escrow": 0,
    "unfunded": 0,
    "spent": 20000,
    "brokerEarned": 1000,
    "supplierEarned": 400,
    "heldBroker": 0,
    "heldSupplier": 0,
    "centerRetained": 17400
  },
  "buyerWallet": {
    "org": "碑林剧本研究院",
    "balance": 22000,
    "role": "buyer",
    "locked": 0
  },
  "supplierWallet": {
    "org": "曲江短剧工场",
    "balance": 54400,
    "role": "buyer",
    "locked": 0
  },
  "brokerWallet": {
    "org": "联盟秘书处",
    "balance": 20860,
    "role": "broker",
    "locked": 0
  },
  "ledgerHead": [
    {
      "type": "退款",
      "amount": 5000,
      "note": "结算退回未消耗托管"
    },
    {
      "type": "供给激励",
      "amount": 400,
      "note": "验收结算 · 释放暂挂供给激励"
    },
    {
      "type": "撮合费",
      "amount": 1000,
      "note": "验收结算 · 释放暂挂撮合费"
    },
    {
      "type": "中心保留",
      "amount": 1740,
      "note": "对价切割剩余 → 中心履约成本"
    },
    {
      "type": "供给激励",
      "amount": 160,
      "note": "对价切割 8% → 暂挂，待验收结算释放"
    },
    {
      "type": "撮合费",
      "amount": 100,
      "note": "对价切割 5% → 暂挂，待验收结算释放"
    },
    {
      "type": "消耗",
      "amount": -2000,
      "note": "仲裁后补交付节点 · 自托管池释放 · 机制「验收后支付」"
    },
    {
      "type": "仲裁",
      "amount": 0,
      "note": "争议 DSP-001 裁决：部分支持买方：退回托管 5000；扣回供给方暂挂激励 1200；恢复履约后可结算闭环"
    }
  ],
  "at": "2026-07-26T01:09:07.351Z"
}
```

## 结论

1. 支付机制可由买方设定、供方应征改条款，成交落地为托管规则。
2. 验收后支付下履约激励进入暂挂，仲裁可调整托管退回与激励扣回。
3. 争议期间项目暂停，禁止 consume/settle；裁决执行后恢复并闭环。
