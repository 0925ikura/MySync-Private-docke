const API_BASE = '';
let ws = null;
let currentData = {
  bookmarks: [],
  history: [],
  cookies: [],
  clients: []
};

let authToken = localStorage.getItem('authToken');
let currentUser = localStorage.getItem('username');

document.addEventListener('DOMContentLoaded', init);

function init() {
  checkAuth();
  setupNavigation();
  setupSearch();
  setupDeleteAll();
  setupSettings();
  connectWebSocket();
  loadInitialData();
}

function checkAuth() {
  if (!authToken) {
    window.location.href = '/login.html';
    return;
  }
  
  fetch(`${API_BASE}/api/auth/check`, {
    headers: {
      'Authorization': authToken
    }
  })
  .then(res => res.json())
  .then(data => {
    if (!data.authenticated) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
      window.location.href = '/login.html';
    } else {
      currentUser = data.username;
      updateUserInfo();
    }
  })
  .catch(() => {
    window.location.href = '/login.html';
  });
}

function updateUserInfo() {
  const usernameEl = document.getElementById('current-username');
  const usernameDisplayEl = document.getElementById('current-username-display');
  
  if (usernameEl) {
    usernameEl.textContent = currentUser || '-';
  }
  
  if (usernameDisplayEl) {
    usernameDisplayEl.value = currentUser || '-';
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const pageTitle = document.getElementById('page-title');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageName = item.dataset.page;
      
      navItems.forEach(nav => nav.classList.remove('active'));
      pages.forEach(page => page.classList.remove('active'));
      
      item.classList.add('active');
      document.getElementById(`page-${pageName}`).classList.add('active');
      
      const titles = {
        dashboard: '仪表盘',
        bookmarks: '书签管理',
        history: '历史记录',
        cookies: 'Cookie 管理',
        clients: '客户端',
        settings: '设置'
      };
      pageTitle.textContent = titles[pageName];
      
      if (pageName === 'bookmarks') renderBookmarks();
      else if (pageName === 'history') renderHistory();
      else if (pageName === 'cookies') renderCookies();
      else if (pageName === 'clients') renderClients();
    });
  });
}

function setupSearch() {
  document.getElementById('bookmarks-search').addEventListener('input', (e) => {
    renderBookmarks(e.target.value);
  });
  
  document.getElementById('history-search').addEventListener('input', (e) => {
    renderHistory(e.target.value);
  });
  
  document.getElementById('cookies-search').addEventListener('input', (e) => {
    renderCookies(e.target.value);
  });
  
  document.getElementById('bookmarks-dedup').addEventListener('click', () => {
    deduplicate('bookmarks');
  });
  
  document.getElementById('history-dedup').addEventListener('click', () => {
    deduplicate('history');
  });
  
  document.getElementById('cookies-dedup').addEventListener('click', () => {
    deduplicate('cookies');
  });
  
  document.getElementById('bookmarks-export').addEventListener('click', () => {
    exportData('bookmarks', 'bookmarks-export.json');
  });
  
  document.getElementById('history-export').addEventListener('click', () => {
    exportData('history', 'history-export.json');
  });
  
  document.getElementById('cookies-export').addEventListener('click', () => {
    exportData('cookies', 'cookies-export.json');
  });
}

function setupDeleteAll() {
  document.getElementById('bookmarks-delete-all').addEventListener('click', () => {
    if (confirm('确定要删除所有书签吗？')) {
      deleteAllData('bookmarks');
    }
  });
  
  document.getElementById('history-delete-all').addEventListener('click', () => {
    if (confirm('确定要删除所有历史记录吗？')) {
      deleteAllData('history');
    }
  });
  
  document.getElementById('cookies-delete-all').addEventListener('click', () => {
    if (confirm('确定要删除所有 Cookie 吗？')) {
      deleteAllData('cookies');
    }
  });
}

