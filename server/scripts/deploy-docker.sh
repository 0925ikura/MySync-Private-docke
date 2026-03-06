#!/bin/bash

# Docker 部署脚本（支持 WSS）
# 端口随机生成，避免冲突

set -e

COMPOSE_FILE="docker-compose.yml"
DOMAIN="${DOMAIN:-localhost}"

# 随机生成端口（10000-20000 范围）
generate_random_port() {
    echo $((RANDOM % 10000 + 10000))
}

# 检测 docker compose 命令
detect_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo ""
    fi
}

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：Docker 未安装"
    echo ""
    echo "请先安装 Docker："
    echo "  curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 检测 docker compose 命令
DOCKER_COMPOSE_CMD=$(detect_docker_compose)
if [ -z "$DOCKER_COMPOSE_CMD" ]; then
    echo "❌ 错误：Docker Compose 未安装"
    echo ""
    echo "请安装 Docker Compose："
    echo "  方式 1：使用 Docker Desktop（推荐）"
    echo "  方式 2：sudo apt install docker-compose"
    echo "  方式 3：curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo "✅ 使用 Docker Compose 命令：$DOCKER_COMPOSE_CMD"
echo ""

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
    echo "========================================="
    echo "  Docker 部署（WSS 支持）"
    echo "========================================="
    echo ""
    
    # 生成随机端口
    PORT=$(generate_random_port)
    WSS_PORT=$(generate_random_port)
    
    echo "📦 生成随机端口..."
    echo "  HTTP 端口：$PORT"
    echo "  WSS 端口：$WSS_PORT"
    echo ""
    
    # 生成 SSL 证书（如果不存在）
    if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
        echo "🔒 生成 SSL 证书..."
        mkdir -p certs
        bash scripts/setup-ssl.sh
    fi
    
    # 创建 .env 文件
    cat > .env << EOF
DOMAIN=$DOMAIN
PORT=$PORT
WSS_PORT=$WSS_PORT
NODE_ENV=production
SSL_ENABLED=true
SSL_CERT_PATH=/app/certs/cert.pem
SSL_KEY_PATH=/app/certs/key.pem
EOF
    
    echo ""
    echo "✅ 配置文件已生成：.env"
    echo ""
else
    echo "使用现有配置..."
    source .env
fi

# 启动 Docker Compose
echo "🚀 启动服务..."
$DOCKER_COMPOSE_CMD up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 获取服务信息
for i in {1..30}; do
    if curl -k -s "https://localhost:$PORT/api/auth/initial" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# 获取初始账号信息
echo ""
echo "🔐 获取登录账号信息..."
INITIAL_AUTH=$(curl -k -s "https://localhost:$PORT/api/auth/initial" 2>/dev/null || echo '{"hasInitial":false}')

# 解析 JSON 获取账号和密码
USERNAME=$(echo "$INITIAL_AUTH" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
PASSWORD=$(echo "$INITIAL_AUTH" | grep -o '"password":"[^"]*"' | cut -d'"' -f4)

# 检查状态
echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "📊 服务信息："
echo "  域名：$DOMAIN"
echo "  HTTP 端口：$PORT"
echo "  WSS 端口：$WSS_PORT"
echo ""
echo "🌐 访问地址："
if [ "$DOMAIN" != "localhost" ]; then
    echo "  Web 面板：https://$DOMAIN:$PORT"
    echo "  WSS 连接：wss://$DOMAIN:$WSS_PORT"
else
    echo "  Web 面板：https://localhost:$PORT"
    echo "  WSS 连接：wss://localhost:$WSS_PORT"
    echo ""
    echo "⚠️  注意：自签名证书会显示安全警告"
fi

# 显示账号信息
if [ -n "$USERNAME" ] && [ -n "$PASSWORD" ]; then
    echo ""
    echo "🔑 登录账号："
    echo "  用户名：$USERNAME"
    echo "  密码：$PASSWORD"
    echo ""
    echo "⚠️  请妥善保存账号和密码！"
fi

echo ""
echo "🔧 管理命令："
echo "  查看状态：$DOCKER_COMPOSE_CMD ps"
echo "  查看日志：$DOCKER_COMPOSE_CMD logs -f"
echo "  停止服务：$DOCKER_COMPOSE_CMD down"
echo "  重启服务：$DOCKER_COMPOSE_CMD restart"
echo ""
