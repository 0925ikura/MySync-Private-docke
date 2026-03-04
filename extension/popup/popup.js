document.addEventListener('DOMContentLoaded', init);

let bookmarksData = [];
let historyData = [];
let cookiesData = [];
let isConnected = false;

function init() {
  setupTabs();
  setupSyncButtons();
  loadStatus();
  loadData();
  setupMessageListener();
}

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${tabName}-panel`).classList.add('active');
    });
  });
}

function setupSyncButtons() {
  document.getElementById('sync-bookmarks').addEventListener('click', () => syncBookmarks());
  document.getElementById('sync-history').addEventListener('click', () => syncHistory());
  document.getElementById('sync-cookies').addEventListener('click', () => syncCookies());
  
  document.getElementById('settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });
}

function loadStatus() {
  chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
    if (response) {
      updateConnectionStatus(response.connected);
      document.getElementById('server-url').textContent = response.serverUrl || 'ws://localhost:8080';
    }
  });
}

function updateConnectionStatus(connected) {
  const statusEl = document.getElementById('status');
  const statusText = statusEl.querySelector('.status-text');
  
  isConnected = connected;
  
  if (connected) {
    statusEl.classList.add('connected');
    statusText.textContent = '已连接';
  } else {
    statusEl.classList.remove('connected');
    statusText.textContent = '未连接';
  }
}

async function loadData() {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    bookmarksData = flattenBookmarks(bookmarks);
    document.getElementById('bookmarks-count').textContent = bookmarksData.length;
    document.getElementById('bookmarks-synced').textContent = bookmarksData.length;
    renderBookmarks();
  } catch (e) {
    console.error('Failed to load bookmarks:', e);
  }

  try {
    const history = await chrome.history.search({ text: '', maxResults: 50 });
    historyData = history;
    document.getElementById('history-count').textContent = history.length;
    document.getElementById('history-synced').textContent = history.length;
    renderHistory();
  } catch (e) {
    console.error('Failed to load history:', e);
  }

  try {
    const cookies = await chrome.cookies.getAll({});
    cookiesData = cookies;
    document.getElementById('cookies-count').textContent = cookies.length;
    document.getElementById('cookies-synced').textContent = cookies.length;
    renderCookies();
    console.log('[Popup] Cookies loaded:', cookies.length);
  } catch (e) {
    console.error('[Popup] Failed to load cookies:', e);
    document.getElementById('cookies-count').textContent = '0';
    document.getElementById('cookies-synced').textContent = '0';
  }
}

function flattenBookmarks(tree) {
  const result = [];
  
  function traverse(nodes) {
    for (const node of nodes) {
      if (node.url) {
        result.push({
          id: node.id,
          title: node.title,
          url: node.url,
          parentId: node.parentId
        });
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }
  
  traverse(tree);
  return result;
}

function renderBookmarks() {
  const container = document.getElementById('bookmarks-list');
  
  if (bookmarksData.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无同步数据</div>';
    return;
  }

  const recent = bookmarksData;
  container.innerHTML = recent.map(item => `
    <div class="list-item" data-url="${escapeHtml(item.url)}">
      <div class="list-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
        </svg>
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(item.title)}</div>
        <div class="list-item-url">${escapeHtml(item.url)}</div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
}

function renderHistory() {
  const container = document.getElementById('history-list');
  
  if (historyData.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无同步数据</div>';
    return;
  }

  const recent = historyData;
  container.innerHTML = recent.map(item => `
    <div class="list-item" data-url="${escapeHtml(item.url)}">
      <div class="list-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(item.title || '无标题')}</div>
        <div class="list-item-url">${escapeHtml(item.url)}</div>
      </div>
      <div class="list-item-time">${formatTime(item.lastVisitTime)}</div>
    </div>
  `).join('');

  container.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
}

function renderCookies() {
  const container = document.getElementById('cookies-list');
  
  if (cookiesData.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无同步数据</div>';
    return;
  }

  const recent = cookiesData;
  container.innerHTML = recent.map(item => `
    <div class="list-item">
      <div class="list-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
          <path d="M12 12l8 0"/>
        </svg>
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(item.name)}</div>
        <div class="list-item-url">${escapeHtml(item.domain)}</div>
      </div>
    </div>
  `).join('');
}

function syncBookmarks() {
  chrome.runtime.sendMessage({ type: 'syncBookmarks' }, (response) => {
    if (response && response.success) {
      showNotification('书签同步成功');
    }
  });
}

function syncHistory() {
  chrome.runtime.sendMessage({ type: 'syncHistory' }, (response) => {
    if (response && response.success) {
      showNotification('历史记录同步成功');
    }
  });
}

function syncCookies() {
  chrome.runtime.sendMessage({ type: 'syncCookies' }, (response) => {
    if (response && response.success) {
      showNotification('Cookie同步成功');
    }
  });
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'connectionStatus') {
      updateConnectionStatus(message.connected);
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  
  return date.toLocaleDateString('zh-CN');
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}