async function loadInitialData() {
  try {
    const response = await fetch(`${API_BASE}/api/status`, {
      headers: {
        'Authorization': authToken
      }
    });
    const status = await response.json();
    
    document.getElementById('dash-bookmarks').textContent = status.data.bookmarks;
    document.getElementById('dash-history').textContent = status.data.history;
    document.getElementById('dash-cookies').textContent = status.data.cookies;
    document.getElementById('dash-clients').textContent = status.clients;
  } catch (e) {
    console.error('Failed to load status:', e);
  }
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    updateConnectionStatus(true);
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    updateConnectionStatus(false);
    setTimeout(connectWebSocket, 5000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function handleWebSocketMessage(message) {
  console.log('[WebSocket] Received message:', message.type);
  
  switch (message.type) {
    case 'connected':
      if (message.data) {
        currentData.bookmarks = message.data.bookmarks || [];
        currentData.history = message.data.history || [];
        currentData.cookies = message.data.cookies || [];
        updateDashboard();
        // 如果当前在某个页面，立即渲染
        if (document.getElementById('page-bookmarks').classList.contains('active')) {
          renderBookmarks();
        }
        if (document.getElementById('page-history').classList.contains('active')) {
          renderHistory();
        }
        if (document.getElementById('page-cookies').classList.contains('active')) {
          renderCookies();
        }
      }
      break;
      
    case 'bookmark_created':
    case 'bookmark_changed':
    case 'bookmark_removed':
    case 'sync_bookmarks':
      fetchAndRender('bookmarks');
      break;
      
    case 'history_visited':
    case 'history_removed':
    case 'sync_history':
      fetchAndRender('history');
      break;
      
    case 'cookie_changed':
    case 'sync_cookies':
      fetchAndRender('cookies');
      break;
      
    case 'bookmarks_deduplicated':
    case 'history_deduplicated':
    case 'cookies_deduplicated':
      fetchAndRender(message.type.replace('_deduplicated', ''));
      break;
      
    case 'clients_list':
      currentData.clients = message.data || [];
      document.getElementById('dash-clients').textContent = currentData.clients.length;
      if (document.getElementById('page-clients').classList.contains('active')) {
        renderClients();
      }
      break;
      
    case 'ping':
      // 心跳响应
      break;
  }
}

async function fetchAndRender(type) {
  try {
    const response = await fetch(`${API_BASE}/api/${type}`, {
      headers: {
        'Authorization': authToken
      }
    });
    const data = await response.json();
    currentData[type] = data;
    
    if (type === 'bookmarks' && document.getElementById('page-bookmarks').classList.contains('active')) {
      renderBookmarks();
    } else if (type === 'history' && document.getElementById('page-history').classList.contains('active')) {
      renderHistory();
    } else if (type === 'cookies' && document.getElementById('page-cookies').classList.contains('active')) {
      renderCookies();
    }
    
    updateDashboard();
  } catch (e) {
    console.error(`Failed to fetch ${type}:`, e);
  }
}

function updateDashboard() {
  document.getElementById('dash-bookmarks').textContent = currentData.bookmarks.length;
  document.getElementById('dash-history').textContent = currentData.history.length;
  document.getElementById('dash-cookies').textContent = currentData.cookies.length;
}

function updateConnectionStatus(connected) {
  const statusEl = document.getElementById('connection-status');
  const statusText = statusEl.querySelector('.status-text');
  
  if (connected) {
    statusEl.classList.add('connected');
    statusText.textContent = '已连接';
    document.getElementById('ws-status').textContent = '已连接';
  } else {
    statusEl.classList.remove('connected');
    statusText.textContent = '未连接';
    document.getElementById('ws-status').textContent = '未连接';
  }
}

function renderBookmarks(filter = '') {
  const container = document.getElementById('bookmarks-list');
  const items = [];
  
  // 递归遍历书签树
  function traverse(nodes, level = 0) {
    if (!nodes) return;
    
    for (const node of nodes) {
      if (filter && node.title && !node.title.toLowerCase().includes(filter.toLowerCase())) {
        continue;
      }
      
      if (node.url) {
        items.push({
          type: 'bookmark',
          node: node,
          level: level
        });
      } else if (node.title) {
        items.push({
          type: 'folder',
          node: node,
          level: level
        });
        if (node.children) {
          traverse(node.children, level + 1);
        }
      }
    }
  }
  
  traverse(currentData.bookmarks);
  
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无数据</div>';
    return;
  }
  
  container.innerHTML = items.map(item => {
    const indent = item.level * 20;
    
    if (item.type === 'folder') {
      return `
        <div class="data-item folder-item" style="padding-left: ${indent + 16}px; background: #f9f9f9;">
          <div class="data-icon" style="background: #fff3e0; color: #ff9800;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
          </div>
          <div class="data-content">
            <div class="data-title" style="font-weight: 600;">📁 ${escapeHtml(item.node.title)}</div>
            <div class="data-url">文件夹</div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="data-item" style="padding-left: ${indent + 16}px;">
          <div class="data-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
          </div>
          <div class="data-content">
            <div class="data-title">${escapeHtml(item.node.title || '无标题')}</div>
            <div class="data-url">${escapeHtml(item.node.url)}</div>
          </div>
          <div class="data-actions">
            <button class="btn btn-small btn-delete" onclick="deleteBookmark('${item.node.id}')">删除</button>
          </div>
        </div>
      `;
    }
  }).join('');
}

function renderHistory(filter = '') {
  const container = document.getElementById('history-list');
  const filtered = currentData.history.filter(h => 
    !filter || 
    (h.title && h.title.toLowerCase().includes(filter.toLowerCase())) ||
    (h.url && h.url.toLowerCase().includes(filter.toLowerCase()))
  );
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无数据</div>';
    return;
  }
  
  container.innerHTML = filtered.map(item => `
    <div class="data-item">
      <div class="data-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div class="data-content">
        <div class="data-title">${escapeHtml(item.title || '无标题')}</div>
        <div class="data-url">${escapeHtml(item.url)}</div>
      </div>
      <div class="data-meta">
        <div class="data-time">${formatTime(item.lastVisitTime)}</div>
        <div class="data-actions">
          <button class="btn btn-small btn-delete" onclick="deleteHistoryItem('${item.url}')">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCookies(filter = '') {
  const container = document.getElementById('cookies-list');
  const filtered = currentData.cookies.filter(c => 
    !filter || 
    (c.name && c.name.toLowerCase().includes(filter.toLowerCase())) ||
    (c.domain && c.domain.toLowerCase().includes(filter.toLowerCase()))
  );
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无数据</div>';
    return;
  }
  
  container.innerHTML = filtered.map(item => `
    <div class="data-item">
      <div class="data-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 12l8 0"/>
        </svg>
      </div>
      <div class="data-content">
        <div class="data-title">${escapeHtml(item.name)}</div>
        <div class="data-url">${escapeHtml(item.domain)}</div>
      </div>
      <div class="data-actions">
        <button class="btn btn-small btn-delete" onclick="deleteCookie('${item.name}', '${item.domain}')">删除</button>
      </div>
    </div>
  `).join('');
}

function renderClients() {
  const container = document.getElementById('clients-list');
  
  if (currentData.clients.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无客户端连接</div>';
    return;
  }
  
  container.innerHTML = currentData.clients.map(client => `
    <div class="client-item">
      <div class="client-info">
        <div class="client-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
        <div class="client-details">
          <div class="client-id">${client.id}</div>
          <div class="client-ip">${client.ip || '未知 IP'}</div>
        </div>
      </div>
      <div class="client-time">连接时间：${new Date(client.connectedAt).toLocaleString('zh-CN')}</div>
    </div>
  `).join('');
}

async function deduplicate(type) {
  try {
    const response = await fetch(`${API_BASE}/api/deduplicate?type=${type}`, {
      method: 'POST',
      headers: {
        'Authorization': authToken
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      alert(`已移除 ${result.removed} 条重复数据`);
    }
  } catch (e) {
    console.error('Failed to deduplicate:', e);
    alert('去重失败，请重试');
  }
}

async function deleteAllData(type) {
  try {
    const response = await fetch(`${API_BASE}/api/data?type=${type}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authToken
      }
    });
    
    if (response.ok) {
      if (type === 'bookmarks') {
        currentData.bookmarks = [];
        renderBookmarks();
      } else if (type === 'history') {
        currentData.history = [];
        renderHistory();
      } else if (type === 'cookies') {
        currentData.cookies = [];
        renderCookies();
      }
      updateDashboard();
    }
  } catch (e) {
    console.error('Failed to delete all:', e);
  }
}

