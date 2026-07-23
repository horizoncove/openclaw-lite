# 西安微短剧产业服务中心 · SaaS 云服务器部署指南

本文档说明如何在云服务器（阿里云 / 腾讯云 / 华为云等）上使用 **Docker Compose** 一键部署运营 SaaS 平台，含 **PostgreSQL 16** 数据库。

## 一、服务器要求

| 项目 | 建议 |
|------|------|
| 系统 | Ubuntu 22.04 / Debian 12 / CentOS Stream 9 |
| CPU | 2 核+ |
| 内存 | 4 GB+ |
| 磁盘 | 40 GB+ SSD |
| 端口 | 开放 `80`/`443`（Web）、`3001`（直连调试，可选） |

## 二、安装 Docker

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version
docker compose version
```

## 三、拉取代码

```bash
git clone https://github.com/horizoncove/openclaw-lite.git
cd openclaw-lite/xian-drama-saas
```

## 四、配置环境变量

```bash
cp .env.example .env
# 编辑 .env，至少修改数据库密码：
# POSTGRES_PASSWORD=你的强密码
nano .env
```

## 五、一键启动

```bash
docker compose up -d --build
```

启动后访问：

- **平台首页**：`http://<服务器IP>:3001`
- **健康检查**：`http://<服务器IP>:3001/api/health`
- **运营控制台**：`http://<服务器IP>:3001/login`

首次启动会自动执行数据库迁移并导入演示种子数据。

## 六、常用运维命令

```bash
# 查看日志
docker compose logs -f app
docker compose logs -f db

# 重启
docker compose restart app

# 停止
docker compose down

# 停止并清除数据卷（慎用，会删除数据库）
docker compose down -v

# 重置演示数据（调用 API）
curl -X POST http://localhost:3001/api/reset
```

## 七、绑定域名 + HTTPS（推荐）

使用 Nginx 反向代理到 `127.0.0.1:3001`，并用 Certbot 申请免费 SSL 证书：

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/xian-drama <<'EOF'
server {
    listen 80;
    server_name saas.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/xian-drama /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d saas.example.com
```

将 `saas.example.com` 替换为你的实际域名，并在域名 DNS 中添加 A 记录指向服务器 IP。

## 八、仅安装 PostgreSQL（不用 Docker 跑应用）

若希望应用直接跑在宿主机 Node.js 上：

```bash
# 安装 PostgreSQL 16
sudo apt install -y postgresql-16

sudo -u postgres psql -c "CREATE USER xian_drama WITH PASSWORD '你的密码';"
sudo -u postgres psql -c "CREATE DATABASE xian_drama OWNER xian_drama;"

cd xian-drama-saas
cp .env.example .env
# 设置 DATABASE_URL

npm ci
npm run build
npm run db:migrate
PORT=3001 npm start
```

可用 `pm2` 守护进程：

```bash
npm install -g pm2
pm2 start "npm start" --name xian-drama-saas
pm2 save && pm2 startup
```

## 九、数据库备份与恢复

```bash
# 备份
docker compose exec db pg_dump -U xian_drama xian_drama > backup_$(date +%F).sql

# 恢复
cat backup_2026-07-23.sql | docker compose exec -T db psql -U xian_drama xian_drama
```

## 十、安全建议

1. 修改 `.env` 中默认数据库密码
2. 生产环境关闭公网 5432 端口，仅容器内网访问
3. 配置防火墙（`ufw allow 80,443/tcp`）
4. 定期备份 `pgdata` 卷或 SQL 导出
5. 后续可接入真实用户认证（当前为演示角色登录）

## 十一、故障排查

| 现象 | 处理 |
|------|------|
| `app` 启动失败 | `docker compose logs app`，检查 DATABASE_URL |
| 数据库连接超时 | 确认 `db` 健康：`docker compose ps` |
| 页面空白 | 确认已 `npm run build` 或 Docker 构建成功 |
| 想切回 JSON 模式 | 设置 `STORAGE=json` 并去掉 `DATABASE_URL` |
