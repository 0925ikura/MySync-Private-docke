FROM node:18-alpine

WORKDIR /app

# 安装 OpenSSL（用于生成证书）
RUN apk add --no-cache openssl

COPY package.json ./

RUN npm install --registry=https://registry.npmmirror.com

COPY src/ ./src/
COPY scripts/ ./scripts/

# 创建证书目录
RUN mkdir -p /app/certs

EXPOSE 8080 8443

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:8080/api/status || exit 1

CMD ["node", "src/index.js"]
