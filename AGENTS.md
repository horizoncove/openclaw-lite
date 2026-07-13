# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **monorepo of three independent Python products** with no top-level
orchestration (no Makefile / docker-compose). All persistence is embedded SQLite
created at runtime — there are no external databases/queues to start.

### Python environment
Dependencies are installed into a virtualenv at the repo root: `.venv`. Run tools via
`.venv/bin/python` / `.venv/bin/pip` / `.venv/bin/uvicorn` (or `source .venv/bin/activate`).
The update script (re)creates `.venv` and installs all three requirement sets. System
libs for PyQt6 (`libegl1`, `libgl1`) and `python3.12-venv` are already baked into the image.

There is **no linter** configured (no ruff/flake8/black/mypy configs).

### Product B — Property SaaS (`property_saas/`) — FastAPI REST API
Run the dev server from the repo root:
```bash
.venv/bin/uvicorn property_saas.app.main:app --reload
```
- Serves on http://127.0.0.1:8000 ; Swagger UI at `/docs`, health at `/healthz`.
- SQLite file `property_saas.db` is auto-created in the **current working directory**
  (it is NOT gitignored, so run from a scratch dir if you don't want it in the repo).
- Multi-tenant: most endpoints require an `X-Tenant-ID` header. Create a tenant first via
  `POST /tenants`, then pass its `id` as `X-Tenant-ID` on other calls.

### Product C — Sharon Trading (`sharon_trading_system_v1_0/` + root `account_engine.py`) — PyQt6 desktop
- Test suite lives in `/workspace/tests` and **must be run from the repo root**
  (`tests/test_account_engine.py` imports the top-level `account_engine` module).
- GUI smoke tests only run under Qt offscreen mode; otherwise they are skipped:
  ```bash
  QT_QPA_PLATFORM=offscreen .venv/bin/python -m unittest discover -s tests -v
  ```
- The GUI app entrypoint is `python -m sharon_trading_system_v1_0.main` (needs a display,
  or `QT_QPA_PLATFORM=offscreen` on headless VMs).

### Product A — OpenClaw Lite (`src/`) — CLI (currently NOT runnable end-to-end)
`src/main.py` imports `core.notifier` and `tools.rss_monitor`, which **do not exist** in the
repo, and the agents use hardcoded `/root/.openclaw/...` paths — so `python src/main.py`
fails without code changes. Its dependencies are still installed for development. Note the
root `requirements.txt` lists `sqlite3` (a stdlib module, not a PyPI package); the update
script filters that line out so the install succeeds.
