# P1 工作日志

## 2026-08-08 — P1 开工（人类签字后）

### 已完成
- 确认上游 `p0-v1.0` 人类签字
- 创建 `P1启动指南.md` 与 `p1/` 工作区
- 发布《数据合规规范 v1》《pipeline》《Data Card》
- 落地合成/划分/校验工具
- 生成首批 `datasets/v0.1` 与拒绝话术库
- 跑通 `validate_p1.py`

### 状态
- **p1-v0.3**：目标规模 3 万已达成（train 30000），validator PASS
- 未宣称 P1 完成（仍差抽检 ≥95% 冻结）

## 2026-08-08 — 扩量样本 v0.2 / v0.3

### 已完成
- v0.2：train 8000
- v0.3：按人类目标 **3 万** 生成 train 30000 / eval 28169 / refusal 500
- `validate_p1.py --version v0.3` PASS

### 下一步
1. 按 spot_check_plan（v0.3）完成抽检
2. 抽检通过后冻结 p1-v1.0
3. 开 P2
