#!/bin/bash

# Docker 部署脚本（支持 WSS）
# 端口随机生成，避免冲突

set -e

COMPOSE_FILE="docker-compose.yml"
DOMAIN="${DOMAIN:-localhost}"

# 获取服务器公网 IP 地址
get_server_ip() {
    local ip=""
    # 优先使用外部 API 获取公网 IP
    ip=$(curl -s https://api.ipify.org 2>/dev/null || echo "")
    if [ -z "$ip" ]; then
        ip=$(curl -s https://ifconfig.me 2>/dev/null || echo "")
    fi
    if [ -z "$ip" ]; then
        ip=$(curl -s https://icanhazip.com 2>/dev/null || echo "")
    fi
    # 如果都没有，获取内部 IP 作为备选
    if [ -z "$ip" ] && command -v ip &> /dev/null; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[^ ]+' | head -1)
    fi
    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    echo "$ip"
}

SERVER_IP=$(get_server_ip)

# 随机生成端口（10000-20000 范围，避开常用端口）
generate_random_port() {
    # 常用端口列表
    local common_ports="22 80 443 3306 5432 27017 6379 8080 8443 3000 4000 5000 6000 7000 8000 9000"
    
    while true; do
        local port=$((RANDOM % 10000 + 10000))
        
        # 检查端口是否在常用端口列表中
        local is_common=false
        for common_port in $common_ports; do
            if [ "$port" -eq "$common_port" ]; then
                is_common=true
                break
            fi
        done
        
        # 如果不是常用端口，返回它
        if [ "$is_common" = false ]; then
            echo "$port"
            return
        fi
    done
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

# 获取初始账号信息（从容器内部获取）
echo ""
echo "🔐 获取登录账号信息..."
sleep 2

# 从容器日志中提取账号信息
CONTAINER_LOG=$($DOCKER_COMPOSE_CMD logs 2>/dev/null | grep -A3 "ADMIN USER CREATED" || echo "")
if [ -n "$CONTAINER_LOG" ]; then
    USERNAME=$(echo "$CONTAINER_LOG" | grep -oP 'Username: \K[^ ]+' || echo "")
    PASSWORD=$(echo "$CONTAINER_LOG" | grep -oP 'Password: \K[^ ]+' || echo "")
else
    # 尝试从日志中获取
    USERNAME=""
    PASSWORD=""
fi

# 检查状态
echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "📊 服务信息："
echo "  服务器 IP：$SERVER_IP"
echo "  域名：$DOMAIN"
echo "  HTTP 端口：$PORT"
echo "  WSS 端口：$WSS_PORT"
echo ""
echo "🌐 访问地址："
if [ -n "$SERVER_IP" ]; then
    echo "  Web 面板：https://$SERVER_IP:$PORT"
    echo "  WSS 连接：wss://$SERVER_IP:$WSS_PORT"
elif [ "$DOMAIN" != "localhost" ]; then
    echo "  Web 面板：https://$DOMAIN:$PORT"
    echo "  WSS 连接：wss://$DOMAIN:$WSS_PORT"
else
    echo "  Web 面板：https://localhost:$PORT"
    echo "  WSS 连接：wss://localhost:$PORT"
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
