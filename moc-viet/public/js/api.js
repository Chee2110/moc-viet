/* API & Utility helpers */
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('mv_token');
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const res = await fetch(endpoint, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('mv_token');
      localStorage.removeItem('mv_user');
      window.location.href = '/login.html';
      return null;
    }
    return res;
  } catch {
    return null;
  }
}
const api = {
  get:    async (url)       => { const r = await apiCall(url); return r ? r.json() : null; },
  post:   async (url, data) => { const r = await apiCall(url, { method:'POST', body: data instanceof FormData ? data : JSON.stringify(data) }); return r ? r.json() : null; },
  put:    async (url, data) => { const r = await apiCall(url, { method:'PUT',  body: data instanceof FormData ? data : JSON.stringify(data) }); return r ? r.json() : null; },
  patch:  async (url, data) => { const r = await apiCall(url, { method:'PATCH', body: JSON.stringify(data||{}) }); return r ? r.json() : null; },
  delete: async (url)       => { const r = await apiCall(url, { method:'DELETE' }); return r ? r.json() : null; },
};

/* Slug helpers */
function slugify(str) {
  const map = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
    'ă':'a','ắ':'a','ặ':'a','ằ':'a','ẳ':'a','ẵ':'a',
    'â':'a','ấ':'a','ậ':'a','ầ':'a','ẩ':'a','ẫ':'a',
    'đ':'d',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ế':'e','ệ':'e','ề':'e','ể':'e','ễ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
    'ô':'o','ố':'o','ộ':'o','ồ':'o','ổ':'o','ỗ':'o',
    'ơ':'o','ớ':'o','ợ':'o','ờ':'o','ở':'o','ỡ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ứ':'u','ự':'u','ừ':'u','ử':'u','ữ':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
  };
  return (str || '').toLowerCase()
    .split('').map(c => map[c] || c).join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function productUrl(id, name) {
  return '/san-pham/' + (name ? slugify(name) + '-' : '') + id;
}

/* Format helpers */
function fmtPrice(n) { return new Intl.NumberFormat('vi-VN').format(n) + 'đ'; }
function fmtDate(d) {
  return new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function timeAgo(d) {
  const sec = Math.floor((Date.now() - new Date(d)) / 1000);
  if (sec < 60) return 'Vừa xong';
  if (sec < 3600) return Math.floor(sec/60) + ' phút trước';
  if (sec < 86400) return Math.floor(sec/3600) + ' giờ trước';
  return Math.floor(sec/86400) + ' ngày trước';
}

/* Status helpers */
const STATUS_LABEL = {
  pending: 'Chờ xác nhận', approved: 'Đã duyệt', rejected: 'Đã từ chối',
  shipping: 'Đang giao', completed: 'Hoàn thành',
  cancelled: 'Đã huỷ', returned: 'Hoàn hàng'
};
const STATUS_BADGE = {
  pending:'badge-warning', approved:'badge-success', rejected:'badge-danger',
  shipping:'badge-info', completed:'badge-secondary',
  cancelled:'badge-danger', returned:'badge-warning'
};
function statusBadge(s) { return `<span class="badge ${STATUS_BADGE[s]||''}">${STATUS_LABEL[s]||s}</span>`; }

const NEXT_STATUS = {
  pending:   ['approved', 'rejected', 'cancelled'],
  approved:  ['shipping', 'cancelled'],
  shipping:  ['completed'],
  completed: ['returned'],
};
const NEXT_LABEL = { approved:'Duyệt', rejected:'Từ chối', shipping:'Giao hàng', completed:'Hoàn thành', cancelled:'Huỷ đơn', returned:'Hoàn hàng' };

/* Toast */
function toast(msg, type='success') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id='toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = `<span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

/* Product image */
function productImg(url, alt, cls) {
  if (url) return `<img src="${url}" alt="${alt||''}" class="${cls||''}" onerror="this.parentElement.innerHTML='<div class=\\"product-img-placeholder\\">🌿</div>'">`;
  return '<div class="product-img-placeholder">🌿</div>';
}

/* Cart badge */
async function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const user = typeof getUser === 'function' ? getUser() : null;
  if (!user) { badge.style.display = 'none'; return; }
  try {
    const items = await api.get('/api/cart');
    const total = (items||[]).reduce((s, i) => s + i.quantity, 0);
    badge.textContent = total > 99 ? '99+' : total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  } catch {}
}

