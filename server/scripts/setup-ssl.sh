#!/bin/bash

# SSL 证书生成脚本
# 用于生成自签名证书（测试环境）或 Let's Encrypt 证书（生产环境）

CERT_DIR="/opt/browser-sync/certs"
DOMAIN="${DOMAIN:-localhost}"

echo "========================================="
echo "  SSL 证书配置脚本"
echo "========================================="

# 创建证书目录
mkdir -p $CERT_DIR
cd $CERT_DIR

if [ "$1" == "letsencrypt" ]; then
    # 生产环境：使用 Let's Encrypt
    echo "使用 Let's Encrypt 生成证书..."
    
    # 检查是否安装了 certbot
    if ! command -v certbot &> /dev/null; then
        echo "错误：certbot 未安装，请先安装："
        echo "  Ubuntu/Debian: sudo apt install certbot"
        echo "  CentOS/RHEL: sudo yum install certbot"
        exit 1
    fi
    
    # 停止服务以释放 80 端口
    echo "临时停止服务..."
    systemctl stop browser-sync 2>/dev/null || true
    
    # 生成证书
    certbot certonly --standalone -d $DOMAIN \
        --email ${EMAIL:-admin@localhost} \
        --agree-tos \
        --non-interactive
    
    # 复制证书
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERT_DIR/cert.pem
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERT_DIR/key.pem
    
    echo "Let's Encrypt 证书生成成功！"
    echo "证书位置：$CERT_DIR"
    
else
    # 测试环境：生成自签名证书
    echo "生成自签名证书（仅用于测试）..."
    
    # 检查 openssl
    if ! command -v openssl &> /dev/null; then
        echo "错误：openssl 未安装"
        exit 1
    fi
    
    # 生成私钥
    openssl genrsa -out key.pem 2048
    
    # 生成证书签名请求
    openssl req -new -key key.pem -out csr.pem \
        -subj "/C=CN/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    # 生成自签名证书（有效期 365 天）
    openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
    
    # 清理
    rm csr.pem
    
    echo "自签名证书生成成功！"
    echo "证书位置：$CERT_DIR"
    echo ""
    echo "注意：自签名证书在浏览器中会显示警告，仅用于测试环境"
    echo "生产环境请使用：./setup-ssl.sh letsencrypt"
fi

# 设置权限
chmod 600 key.pem
chmod 644 cert.pem

echo ""
echo "证书文件："
ls -la $CERT_DIR

echo ""
echo "========================================="
echo "  SSL 配置完成！"
echo "========================================="
