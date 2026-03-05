# 浏览器数据同步服务

实时同步浏览器书签、历史记录和 Cookie 到服务器，支持 Web 管理面板和 WSS 加密传输。

## 🚀 功能特性

- ✅ **书签同步** - 实时同步书签（增删改），保留文件夹结构
- ✅ **历史记录** - 实时同步浏览历史
- ✅ **Cookie 同步** - 实时同步 Cookie 登录状态
- ✅ **Web 管理面板** - 通过网页查看和管理同步数据
- ✅ **数据去重** - 自动去除重复数据
- ✅ **用户认证** - JWT Token 认证，支持修改用户名和密码
- ✅ **WSS 加密** - WebSocket Secure 加密传输
- ✅ **Docker 支持** - 一键容器化部署
- ✅ **审计日志** - 完整的操作日志记录

## 📁 项目结构

```
.
├── extension/          # 浏览器扩展
│   ├── background/     # 后台脚本
│   ├── popup/          # 弹出页面
│   ├── options/        # 选项页面
│   ├── icons/          # 图标
│   └── manifest.json   # 扩展配置
├── server/             # 服务器端
│   ├── src/            # 源代码
│   ├── scripts/        # 部署脚本
│   ├── nginx/          # Nginx 配置
│   ├── Dockerfile      # Docker 镜像
│   └── docker-compose.yml
└── docs/               # 文档
```

## 🔧 快速开始

### 服务器端（一键安装）

```bash
# 方式一：一键安装脚本（推荐）
wget https://raw.githubusercontent.com/0925ikura/MySync-Private-docke/main/server/quick-install.sh
chmod +x quick-install.sh
sudo bash quick-install.sh

# 方式二：手动安装
# 1. 克隆项目
git clone https://github.com/0925ikura/MySync-Private-docke.git
cd browser-sync/server

# 2. 运行安装脚本
chmod +x scripts/install.sh
sudo bash scripts/install.sh

# 3. 生成 SSL 证书
bash scripts/setup-ssl.sh letsencrypt
```

### Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/0925ikura/MySync-Private-docke.git
cd browser-sync/server

# 2. 配置环境变量（可选）
# 端口会自动随机生成，也可以手动指定
# export PORT=8080 WSS_PORT=8443

# 3. 生成 SSL 证书
bash scripts/deploy-docker.sh

# 4. 启动服务
docker-compose up -d
```

**端口说明：** HTTP 和 WSS 端口会自动随机生成（10000-20000 范围），避免端口冲突。

### 浏览器扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `extension` 文件夹

## 📖 文档

- [部署指南](server/DEPLOYMENT.md)
- [使用指南](docs/USAGE.md)
- [API 文档](docs/API.md)

## 🔒 安全特性

- ✅ SHA-256 密码哈希
- ✅ JWT Token 认证
- ✅ WSS 加密传输
- ✅ HTTPS 支持
- ✅ 审计日志
- ✅ CORS 配置

## 🛠️ 技术栈

**服务器端：**
- Node.js + Express
- WebSocket (ws)
- SQLite (可选)
- Docker + Docker Compose
- Nginx（反向代理）

**浏览器扩展：**
- Chrome Extension Manifest V3
- Service Worker
- WebSocket

**前端：**
- 原生 HTML/CSS/JavaScript
- 响应式设计

## 📝 配置说明

### 环境变量

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

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题，请通过以下方式联系：

- GitHub Issues
- Email: your-email@example.com

---

**最后更新：** 2026-03-05
