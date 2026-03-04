# 浏览器插件 + 服务器 同步方案

## 项目概述
开发一个 Chrome 浏览器插件 + 后端服务器，实现以下核心功能的实时同步：
1. **书签同步** - 增删改实时同步到服务器
2. **历史记录同步** - 实时同步到服务器
3. **Cookie 登录状态同步** - 实时同步到服务器

---

## 目录结构
```
liulanqi-sync/
├── extension/               # 浏览器插件
│   ├── manifest.json
│   ├── popup/
│   ├── background/
│   ├── content/
│   ├── options/
│   └── icons/
└── server/                  # 后端服务器 (Docker容器)
    ├── src/
    ├── Dockerfile
    ├── docker-compose.yml
    └── package.json
```

---

## 技术架构

### 1. 浏览器插件 (extension/)
```
extension/
├── manifest.json          # 插件配置
├── popup/                 # 弹窗界面 (原生HTML/CSS/JS)
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── background/            # 后台脚本 (Service Worker)
│   └── background.js
├── content/               # 内容脚本
│   └── content.js
├── options/                # 设置页面
│   ├── options.html
│   ├── options.js
│   └── options.css
└── icons/                 # 插件图标
```

**核心 API:**
- `chrome.bookmarks` - 书签管理
- `chrome.history` - 历史记录管理
- `chrome.cookies` - Cookie 管理
- `chrome.storage` - 本地存储
- `chrome.runtime` - 运行时通信
- `WebSocket` - 与服务器实时通信

### 2. 后端服务器 (server/)
```
server/
├── src/
│   ├── index.js          # 主入口
│   ├── websocket.js      # WebSocket处理
│   ├── routes/
│   │   ├── bookmarks.js
│   │   ├── history.js
│   │   └── cookies.js
│   └── storage/          # 存储层
│       └── fileStorage.js
├── Dockerfile
├── docker-compose.yml
└── package.json
```

**技术栈:**
- Node.js + Express
- ws (WebSocket库)
- 持久化存储 (JSON文件或SQLite)

---

## 实时同步原理

```
┌─────────────┐     WebSocket      ┌─────────────┐
│  浏览器插件  │ ◄───────────────► │  Docker容器  │
│             │                    │   服务器     │
│  - 书签      │   实时推送/接收    │  - WebSocket │
│  - 历史记录  │ ───────────────►  │  - REST API  │
│  - Cookie   │                    │  - 数据存储  │
└─────────────┘                    └─────────────┘
```

### 同步流程:
1. 插件启动时建立 WebSocket 连接
2. 监听浏览器 API 变化 (bookmarks/history/cookies)
3. 变化时立即通过 WebSocket 发送到服务器
4. 服务器接收并存储，同时可转发给其他客户端
5. 支持双向同步：服务器也可推送数据到浏览器

---

## 实现步骤

### 步骤 1: 创建插件基础结构 (extension/)
- [ ] 创建 manifest.json 配置文件
- [ ] 定义插件权限 (bookmarks, history, cookies, storage, WebSocket)
- [ ] 创建基础弹窗界面

### 步骤 2: WebSocket 连接管理 (extension/)
- [ ] 在 background.js 中建立 WebSocket 连接
- [ ] 实现心跳检测和重连机制
- [ ] 配置服务器地址 (用户可设置)

### 步骤 3: 书签同步功能 (extension/)
- [ ] 实现书签监听 (onChanged, onCreated, onRemoved)
- [ ] 通过 WebSocket 实时同步书签变化

### 步骤 4: 历史记录同步功能 (extension/)
- [ ] 实现历史记录监听 (onVisited)
- [ ] 通过 WebSocket 实时同步历史记录

### 步骤 5: Cookie 同步功能 (extension/)
- [ ] 实现 Cookie 监听 (onChanged)
- [ ] 通过 WebSocket 实时同步 Cookie 变化

### 步骤 6: 设置页面 (extension/)
- [ ] 服务器地址配置
- [ ] 同步开关控制
- [ ] 连接状态显示

### 步骤 7: 创建后端服务器 (server/)
- [ ] 创建 Express + WebSocket 服务器
- [ ] 实现书签/历史记录/Cookie 接收API
- [ ] 实现数据持久化存储

### 步骤 8: Docker 容器化 (server/)
- [ ] 创建 Dockerfile
- [ ] 创建 docker-compose.yml
- [ ] 配置端口和volume

---

## 关键代码实现

### manifest.json 核心配置
```json
{
  "permissions": [
    "bookmarks",
    "history", 
    "cookies",
    "storage",
    "tabs"
  ],
  "background": {
    "service_worker": "background/background.js"
  },
  "host_permissions": [
    "ws://localhost:8080/*",
    "ws://your-server:8080/*"
  ]
}
```

### 书签监听 + WebSocket 发送 (background.js)
```javascript
let ws = null;
let serverUrl = 'ws://localhost:8080';

function connect() {
  ws = new WebSocket(serverUrl);
  ws.onopen = () => console.log('Connected to sync server');
  ws.onmessage = (event) => handleMessage(JSON.parse(event.data));
  ws.onclose = () => setTimeout(connect, 5000); // 重连
}

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  ws?.send(JSON.stringify({ type: 'bookmark_created', data: bookmark }));
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  ws?.send(JSON.stringify({ type: 'bookmark_changed', id, data: changeInfo }));
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  ws?.send(JSON.stringify({ type: 'bookmark_removed', id }));
});
```

### 服务器 WebSocket 处理 (server/src/websocket.js)
```javascript
const { WebSocketServer } = require('ws');

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', (message) => {
      const data = JSON.parse(message);
      handleSyncData(data); // 处理同步数据
      broadcastToOtherClients(data); // 广播给其他客户端
    });
  });
}
```

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 8080
CMD ["node", "src/index.js"]
```

---

## 功能详细说明

### 1. 书签同步
| 功能 | 描述 |
|------|------|
| 增 | 添加书签 → 实时推送到服务器 |
| 删 | 删除书签 → 实时推送到服务器 |
| 改 | 编辑书签 → 实时推送到服务器 |

### 2. 历史记录同步
| 功能 | 描述 |
|------|------|
| 访问 | 访问网页 → 实时推送到服务器 |

### 3. Cookie 同步
| 功能 | 描述 |
|------|------|
| 变化 | Cookie 变化 → 实时推送到服务器 |

---

## 验收标准

1. ✅ 插件可以正常安装和运行
2. ✅ WebSocket 连接正常
3. ✅ 书签增删改后实时同步到服务器
4. ✅ 历史记录实时同步到服务器
5. ✅ Cookie 变化实时同步到服务器
6. ✅ Docker 容器可以正常部署和运行
