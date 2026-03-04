const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const auth = require('./auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8080;

let initialCredentials = null;
const clients = new Map();
const dataStore = {
  bookmarks: [],
  history: [],
  cookies: []
};

initialCredentials = auth.initializeAdminUser();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }
  
  const result = auth.validateUser(username, password);
  if (result.success) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    res.json({ success: true, username, token });
  } else {
    res.status(401).json(result);
  }
});

app.post('/api/auth/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Old password and new password required' });
  }
  
  const result = auth.changePassword(req.user, oldPassword, newPassword);
  if (result.success) {
    res.json({ success: true, message: 'Password changed successfully' });
  } else {
    res.status(400).json(result);
  }
});

app.post('/api/auth/change-username', authMiddleware, (req, res) => {
  const { newUsername } = req.body;
  
  if (!newUsername) {
    return res.status(400).json({ success: false, message: 'New username required' });
  }
  
  const result = auth.changeUsername(req.user, newUsername);
  if (result.success) {
    const token = Buffer.from(`${result.username}:${req.user.split(':')[1]}`).toString('base64');
    res.json({ success: true, username: result.username, token });
  } else {
    res.status(400).json(result);
  }
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers['authorization'];
  
  if (!token) {
    return res.json({ authenticated: false });
  }
  
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    
    const result = auth.validateUser(username, password);
    res.json({ authenticated: result.success, username: result.username });
  } catch (e) {
    res.json({ authenticated: false });
  }
});

app.get('/api/auth/initial', (req, res) => {
  if (initialCredentials) {
    res.json({ hasInitial: true, username: initialCredentials.username, password: initialCredentials.password });
  } else {
    res.json({ hasInitial: false });
  }
});

function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    
    const result = auth.validateUser(username, password);
    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    req.user = username;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }
}

function publicRoute(req, res, next) {
  next();
}

app.get('/api/status', authMiddleware, (req, res) => {
  res.json({
    status: 'running',
    clients: clients.size,
    data: {
      bookmarks: dataStore.bookmarks.length,
      history: dataStore.history.length,
      cookies: dataStore.cookies.length
    }
  });
});

app.get('/api/bookmarks', authMiddleware, (req, res) => {
  res.json(dataStore.bookmarks);
});

app.get('/api/history', authMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(dataStore.history.slice(-limit));
});

app.get('/api/cookies', authMiddleware, (req, res) => {
  res.json(dataStore.cookies);
});

app.delete('/api/data', authMiddleware, (req, res) => {
  const { type } = req.query;
  if (type && dataStore[type]) {
    dataStore[type] = [];
    broadcast({ type: 'data_cleared', dataType: type });
    res.json({ success: true, message: `${type} data cleared` });
  } else {
    dataStore.bookmarks = [];
    dataStore.history = [];
    dataStore.cookies = [];
    broadcast({ type: 'all_data_cleared' });
    res.json({ success: true, message: 'All data cleared' });
  }
});

app.delete('/api/history', authMiddleware, (req, res) => {
  const { url } = req.query;
  if (url) {
    dataStore.history = dataStore.history.filter(h => h.url !== url);
    broadcast({ type: 'history_removed', data: { urls: [url] } });
    res.json({ success: true, message: 'History item removed' });
  } else {
    res.status(400).json({ success: false, message: 'URL required' });
  }
});

app.delete('/api/cookies', authMiddleware, (req, res) => {
  const { name, domain } = req.query;
  if (name && domain) {
    dataStore.cookies = dataStore.cookies.filter(c => !(c.name === name && c.domain === domain));
    broadcast({ type: 'cookie_changed', data: { cookie: { name, domain }, removed: true } });
    res.json({ success: true, message: 'Cookie removed' });
  } else {
    res.status(400).json({ success: false, message: 'Name and domain required' });
  }
});