/* ── WebSocket real-time notifications */
let _ws = null;
let _wsCallbacks = [];
let _wsReconnectTimer = null;

function connectWS() {
  const token = localStorage.getItem('mv_token');
  if (!token || _ws) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  try {
    _ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`);
    _ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'notification') {
          for (const cb of _wsCallbacks) cb(data);
        }
      } catch {}
    };
    _ws.onclose = () => {
      _ws = null;
      _wsReconnectTimer = setTimeout(connectWS, 5000);
    };
    _ws.onerror = () => { _ws?.close(); _ws = null; };
  } catch {}
}

function disconnectWS() {
  clearTimeout(_wsReconnectTimer);
  if (_ws) { _ws.close(); _ws = null; }
}

function onWSNotification(cb) { _wsCallbacks.push(cb); }

/* Notification polling + WebSocket hybrid */
let _notifTimer = null;

function startNotifPolling(onUpdate) {
  async function poll() {
    try { const data = await api.get('/api/notifications'); if (data) onUpdate(data); } catch {}
  }
  poll();
  _notifTimer = setInterval(poll, 30000);
  connectWS();
  onWSNotification(async () => {
    try { const data = await api.get('/api/notifications'); if (data) onUpdate(data); } catch {}
  });
}

function stopNotifPolling() {
  if (_notifTimer) clearInterval(_notifTimer);
  disconnectWS();
}

function renderNotifDropdown(data) {
  const badge = document.getElementById('notif-badge');
  const list  = document.getElementById('notif-list');
  if (!badge || !list) return;
  badge.textContent = data.unread_count > 99 ? '99+' : data.unread_count;
  badge.style.display = data.unread_count > 0 ? 'flex' : 'none';
  if (!data.notifications?.length) {
    list.innerHTML = '<div class="notif-empty">Chưa có thông báo nào</div>';
    return;
  }
  list.innerHTML = data.notifications.slice(0,20).map(n =>
    `<div class="notif-item${n.is_read?'':' unread'}" onclick="onNotifClick(${n.id},${n.order_id||'null'})">
      <div class="notif-dot" style="${n.is_read?'opacity:0':''}"></div>
      <div><div class="notif-msg">${n.message}</div><div class="notif-time">${timeAgo(n.created_at)}</div></div>
    </div>`
  ).join('');

  // ── Inject shake keyframe once
  if (!document.getElementById('_notif-shake-style')) {
    const s = document.createElement('style');
    s.id = '_notif-shake-style';
    s.textContent = `
      @keyframes notif-ring {
        0%,100%{transform:rotate(0)}
        10%{transform:rotate(-18deg)}
        20%{transform:rotate(18deg)}
        30%{transform:rotate(-14deg)}
        40%{transform:rotate(14deg)}
        50%{transform:rotate(-8deg)}
        60%{transform:rotate(8deg)}
        70%{transform:rotate(-4deg)}
        80%{transform:rotate(4deg)}
        90%{transform:rotate(0)}
      }
      .notif-icon-ringing {
        animation: notif-ring 0.7s ease;
        transform-origin: top center;
        display: inline-block;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Trigger shake on icon when there are unread notifs
  const notifIcon = document.querySelector('#notif-toggle img');
  if (notifIcon) {
    if (data.unread_count > 0) {
      notifIcon.classList.remove('notif-icon-ringing');
      void notifIcon.offsetWidth; // force reflow to restart animation
      notifIcon.classList.add('notif-icon-ringing');
      notifIcon.addEventListener('animationend', () =>
        notifIcon.classList.remove('notif-icon-ringing'), { once: true });
    } else {
      notifIcon.classList.remove('notif-icon-ringing');
    }
  }
}

async function onNotifClick(id, orderId) {
  await api.patch('/api/notifications/' + id + '/read');
  if (orderId) {
    const user = JSON.parse(localStorage.getItem('mv_user')||'{}');
    const base = user.role === 'admin' ? '/admin/orders.html' : user.role === 'buyer' ? '/buyer/orders.html' : '/seller/orders.html';
    window.location.href = base;
  }
}
