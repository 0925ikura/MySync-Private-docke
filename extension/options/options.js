document.addEventListener('DOMContentLoaded', init);

const defaultSettings = {
  serverUrl: 'ws://localhost:8080',
  syncBookmarks: true,
  syncHistory: true,
  syncCookies: true,
  bookmarksLimit: 500,
  historyLimit: 1000,
  cookiesLimit: 200
};

let settings = { ...defaultSettings };

function init() {
  loadSettings();
  setupEventListeners();
  checkConnectionStatus();
  loadStats();
}

function loadSettings() {
  chrome.storage.local.get(Object.keys(defaultSettings), (result) => {
    settings = { ...defaultSettings, ...result };
    applySettings();
  });
}

async function loadStats() {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    const bookmarksCount = flattenBookmarks(bookmarks).length;
    document.getElementById('bookmarks-count').textContent = bookmarksCount;
  } catch (e) {
    console.error('[Options] Failed to load bookmarks:', e);
  }

  try {
    const history = await chrome.history.search({ text: '', maxResults: 10000 });
    document.getElementById('history-count').textContent = history.length;
  } catch (e) {
    console.error('[Options] Failed to load history:', e);
  }

  try {
    const cookies = await chrome.cookies.getAll({});
    document.getElementById('cookies-count').textContent = cookies.length;
  } catch (e) {
    console.error('[Options] Failed to load cookies:', e);
  }
}

function flattenBookmarks(tree) {
  const result = [];
  function traverse(nodes) {
    for (const node of nodes) {
      if (node.url) {
        result.push(node);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }
  traverse(tree);
  return result;
}

function applySettings() {
  document.getElementById('server-url').value = settings.serverUrl;
  document.getElementById('sync-bookmarks').checked = settings.syncBookmarks;
  document.getElementById('sync-history').checked = settings.syncHistory;
  document.getElementById('sync-cookies').checked = settings.syncCookies;
  document.getElementById('bookmarks-limit').value = settings.bookmarksLimit;
  document.getElementById('history-limit').value = settings.historyLimit;
  document.getElementById('cookies-limit').value = settings.cookiesLimit;
}

function setupEventListeners() {
  document.getElementById('server-url').addEventListener('change', (e) => {
    settings.serverUrl = e.target.value;
    saveSettings();
  });

  document.getElementById('sync-bookmarks').addEventListener('change', (e) => {
    settings.syncBookmarks = e.target.checked;
    saveSettings();
  });

  document.getElementById('sync-history').addEventListener('change', (e) => {
    settings.syncHistory = e.target.checked;
    saveSettings();
  });

  document.getElementById('sync-cookies').addEventListener('change', (e) => {
    settings.syncCookies = e.target.checked;
    saveSettings();
  });

  document.getElementById('bookmarks-limit').addEventListener('change', (e) => {
    settings.bookmarksLimit = parseInt(e.target.value) || 500;
    saveSettings();
  });

  document.getElementById('history-limit').addEventListener('change', (e) => {
    settings.historyLimit = parseInt(e.target.value) || 1000;
    saveSettings();
  });

  document.getElementById('cookies-limit').addEventListener('change', (e) => {
    settings.cookiesLimit = parseInt(e.target.value) || 200;
    saveSettings();
  });

  document.getElementById('reconnect-btn').addEventListener('click', reconnect);
  document.getElementById('sync-all-btn').addEventListener('click', syncAll);
  document.getElementById('clear-data-btn').addEventListener('click', clearData);
  document.getElementById('save-btn').addEventListener('click', () => {
    settings.serverUrl = document.getElementById('server-url').value;
    settings.syncBookmarks = document.getElementById('sync-bookmarks').checked;
    settings.syncHistory = document.getElementById('sync-history').checked;
    settings.syncCookies = document.getElementById('sync-cookies').checked;
    settings.bookmarksLimit = parseInt(document.getElementById('bookmarks-limit').value) || 500;
    settings.historyLimit = parseInt(document.getElementById('history-limit').value) || 1000;
    settings.cookiesLimit = parseInt(document.getElementById('cookies-limit').value) || 200;
    saveSettings();
    showNotification('设置已保存，正在重新连接...');
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'reconnect' });
      setTimeout(() => {
        window.close();
      }, 1000);
    }, 500);
  });
}

function saveSettings() {
  chrome.storage.local.set(settings, () => {
    showNotification('设置已保存');
  });
}

function checkConnectionStatus() {
  chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
    updateConnectionStatus(response?.connected || false);
  });
}

function updateConnectionStatus(connected) {
  const indicator = document.getElementById('status-indicator');
  const statusText = indicator.querySelector('.status-text');
  
  if (connected) {
    indicator.classList.add('connected');
    statusText.textContent = '已连接';
  } else {
    indicator.classList.remove('connected');
    statusText.textContent = '未连接';
  }
}

function reconnect() {
  const btn = document.getElementById('reconnect-btn');
  btn.disabled = true;
  btn.textContent = '连接中...';
  
  chrome.runtime.sendMessage({ type: 'reconnect' }, (response) => {
    setTimeout(() => {
      checkConnectionStatus();
      btn.disabled = false;
      btn.textContent = '重新连接';
    }, 2000);
  });
}

async function syncAll() {
  const btn = document.getElementById('sync-all-btn');
  btn.disabled = true;
  btn.textContent = '同步中...';
  
  try {
    if (settings.syncBookmarks) {
      const bookmarks = await chrome.bookmarks.getTree();
      console.log('Syncing bookmarks:', bookmarks.length);
    }
    
    if (settings.syncHistory) {
      const history = await chrome.history.search({ text: '', maxResults: 100 });
      console.log('Syncing history:', history.length);
    }
    
    if (settings.syncCookies) {
      const cookies = await chrome.cookies.getAll({});
      console.log('Syncing cookies:', cookies.length);
    }
    
    showNotification('同步完成');
  } catch (e) {
    console.error('Sync failed:', e);
    showNotification('同步失败: ' + e.message);
  }
  
  btn.disabled = false;
  btn.textContent = '立即同步全部';
}

function clearData() {
  if (confirm('确定要清除所有本地同步数据吗？此操作不可恢复。')) {
    chrome.storage.local.remove(['bookmarksData', 'historyData', 'cookiesData'], () => {
      showNotification('数据已清除');
    });
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 10px 16px;
    border-radius: 4px;
    font-size: 13px;
    z-index: 1000;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2500);
}

setInterval(checkConnectionStatus, 5000);
