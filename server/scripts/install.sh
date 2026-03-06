#!/bin/bash

# 服务器安装脚本
# 在 Linux 服务器上执行此脚本安装浏览器同步服务

set -e

SERVICE_NAME="browser-sync"
PORT="${PORT:-8080}"
WSS_PORT="${WSS_PORT:-8443}"
DOMAIN="${DOMAIN:-localhost}"

if [ "$EUID" -eq 0 ]; then
    INSTALL_DIR="/opt/browser-sync"
else
    INSTALL_DIR="$HOME/browser-sync"
fi

echo "========================================="
echo "  浏览器数据同步服务 - 安装脚本"
echo "========================================="
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo "注意：不使用 sudo，将在用户主目录下安装"
    echo "安装目录：$INSTALL_DIR"
    echo ""
fi

# 创建安装目录
echo "创建安装目录..."
mkdir -p $INSTALL_DIR
mkdir -p $INSTALL_DIR/logs

# 复制文件
echo "复制文件..."
cp -r ../src/* $INSTALL_DIR/
cp ../package.json $INSTALL_DIR/

# 安装 Node.js（如果未安装）
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# 安装依赖
echo "安装依赖..."
cd $INSTALL_DIR
npm install --production

# 生成 SSL 证书
echo ""
echo "生成 SSL 证书..."
cd $INSTALL_DIR
bash scripts/setup-ssl.sh letsencrypt

# 创建环境变量文件
cat > $INSTALL_DIR/.env << EOF
PORT=$PORT
WSS_PORT=$WSS_PORT
DOMAIN=$DOMAIN
NODE_ENV=production
EOF

# 创建 systemd 服务文件
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Browser Sync Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/index.js
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/logs/stdout.log
StandardError=append:$INSTALL_DIR/logs/stderr.log

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
systemctl daemon-reload

# 启用服务
echo "启用服务..."
systemctl enable $SERVICE_NAME

# 启动服务
echo "启动服务..."
systemctl start $SERVICE_NAME

# 检查状态
echo ""
echo "服务状态："
systemctl status $SERVICE_NAME --no-pager

echo ""
echo "========================================="
echo "  安装完成！"
echo "========================================="
echo ""
echo "服务信息："
echo "  HTTP 端口：$PORT"
echo "  WSS 端口：$WSS_PORT"
echo "  域名：$DOMAIN"
echo ""
echo "管理命令："
echo "  启动：sudo systemctl start $SERVICE_NAME"
echo "  停止：sudo systemctl stop $SERVICE_NAME"
echo "  重启：sudo systemctl restart $SERVICE_NAME"
echo "  状态：sudo systemctl status $SERVICE_NAME"
echo ""
echo "日志文件："
echo "  标准输出：$INSTALL_DIR/logs/stdout.log"
echo "  错误日志：$INSTALL_DIR/logs/stderr.log"
echo ""
echo "访问地址："
echo "  https://$DOMAIN:$PORT"
echo "  wss://$DOMAIN:$WSS_PORT"
echo ""