app.post('/api/deduplicate', authMiddleware, (req, res) => {
  const { type } = req.query;
  let removedCount = 0;
  
  if (type === 'bookmarks') {
    const seen = new Set();
    const unique = [];
    function dedup(nodes) {
      if (!nodes) return [];
      const result = [];
      for (const node of nodes) {
        if (node.url) {
          if (!seen.has(node.url)) {
            seen.add(node.url);
            result.push(node);
          } else {
            removedCount++;
          }
        } else {
          const newNode = { ...node };
          if (node.children) {
            newNode.children = dedup(node.children);
          }
          result.push(newNode);
        }
      }
      return result;
    }
    dataStore.bookmarks = dedup(dataStore.bookmarks);
    broadcast({ type: 'bookmarks_deduplicated', count: removedCount });
  } else if (type === 'history') {
    const seen = new Set();
    dataStore.history = dataStore.history.filter(h => {
      if (seen.has(h.url)) {
        removedCount++;
        return false;
      }
      seen.add(h.url);
      return true;
    });
    broadcast({ type: 'history_deduplicated', count: removedCount });
  } else if (type === 'cookies') {
    const seen = new Set();
    dataStore.cookies = dataStore.cookies.filter(c => {
      const key = `${c.name}@${c.domain}`;
      if (seen.has(key)) {
        removedCount++;
        return false;
      }
      seen.add(key);
      return true;
    });
    broadcast({ type: 'cookies_deduplicated', count: removedCount });
  } else {
    // 全部去重
    ['bookmarks', 'history', 'cookies'].forEach(t => {
      if (t === 'bookmarks') {
        const seen = new Set();
        function dedup(nodes) {
          if (!nodes) return [];
          const result = [];
          for (const node of nodes) {
            if (node.url) {
              if (!seen.has(node.url)) {
                seen.add(node.url);
                result.push(node);
              } else {
                removedCount++;
              }
            } else {
              const newNode = { ...node };
              if (node.children) {
                newNode.children = dedup(node.children);
              }
              result.push(newNode);
            }
          }
          return result;
        }
        dataStore.bookmarks = dedup(dataStore.bookmarks);
      } else if (t === 'history') {
        const seen = new Set();
        dataStore[t] = dataStore[t].filter(h => {
          if (seen.has(h.url)) {
            removedCount++;
            return false;
          }
          seen.add(h.url);
          return true;
        });
      } else if (t === 'cookies') {
        const seen = new Set();
        dataStore[t] = dataStore[t].filter(c => {
          const key = `${c.name}@${c.domain}`;
          if (seen.has(key)) {
            removedCount++;
            return false;
          }
          seen.add(key);
          return true;
        });
      }
    });
    broadcast({ type: 'all_deduplicated', count: removedCount });
  }
  
  res.json({ success: true, removed: removedCount });
});

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const clientInfo = {
    id: clientId,
    ws,
    ip: req.socket.remoteAddress,
    connectedAt: new Date().toISOString()
  };
  
  clients.set(clientId, clientInfo);
  
  console.log(`[WebSocket] Client connected: ${clientId} (Total: ${clients.size})`);
  
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    data: dataStore
  }));

  broadcastClientsList();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(clientId, data);
    } catch (e) {
      console.error('[WebSocket] Failed to parse message:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`[WebSocket] Client disconnected: ${clientId} (Total: ${clients.size})`);
    broadcastClientsList();
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Client error:', error);
  });
});

