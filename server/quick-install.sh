#!/bin/bash

# 浏览器数据同步服务 - 一键安装脚本
# 在服务器上执行此脚本即可自动完成所有安装配置

set -e

# 配置变量（可根据需要修改）
REPO_URL="${REPO_URL:-https://github.com/0925ikura/MySync-Private-docke.git}"
INSTALL_DIR="/opt/browser-sync"
DOMAIN="${DOMAIN:-localhost}"

# 随机生成端口（如果未指定）
generate_random_port() {
    echo $((RANDOM % 10000 + 10000))
}

PORT="${PORT:-$(generate_random_port)}"
WSS_PORT="${WSS_PORT:-$(generate_random_port)}"
EMAIL="${EMAIL:-admin@localhost}"

echo "========================================="
echo "  浏览器数据同步服务 - 一键安装"
echo "========================================="
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 sudo 运行此脚本"
    echo "   示例：sudo bash quick-install.sh"
    exit 1
fi

# 检查并安装 Git
if ! command -v git &> /dev/null; then
    echo "📦 安装 Git..."
    apt update && apt install -y git
fi

# 检查并安装 Node.js
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# 检查并安装 Docker（可选）
INSTALL_DOCKER="${INSTALL_DOCKER:-no}"
if [ "$INSTALL_DOCKER" == "yes" ] && ! command -v docker &> /dev/null; then
    echo "📦 安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 克隆或更新项目
if [ -d "$INSTALL_DIR" ]; then
    echo "📁 更新项目..."
    cd $INSTALL_DIR
    git pull
else
    echo "📁 克隆项目..."
    git clone $REPO_URL $INSTALL_DIR
    cd $INSTALL_DIR
fi

# 进入服务器目录
cd $INSTALL_DIR/server

# 安装依赖
echo "📦 安装依赖..."
npm install --production

# 生成 SSL 证书
echo ""
echo "🔒 生成 SSL 证书..."
mkdir -p ../certs
cd ../certs

if [ "$DOMAIN" != "localhost" ]; then
    # 生产环境：使用 Let's Encrypt
    if command -v certbot &> /dev/null; then
        echo "使用 Let's Encrypt 生成证书..."
        systemctl stop nginx 2>/dev/null || true
        certbot certonly --standalone \
            -d $DOMAIN \
            --email $EMAIL \
            --agree-tos \
            --non-interactive
        cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem cert.pem
        cp /etc/letsencrypt/live/$DOMAIN/privkey.pem key.pem
    else
        echo "⚠️  certbot 未安装，生成自签名证书..."
        openssl genrsa -out key.pem 2048
        openssl req -new -key key.pem -out csr.pem \
            -subj "/C=CN/ST=State/L=City/O=Organization/CN=$DOMAIN"
        openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
        rm csr.pem
    fi
else
    # 测试环境：自签名证书
    echo "生成自签名证书（测试环境）..."
    openssl genrsa -out key.pem 2048
    openssl req -new -key key.pem -out csr.pem \
        -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
    openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
    rm csr.pem
fi

chmod 600 key.pem
chmod 644 cert.pem

echo "✅ SSL 证书生成成功！"

# 创建环境变量文件
echo ""
echo "⚙️  创建配置文件..."
cd $INSTALL_DIR/server
cat > .env << EOF
PORT=$PORT
WSS_PORT=$WSS_PORT
DOMAIN=$DOMAIN
NODE_ENV=production
SSL_ENABLED=true
SSL_CERT_PATH=/app/certs/cert.pem
SSL_KEY_PATH=/app/certs/key.pem
EOF

# 创建 systemd 服务
echo "🔧 创建系统服务..."
cat > /etc/systemd/system/browser-sync.service << EOF
[Unit]
Description=Browser Sync Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/server
EnvironmentFile=$INSTALL_DIR/server/.env
ExecStart=/usr/bin/node $INSTALL_DIR/server/src/index.js
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/logs/stdout.log
StandardError=append:$INSTALL_DIR/logs/stderr.log

[Install]
WantedBy=multi-user.target
EOF

# 创建日志目录
mkdir -p $INSTALL_DIR/logs

# 重载 systemd
systemctl daemon-reload

# 启用服务
echo "🚀 启用服务..."
systemctl enable browser-sync

# 启动服务
echo "🚀 启动服务..."
systemctl start browser-sync

# 等待服务启动
sleep 3

# 检查状态
echo ""
echo "========================================="
echo "  安装完成！"
echo "========================================="
echo ""

if systemctl is-active --quiet browser-sync; then
    echo "✅ 服务运行正常"
else
    echo "❌ 服务启动失败，请检查日志"
    echo ""
    systemctl status browser-sync --no-pager
    exit 1
fi

echo ""
echo "📊 服务信息："
echo "  安装目录：$INSTALL_DIR"
echo "  HTTP 端口：$PORT"
echo "  WSS 端口：$WSS_PORT"
echo "  域名：$DOMAIN"
echo ""
echo "🔧 管理命令："
echo "  启动：sudo systemctl start browser-sync"
echo "  停止：sudo systemctl stop browser-sync"
echo "  重启：sudo systemctl restart browser-sync"
echo "  状态：sudo systemctl status browser-sync"
echo "  日志：sudo journalctl -u browser-sync -f"
echo ""
echo "📁 日志文件："
echo "  标准输出：$INSTALL_DIR/logs/stdout.log"
echo "  错误日志：$INSTALL_DIR/logs/stderr.log"
echo ""
echo "🌐 访问地址："
if [ "$DOMAIN" != "localhost" ]; then
    echo "  Web 面板：https://$DOMAIN:$PORT"
    echo "  WSS 连接：wss://$DOMAIN:$WSS_PORT"
else
    echo "  Web 面板：https://localhost:$PORT"
    echo "  WSS 连接：wss://localhost:$WSS_PORT"
    echo ""
    echo "⚠️  注意：自签名证书会显示安全警告，点击继续即可"
fi

echo ""
echo "========================================="
echo "  🎉 安装完成！"
echo "========================================="
echo ""
