# Property SaaS 骨架

一个多租户物业管理 SaaS 的最小可运行骨架，覆盖以下 7 个模块：

1. 房产管理 (Property / Unit)
2. 业主管理 (Owner)
3. 租户管理 (Tenant / Lease)
4. 车位管理 (ParkingSpace / ParkingAssignment)
5. 维修管理 (MaintenanceRequest)
6. 固定资产清单 (FixedAsset)
7. 财务费用明细 (FeeItem / Invoice / Payment)

技术栈：Python 3.10+ / FastAPI / SQLAlchemy 2.x / SQLite（可切换 Postgres）。

## 快速启动

```bash
pip install -r property_saas/requirements.txt
uvicorn property_saas.app.main:app --reload
```

访问 http://127.0.0.1:8000/docs 查看自动生成的接口文档。

## 目录结构

```
property_saas/
├── app/
│   ├── main.py            # FastAPI 入口
│   ├── db.py              # 数据库引擎 / Session
│   ├── deps.py            # 依赖注入
│   ├── models/            # SQLAlchemy 模型（7 个模块）
│   ├── schemas/           # Pydantic schema
│   └── routers/           # 路由层
├── ARCHITECTURE.md        # 架构与模块分析
└── requirements.txt
```

详见 `ARCHITECTURE.md`，里面按 7 个模块逐一分析了字段选择、
实体关系、常见坑位和设计权衡。把你自己那份代码贴过来后，
可以直接对照这份分析来 review。
