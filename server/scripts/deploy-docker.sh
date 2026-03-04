#!/bin/bash

# Docker 部署脚本（支持 WSS）

set -e

COMPOSE_FILE="docker-compose.yml"
DOMAIN="${DOMAIN:-localhost}"
PORT="${PORT:-8080}"
WSS_PORT="${WSS_PORT:-8443}"

echo "========================================="
echo "  Docker 部署（WSS 支持）"
echo "========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误：Docker 未安装"
    exit 1
fi

# 生成 SSL 证书（如果不存在）
if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
    echo "生成 SSL 证书..."
    mkdir -p certs
    bash scripts/setup-ssl.sh letsencrypt
fi

# 创建 .env 文件
cat > .env << EOF
DOMAIN=$DOMAIN
PORT=$PORT
WSS_PORT=$WSS_PORT
NODE_ENV=production
EOF

# 启动 Docker Compose
echo "启动服务..."
docker-compose up -d

# 检查状态
echo ""
echo "容器状态："
docker-compose ps

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "访问地址："
echo "  https://$DOMAIN:$PORT"
echo "  wss://$DOMAIN:$WSS_PORT"
echo ""
echo "查看日志：docker-compose logs -f"
echo "停止服务：docker-compose down"
echo ""
