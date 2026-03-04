let ws = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let serverUrl = 'ws://localhost:8080';
let isConnected = false;

function getServerUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['serverUrl'], (result) => {
      resolve(result.serverUrl || 'ws://localhost:8080');
    });
  });
}

async function connect() {
  serverUrl = await getServerUrl();
  
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    ws = new WebSocket(serverUrl);
    
    ws.onopen = () => {
      console.log('[Sync] Connected to server:', serverUrl);
      isConnected = true;
      updateConnectionStatus(true);
      startHeartbeat();
      syncAllData();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (e) {
        console.error('[Sync] Failed to parse message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[Sync] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[Sync] Connection closed');
      isConnected = false;
      updateConnectionStatus(false);
      stopHeartbeat();
      scheduleReconnect();
    };
  } catch (e) {
    console.error('[Sync] Failed to connect:', e);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  reconnectTimer = setTimeout(() => {
    console.log('[Sync] Attempting to reconnect...');
    connect();
  }, 5000);
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function updateConnectionStatus(connected) {
  chrome.storage.local.set({ isConnected: connected });
  chrome.runtime.sendMessage({ type: 'connectionStatus', connected });
}

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function handleServerMessage(message) {
  switch (message.type) {
    case 'pong':
      break;
    case 'sync_bookmarks':
      handleBookmarksSync(message.data);
      break;
    case 'sync_history':
      handleHistorySync(message.data);
      break;
    case 'sync_cookies':
      handleCookiesSync(message.data);
      break;
    default:
      console.log('[Sync] Unknown message type:', message.type);
  }
}

async function syncAllData() {
  try {
    const bookmarksTree = await chrome.bookmarks.getTree();
    console.log('[Sync] Syncing bookmarks tree');
    send({ type: 'sync_bookmarks', data: bookmarksTree });
  } catch (e) {
    console.error('[Sync] Failed to get bookmarks:', e);
  }

  try {
    const history = await chrome.history.search({ text: '', maxResults: 10000 });
    console.log('[Sync] Syncing history:', history.length, 'items');
    send({ type: 'sync_history', data: history });
  } catch (e) {
    console.error('[Sync] Failed to get history:', e);
  }

  try {
    const cookies = await chrome.cookies.getAll({});
    console.log('[Sync] Syncing cookies:', cookies.length, 'items');
    send({ type: 'sync_cookies', data: cookies });
  } catch (e) {
    console.error('[Sync] Failed to get cookies:', e);
  }
}

async function handleBookmarksSync(data) {
  console.log('[Sync] Received bookmarks sync:', data.length, 'items');
}

async function handleHistorySync(data) {
  console.log('[Sync] Received history sync:', data.length, 'items');
}

async function handleCookiesSync(data) {
  console.log('[Sync] Received cookies sync:', data.length, 'items');
}

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('[Sync] Bookmark created:', bookmark.title);
  send({ type: 'bookmark_created', data: { id, ...bookmark } });
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log('[Sync] Bookmark changed:', changeInfo.title);
  send({ type: 'bookmark_changed', data: { id, ...changeInfo } });
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('[Sync] Bookmark removed:', id);
  send({ type: 'bookmark_removed', data: { id, ...removeInfo } });
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log('[Sync] Bookmark moved:', id);
  send({ type: 'bookmark_moved', data: { id, ...moveInfo } });
});

chrome.history.onVisited.addListener((result) => {
  console.log('[Sync] History visited:', result.title);
  send({ type: 'history_visited', data: result });
});

chrome.history.onVisitRemoved.addListener((removed) => {
  console.log('[Sync] History removed');
  send({ type: 'history_removed', data: removed });
});

chrome.cookies.onChanged.addListener((changeInfo) => {
  console.log('[Sync] Cookie changed:', changeInfo.cookie.name, changeInfo.cookie.domain);
  send({ type: 'cookie_changed', data: changeInfo });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getStatus') {
    sendResponse({ connected: isConnected, serverUrl });
  } else if (message.type === 'reconnect') {
    if (ws) {
      ws.close();
    }
    connect();
    sendResponse({ success: true });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Sync] Extension installed');
  connect();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Sync] Extension started');
  connect();
});

connect();
