# 服务器一键安装指南

## 🚀 快速开始

### 1. 在 GitHub 上创建仓库

```bash
# 访问 https://github.com/new 创建新仓库
# 或者使用 GitHub CLI
gh repo create browser-sync --public --source=. --remote=origin
```

### 2. 推送到 GitHub

```bash
# 替换为你的 GitHub 用户名
git remote add origin https://github.com/YOUR_USERNAME/browser-sync.git
git branch -M main
git push -u origin main
```

### 3. 在服务器上执行一键安装

```bash
# SSH 登录服务器
ssh user@your-server

# 下载并执行一键安装脚本
wget https://raw.githubusercontent.com/YOUR_USERNAME/browser-sync/main/server/quick-install.sh
chmod +x quick-install.sh
sudo bash quick-install.sh
```

## 📝 配置选项

编辑 `quick-install.sh` 顶部的配置变量：

```bash
# GitHub 仓库地址
REPO_URL="https://github.com/YOUR_USERNAME/browser-sync.git"

# 安装目录
INSTALL_DIR="/opt/browser-sync"

# 域名（生产环境必需）
DOMAIN="your-domain.com"

# 端口
PORT=8080
WSS_PORT=8443

# 邮箱（用于 Let's Encrypt）
EMAIL="your-email@example.com"
```

## 🔍 验证安装

```bash
# 检查服务状态
sudo systemctl status browser-sync

# 查看日志
sudo journalctl -u browser-sync -f

# 测试连接
curl -k https://localhost:8080/api/status
```

## 🛠️ 常见问题

### 1. 脚本下载失败

**解决方案：**
```bash
# 手动克隆项目
git clone https://github.com/YOUR_USERNAME/browser-sync.git
cd browser-sync/server
sudo bash quick-install.sh
```

### 2. 端口被占用

**解决方案：**
```bash
# 查看占用端口的进程
sudo netstat -tlnp | grep 8080

# 停止占用端口的服务
sudo systemctl stop nginx  # 或其他服务

# 或者修改配置使用其他端口
```

### 3. SSL 证书生成失败

**解决方案：**
```bash
# 使用自签名证书（测试环境）
sudo DOMAIN=localhost bash quick-install.sh

# 或手动生成证书
cd /opt/browser-sync/certs
bash ../server/scripts/setup-ssl.sh
```

## 📊 服务管理

```bash
# 启动服务
sudo systemctl start browser-sync

# 停止服务
sudo systemctl stop browser-sync

# 重启服务
sudo systemctl restart browser-sync

# 查看状态
sudo systemctl status browser-sync

# 查看日志
sudo journalctl -u browser-sync -f

# 开机自启
sudo systemctl enable browser-sync
```

## 🔄 更新服务

```bash
# 进入安装目录
cd /opt/browser-sync

# 拉取最新代码
git pull

# 重启服务
sudo systemctl restart browser-sync
```

## 📞 获取帮助

如果遇到问题：
1. 查看日志：`sudo journalctl -u browser-sync -f`
2. 查看文档：[DEPLOYMENT.md](server/DEPLOYMENT.md)
3. 提交 Issue：GitHub Issues

---

**最后更新：** 2026-03-05
