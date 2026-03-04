# 浏览器数据同步服务 - 服务器部署指南

## 📋 目录

- [快速开始](#快速开始)
- [Docker 部署（推荐）](#docker-部署推荐)
- [直接部署](#直接部署)
- [WSS 配置](#wss-配置)
- [常见问题](#常见问题)

---

## 🚀 快速开始

### 系统要求

- **操作系统**: Linux (Ubuntu 18.04+, CentOS 7+)
- **Node.js**: 18.x 或更高版本
- **Docker**: 20.x 或更高版本（Docker 部署方式）
- **域名**: 用于 SSL 证书（生产环境必需）

### 部署方式选择

| 部署方式 | 适用场景 | 难度 |
|---------|---------|------|
| Docker Compose | 生产环境、容器化部署 | ⭐⭐ |
| 直接部署 | 开发环境、快速测试 | ⭐ |
| Nginx 反向代理 | 高并发、多服务 | ⭐⭐⭐ |

---

## 🐳 Docker 部署（推荐）

### 1. 准备环境

```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker

# 验证安装
docker --version
docker-compose --version
```

### 2. 配置环境变量

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑配置
vim .env
```

**.env 文件内容：**

```bash
# 服务器配置
PORT=8080
WSS_PORT=8443
DOMAIN=your-domain.com

# SSL 配置
SSL_ENABLED=true
SSL_CERT_PATH=/app/certs/cert.pem
SSL_KEY_PATH=/app/certs/key.pem

# 应用配置
NODE_ENV=production
```

### 3. 生成 SSL 证书

#### 方式一：Let's Encrypt（生产环境）

```bash
# 使用 Certbot 生成证书
sudo apt install certbot -y

# 停止占用 80 端口的服务
sudo systemctl stop nginx  # 或 apache2

# 生成证书
sudo certbot certonly --standalone \
  -d your-domain.com \
  --email your-email@example.com \
  --agree-tos

# 复制证书到项目目录
sudo mkdir -p certs
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/key.pem
sudo chmod 600 certs/key.pem
sudo chmod 644 certs/cert.pem
```

#### 方式二：自签名证书（测试环境）

```bash
# 使用提供的脚本生成
bash scripts/setup-ssl.sh

# 或手动生成
mkdir -p certs
cd certs

# 生成私钥
openssl genrsa -out key.pem 2048

# 生成证书
openssl req -new -x509 -key key.pem -out cert.pem -days 365 \
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"

cd ..
```

### 4. 启动服务

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 检查状态
docker-compose ps
```

### 5. 验证部署

```bash
# 检查 HTTP 服务
curl -k https://localhost:8080/api/status

# 检查 WSS 服务
# 使用浏览器或 wscat 工具测试
```

---

## 💻 直接部署

### 1. 安装依赖

```bash
# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node --version
npm --version
```

### 2. 安装服务

```bash
# 进入项目目录
cd /path/to/server

# 安装依赖
npm install --production
```

### 3. 配置 SSL 证书

参考 Docker 部署中的 SSL 证书生成步骤。

### 4. 配置环境变量

```bash
cp .env.example .env
vim .env
```

### 5. 创建 systemd 服务

```bash
sudo vim /etc/systemd/system/browser-sync.service
```

**服务文件内容：**

```ini
[Unit]
Description=Browser Sync Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/browser-sync
EnvironmentFile=/opt/browser-sync/.env
ExecStart=/usr/bin/node /opt/browser-sync/src/index.js
Restart=always
RestartSec=10
StandardOutput=append:/opt/browser-sync/logs/stdout.log
StandardError=append:/opt/browser-sync/logs/stderr.log

[Install]
WantedBy=multi-user.target
```

### 6. 启动服务

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启用服务
sudo systemctl enable browser-sync

# 启动服务
sudo systemctl start browser-sync

# 查看状态
sudo systemctl status browser-sync

# 查看日志
sudo journalctl -u browser-sync -f
```

---

## 🔒 WSS 配置

### 客户端连接配置

#### 浏览器扩展配置

更新 `extension/background/background.js`：

```javascript
// 开发环境（本地）
const WS_URL = 'ws://localhost:8080';

// 生产环境（服务器）
// const WS_URL = 'wss://your-domain.com:8443';

// 自动检测
const WS_URL = window.location.protocol === 'https:' 
  ? 'wss://your-domain.com:8443'
  : 'ws://localhost:8080';
```

#### Web 管理面板配置

更新 `server/src/public/app.js`：

```javascript
// 自动检测协议
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = window.location.host || 'localhost:8080';
const wsUrl = `${WS_PROTOCOL}//${WS_HOST}`;

const ws = new WebSocket(wsUrl);
```

### Nginx 反向代理（可选）

如果需要使用标准端口（80/443），可以使用 Nginx 反向代理：

```bash
# 使用 Docker Compose 启动 Nginx
docker-compose --profile with-nginx up -d
```

**访问地址：**
- HTTP: `http://your-domain.com`
- HTTPS: `https://your-domain.com`
- WSS: `wss://your-domain.com`

---

## 🔧 常见问题

### 1. SSL 证书问题

**问题：** 浏览器显示"不安全"警告

**解决方案：**
- 生产环境使用 Let's Encrypt 证书
- 测试环境接受自签名证书警告
- 确保域名正确配置

### 2. WSS 连接失败

**问题：** WebSocket 连接失败

**排查步骤：**

```bash
# 检查端口是否开放
sudo netstat -tlnp | grep 8443

# 检查防火墙
sudo ufw allow 8443/tcp

# 查看服务日志
docker-compose logs -f
# 或
sudo journalctl -u browser-sync -f
```

### 3. 证书续期

**Let's Encrypt 证书续期：**

```bash
# 手动续期
sudo certbot renew

# 自动续期（已配置 cron 任务）
sudo certbot renew --dry-run
```

### 4. Docker 网络问题

**问题：** 容器无法访问

**解决方案：**

```bash
# 重启网络
docker-compose down
docker network prune
docker-compose up -d

# 检查网络
docker network ls
docker network inspect browser-sync_sync-network
```

---

## 📊 监控和维护

### 查看日志

```bash
# Docker 方式
docker-compose logs -f

# systemd 方式
sudo journalctl -u browser-sync -f

# 日志文件
tail -f /opt/browser-sync/logs/stdout.log
tail -f /opt/browser-sync/logs/stderr.log
```

### 备份数据

```bash
# 备份数据目录
tar -czf browser-sync-backup-$(date +%Y%m%d).tar.gz /opt/browser-sync/data

# 备份证书
tar -czf browser-sync-certs-$(date +%Y%m%d).tar.gz /opt/browser-sync/certs
```

### 更新服务

```bash
# Docker 方式
docker-compose pull
docker-compose up -d --force-recreate

# systemd 方式
cd /opt/browser-sync
git pull
npm install --production
sudo systemctl restart browser-sync
```

---

## 📞 技术支持

如有问题，请查看：
- 项目文档
- 日志文件
- GitHub Issues

---

**最后更新：** 2026-03-05
