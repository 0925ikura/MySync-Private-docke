# 🔧 快速修复指南

## 问题：docker-compose 命令不存在

### 原因
新版本的 Docker 使用 `docker compose`（空格）而不是 `docker-compose`（连字符）。

### 解决方案

#### 方案 1：使用最新脚本（推荐）

```bash
# 1. 更新项目代码
cd ~/MySync-Private-docke
git pull

# 2. 重新运行部署脚本
cd server
bash scripts/deploy-docker.sh
```

#### 方案 2：安装 docker-compose

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker-compose -y

# 或者使用最新版本的独立二进制文件
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

#### 方案 3：使用 Docker Compose 插件（新版）

```bash
# Docker Desktop 已内置
# 或者安装插件
sudo apt install docker-compose-plugin -y

# 使用新命令
docker compose up -d
```

---

## 🚀 完整部署流程

### 1. 安装 Docker

```bash
# 使用官方安装脚本
curl -fsSL https://get.docker.com | sh

# 验证安装
docker --version
```

### 2. 安装 Docker Compose

```bash
# 方式 A：使用包管理器（版本可能较旧）
sudo apt install docker-compose -y

# 方式 B：使用最新二进制文件（推荐）
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证
docker-compose --version
# 或
docker compose version
```

### 3. 部署项目

```bash
# 进入项目目录
cd ~/MySync-Private-docke/server

# 运行部署脚本
bash scripts/deploy-docker.sh
```

---

## ✅ 验证部署

```bash
# 查看容器状态
docker ps

# 或
docker-compose ps
# 或
docker compose ps

# 查看日志
docker-compose logs -f
# 或
docker compose logs -f
```

---

## 📝 常见问题

### Q1: 权限错误

**错误：** `Got permission denied while trying to connect to the Docker daemon socket`

**解决：**
```bash
# 将用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker

# 验证
docker ps
```

### Q2: 端口被占用

**错误：** `Bind for 0.0.0.0:8080 failed: port is already allocated`

**解决：**
```bash
# 查看占用端口的进程
sudo netstat -tlnp | grep 8080

# 停止占用端口的服务
sudo systemctl stop nginx
# 或
sudo systemctl stop apache2

# 或者删除旧的容器
docker-compose down
```

### Q3: SSL 证书生成失败

**错误：** 证书生成失败

**解决：**
```bash
# 手动生成自签名证书
cd ~/MySync-Private-docke/server/certs

openssl genrsa -out key.pem 2048
openssl req -new -key key.pem -out csr.pem -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem

# 重新启动服务
cd ..
bash scripts/deploy-docker.sh
```

---

## 📞 获取帮助

如果仍有问题：

1. 查看详细日志：
   ```bash
   docker-compose logs
   # 或
   docker compose logs
   ```

2. 检查 Docker 状态：
   ```bash
   sudo systemctl status docker
   ```

3. 查看系统资源：
   ```bash
   docker system df
   docker stats
   ```

---

**最后更新：** 2026-03-05
