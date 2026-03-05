# 🚀 服务器一键安装

## ✅ 项目已上传到 GitHub

仓库地址：https://github.com/0925ikura/MySync-Private-docke.git

---

## 📋 在服务器上执行以下步骤

### 1️⃣ SSH 登录服务器

```bash
ssh user@your-server-ip
```

### 2️⃣ 下载一键安装脚本

```bash
# 下载脚本
wget https://raw.githubusercontent.com/0925ikura/MySync-Private-docke/main/server/quick-install.sh

# 或者使用 curl
curl -O https://raw.githubusercontent.com/0925ikura/MySync-Private-docke/main/server/quick-install.sh
```

### 3️⃣ 执行安装脚本

```bash
# 添加执行权限
chmod +x quick-install.sh

# 执行安装（需要 sudo 权限）
sudo bash quick-install.sh
```

**说明：** 端口会自动随机生成（10000-20000 范围），避免端口冲突。

---

## ⚙️ 可选配置

编辑 `quick-install.sh` 文件顶部的配置：

```bash
# 域名（生产环境必需）
DOMAIN="your-domain.com"

# 端口
PORT=8080
WSS_PORT=8443

# 邮箱（用于 Let's Encrypt 证书）
EMAIL="your-email@example.com"
```

修改配置后重新执行：

```bash
sudo DOMAIN=your-domain.com EMAIL=your-email@example.com bash quick-install.sh
```

---

## ✅ 验证安装

```bash
# 检查服务状态
sudo systemctl status browser-sync

# 查看日志
sudo journalctl -u browser-sync -f

# 测试 API
curl -k https://localhost:8080/api/status
```

---

## 🌐 访问服务

### 本地访问（测试）

- Web 面板：`https://localhost:8080`
- WSS 连接：`wss://localhost:8443`

**注意：** 自签名证书会显示安全警告，点击"继续"或"接受风险"即可。

### 远程访问（生产环境）

如果您配置了域名：

- Web 面板：`https://your-domain.com:8080`
- WSS 连接：`wss://your-domain.com:8443`

---

## 🔧 常用命令

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

---

## 📊 安装位置

- **安装目录**: `/opt/browser-sync`
- **日志目录**: `/opt/browser-sync/logs`
- **证书目录**: `/opt/browser-sync/certs`
- **数据目录**: `/opt/browser-sync/data`

---

## 🔄 更新服务

```bash
# 进入安装目录
cd /opt/browser-sync

# 拉取最新代码
git pull

# 重启服务
sudo systemctl restart browser-sync
```

---

## ❓ 故障排查

### 1. 脚本下载失败

```bash
# 手动克隆项目
git clone https://github.com/0925ikura/MySync-Private-docke.git
cd MySync-Private-docke/server
sudo bash quick-install.sh
```

### 2. 端口被占用

```bash
# 查看占用端口的进程
sudo netstat -tlnp | grep 8080

# 停止占用端口的服务
sudo systemctl stop nginx
# 或
sudo systemctl stop apache2
```

### 3. SSL 证书生成失败

```bash
# 使用自签名证书
sudo DOMAIN=localhost bash quick-install.sh

# 或手动生成
cd /opt/browser-sync/certs
bash ../server/scripts/setup-ssl.sh
```

### 4. 服务启动失败

```bash
# 查看详细错误
sudo journalctl -u browser-sync -n 100

# 检查配置文件
cat /opt/browser-sync/server/.env

# 检查日志
tail -f /opt/browser-sync/logs/stderr.log
```

---

## 📞 获取帮助

- 查看完整文档：[DEPLOYMENT.md](https://github.com/0925ikura/MySync-Private-docke/blob/main/server/DEPLOYMENT.md)
- 查看快速指南：[QUICK_START.md](https://github.com/0925ikura/MySync-Private-docke/blob/main/server/QUICK_START.md)
- 提交 Issue：GitHub Issues

---

**最后更新：** 2026-03-05