function handleMessage(clientId, data) {
  console.log(`[WebSocket] Received: ${data.type}`);
  
  switch (data.type) {
    case 'ping':
      sendToClient(clientId, { type: 'pong' });
      break;
      
    case 'sync_bookmarks':
      if (data.data) {
        dataStore.bookmarks = data.data;
        broadcast({ type: 'sync_bookmarks', data: data.data }, clientId);
      }
      break;
      
    case 'bookmark_created':
      dataStore.bookmarks.push({ ...data.data, syncedAt: new Date().toISOString() });
      broadcast({ type: 'bookmark_created', data: data.data }, clientId);
      break;
      
    case 'bookmark_changed':
      const bmIndex = dataStore.bookmarks.findIndex(b => b.id === data.data.id);
      if (bmIndex >= 0) {
        dataStore.bookmarks[bmIndex] = { ...dataStore.bookmarks[bmIndex], ...data.data.data, syncedAt: new Date().toISOString() };
      }
      broadcast({ type: 'bookmark_changed', data: data.data }, clientId);
      break;
      
    case 'bookmark_removed':
      dataStore.bookmarks = dataStore.bookmarks.filter(b => b.id !== data.data.id);
      broadcast({ type: 'bookmark_removed', data: data.data }, clientId);
      break;
      
    case 'bookmark_moved':
      broadcast({ type: 'bookmark_moved', data: data.data }, clientId);
      break;
      
    case 'sync_history':
      if (Array.isArray(data.data)) {
        dataStore.history = data.data;
        broadcast({ type: 'sync_history', data: data.data }, clientId);
      }
      break;
      
    case 'history_visited':
      const existingIndex = dataStore.history.findIndex(h => h.url === data.data.url);
      if (existingIndex >= 0) {
        dataStore.history[existingIndex] = { ...data.data, lastVisitTime: Date.now() };
      } else {
        dataStore.history.push({ ...data.data, syncedAt: new Date().toISOString() });
      }
      broadcast({ type: 'history_visited', data: data.data }, clientId);
      break;
      
    case 'history_removed':
      if (data.data.allUrls) {
        dataStore.history = [];
      } else {
        dataStore.history = dataStore.history.filter(h => !data.data.urls.includes(h.url));
      }
      broadcast({ type: 'history_removed', data: data.data }, clientId);
      break;
      
    case 'sync_cookies':
      if (Array.isArray(data.data)) {
        dataStore.cookies = data.data;
        broadcast({ type: 'sync_cookies', data: data.data }, clientId);
      }
      break;
      
    case 'cookie_changed':
      const cookieIndex = dataStore.cookies.findIndex(
        c => c.name === data.data.cookie.name && c.domain === data.data.cookie.domain
      );
      
      if (data.data.removed) {
        if (cookieIndex >= 0) {
          dataStore.cookies.splice(cookieIndex, 1);
        }
      } else if (cookieIndex >= 0) {
        dataStore.cookies[cookieIndex] = { ...data.data.cookie, syncedAt: new Date().toISOString() };
      } else {
        dataStore.cookies.push({ ...data.data.cookie, syncedAt: new Date().toISOString() });
      }
      broadcast({ type: 'cookie_changed', data: data.data }, clientId);
      break;
      
    default:
      console.log(`[WebSocket] Unknown message type: ${data.type}`);
  }
}

function sendToClient(clientId, data) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === 1) {
    client.ws.send(JSON.stringify(data));
  }
}

function broadcast(data, excludeClientId = null) {
  const message = JSON.stringify(data);
  clients.forEach((client, id) => {
    if (id !== excludeClientId && client.ws.readyState === 1) {
      client.ws.send(message);
    }
  });
}

function broadcastClientsList() {
  const clientList = Array.from(clients.values()).map(c => ({
    id: c.id,
    ip: c.ip,
    connectedAt: c.connectedAt
  }));
  
  broadcast({ type: 'clients_list', data: clientList });
}

setInterval(() => {
  const deadClients = [];
  clients.forEach((client, id) => {
    if (client.ws.readyState !== 1) {
      deadClients.push(id);
    }
  });
  
  deadClients.forEach(id => clients.delete(id));
  
  if (clients.size > 0) {
    broadcast({ type: 'ping' });
  }
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`  Browser Sync Server`);
  console.log(`  Port: ${PORT}`);
  console.log(`  WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`  HTTP API: http://localhost:${PORT}/api`);
  console.log(`========================================`);
});
