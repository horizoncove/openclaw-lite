# Sharon Knowledge Base

该目录保存用户确认的方法论，并编译为机器可读索引。

## 当前知识

| 文件 | 用途 | 状态 |
|---|---|---|
| `skills/sharon-trading-sop-v31.md` | 中小市值、2–4 连板选股 SOP | active |
| `skills/sharon-task-decomposer-v20.md` | 模糊和复杂任务分解 | active |
| `skills/sharon-deep-researcher-v20.md` | 多来源深度研究与验证 | active |

## 优先级

知识库是领域方法和用户偏好，不覆盖系统安全、事实核验、权限边界及当前用户的
最新明确指令。发生冲突时使用更高优先级和更新的指令，并记录差异。

## 编译

```bash
python3 tools/compile_knowledge.py
```

输出文件为 `knowledge/compiled/knowledge_base.json`。编译器会校验每个技能的
元数据、生成内容摘要，并以确定性顺序写入索引。