async function deleteHistoryItem(url) {
  try {
    const response = await fetch(`${API_BASE}/api/history?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authToken
      }
    });
    
    if (response.ok) {
      currentData.history = currentData.history.filter(h => h.url !== url);
      renderHistory();
      updateDashboard();
    }
  } catch (e) {
    console.error('Failed to delete history:', e);
  }
}

async function deleteCookie(name, domain) {
  try {
    const response = await fetch(`${API_BASE}/api/cookies?name=${encodeURIComponent(name)}&domain=${encodeURIComponent(domain)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authToken
      }
    });
    
    if (response.ok) {
      currentData.cookies = currentData.cookies.filter(c => !(c.name === name && c.domain === domain));
      renderCookies();
      updateDashboard();
    }
  } catch (e) {
    console.error('Failed to delete cookie:', e);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
}

function setupSettings() {
  const changeUsernameForm = document.getElementById('change-username-form');
  const changePasswordForm = document.getElementById('change-password-form');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (changeUsernameForm) {
    changeUsernameForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newUsername = document.getElementById('new-username').value;
      
      if (newUsername.length < 3) {
        alert('用户名长度至少为 3 位');
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/api/auth/change-username`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken
          },
          body: JSON.stringify({ newUsername })
        });
        
        const result = await response.json();
        
        if (result.success) {
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('username', result.username);
          currentUser = result.username;
          authToken = result.token;
          updateUserInfo();
          document.getElementById('current-username-display').value = currentUser;
          document.getElementById('new-username').value = '';
          alert(`用户名修改成功，新用户名：${result.username}`);
        } else {
          alert(result.message || '用户名修改失败');
        }
      } catch (error) {
        alert('网络错误，请稍后重试');
      }
    });
  }
  
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const oldPassword = document.getElementById('old-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      
      if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
      }
      
      if (newPassword.length < 6) {
        alert('密码长度至少为 6 位');
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/api/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken
          },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('密码修改成功，请重新登录');
          localStorage.removeItem('authToken');
          localStorage.removeItem('username');
          window.location.href = '/login.html';
        } else {
          alert(result.message || '密码修改失败');
        }
      } catch (error) {
        alert('网络错误，请稍后重试');
      }
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        window.location.href = '/login.html';
      }
    });
  }
}

function exportData(type, filename) {
  const data = currentData[type];
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

window.deleteItem = function(type, id) {
  console.log(`Delete ${type} ${id}`);
};

window.deleteHistoryItem = deleteHistoryItem;
window.deleteCookie = deleteCookie;

async function deleteBookmark(id) {
  console.log('Delete bookmark:', id);
  if (confirm('确定要删除这个书签吗？')) {
    // 需要从服务器删除，这里先更新本地数据
    function removeFromTree(nodes, idToDelete) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === idToDelete) {
          nodes.splice(i, 1);
          return true;
        }
        if (nodes[i].children && removeFromTree(nodes[i].children, idToDelete)) {
          return true;
        }
      }
      return false;
    }
    
    removeFromTree(currentData.bookmarks, id);
    renderBookmarks();
    updateDashboard();
  }
}
window.deleteBookmark = deleteBookmark;

function exportData(type, filename) {
  let dataToExport = currentData[type];
  
  // 如果是书签，需要扁平化
  if (type === 'bookmarks') {
    const flatBookmarks = [];
    function traverse(nodes) {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.url) {
          flatBookmarks.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    }
    traverse(dataToExport);
    dataToExport = flatBookmarks;
  }
  
  const dataStr = JSON.stringify(dataToExport, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  alert(`已导出 ${dataToExport.length} 条数据到 ${filename}`);
}
