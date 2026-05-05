/* Auth state management */
function getUser()    { try { return JSON.parse(localStorage.getItem('mv_user')||'null'); } catch { return null; } }
function getToken()   { return localStorage.getItem('mv_token'); }
function isLoggedIn() { return !!getToken(); }

function saveAuth(token, user) {
  localStorage.setItem('mv_token', token);
  localStorage.setItem('mv_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('mv_token');
  localStorage.removeItem('mv_user');
}
function logout() {
  if (typeof disconnectWS === 'function') disconnectWS();
  clearAuth();
  window.location.href = '/login.html';
}

function requireRole(role) {
  const user = getUser();
  if (!user) { window.location.href = '/login.html'; return false; }
  if (user.role !== role) {
    if (user.role === 'admin')        window.location.href = '/admin/shops.html';
    else if (user.role === 'seller')  window.location.href = '/seller/dashboard.html';
    else                              window.location.href = '/buyer/orders.html';
    return false;
  }
  return true;
}
function requireAuth() {
  if (!isLoggedIn()) { window.location.href = '/login.html'; return false; }
  return true;
}

function initNavbar() {
  // ── Logo: replace brand text with circular image + hotline beside it
  const brand = document.querySelector('.navbar-brand');
  if (brand && !brand.querySelector('img')) {
    brand.innerHTML =
      '<img src="/img/logo.png" alt="Mộc Việt" style="width:46px;height:46px;border-radius:50%;object-fit:cover;display:block">';
  }

  // ── Remove navbar search bar if present
  document.querySelector('.navbar-search')?.remove();

  // ── Brand text "MỘC VIỆT" (10px from logo) + hotline (20px from brand text)
  const navInner = document.querySelector('.navbar-inner');
  if (navInner && !navInner.querySelector('.navbar-hotline')) {
    const bt = document.createElement('span');
    bt.className = 'navbar-brand-text';
    bt.innerHTML = 'MỘC <span>VIỆT</span>';
    if (brand && brand.nextSibling) navInner.insertBefore(bt, brand.nextSibling);
    else if (brand) navInner.appendChild(bt);

    const hl = document.createElement('span');
    hl.className = 'navbar-hotline';
    hl.innerHTML =
      '<img src="/icons/hotline.png" style="width:15px;height:15px;object-fit:contain;vertical-align:middle;margin-right:4px;opacity:.8" alt="">0393 950 301';
    if (bt.nextSibling) navInner.insertBefore(hl, bt.nextSibling);
    else navInner.appendChild(hl);
  }

  const user    = getUser();
  const rightEl = document.getElementById('navbar-right');
  if (!rightEl) return;

  if (!user) {
    rightEl.innerHTML =
      '<a href="/buyer/track.html" class="track-link" title="Tra cứu đơn hàng" style="display:flex;align-items:center;gap:6px"><img src="/icons/clock.png" class="icon-img" style="filter:brightness(0) invert(.5)" alt="">Tra cứu</a>' +
      '<a href="/login.html" class="navbar-login-btn">Đăng nhập</a>' +
      '<a href="/register.html" class="btn btn-outline" style="font-size:13px;padding:9px 20px">Đăng ký</a>';
    return;
  }

  const initials = (user.full_name || user.email).charAt(0).toUpperCase();
  const avatarHtml = user.avatar_url
    ? `<img src="${user.avatar_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover" onerror="this.outerHTML='<div class=\\"avatar\\">${initials}</div>'">`
    : `<div class="avatar">${initials}</div>`;

  let dashLink = '/seller/dashboard.html';
  if (user.role === 'admin')  dashLink = '/admin/shops.html';
  else if (user.role === 'buyer') dashLink = '/buyer/orders.html';

  const cartBtn = user.role === 'buyer'
    ? `<a href="/buyer/cart.html" class="cart-btn" title="Giỏ hàng" style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%"><img src="/icons/cart.png" class="icon-img" style="filter:brightness(0) invert(.4)" alt="cart"><span class="notif-badge cart-badge" id="cart-badge" style="display:none"></span></a>`
    : '';

  const dashBtn = `<a href="${dashLink}" class="notif-btn" title="Dashboard / Quản lý" style="display:flex"><img src="/icons/dashboard.png" class="icon-img" style="filter:brightness(0) invert(.4)" alt="dash"></a>`;

  rightEl.innerHTML =
    cartBtn +
    dashBtn +
    `<div style="position:relative">
      <button class="notif-btn" id="notif-toggle" onclick="toggleNotif()" title="Thông báo">
        <img src="/icons/notification.png" class="icon-img" style="mix-blend-mode:multiply;opacity:0.72" alt="thông báo">
        <span class="notif-badge" id="notif-badge" style="display:none"></span>
      </button>
      <div class="notif-dropdown" id="notif-dropdown">
        <div class="notif-header">
          <span>Thông báo</span>
          <button onclick="markAllRead()" style="font-size:12px;background:none;border:none;color:var(--primary);cursor:pointer;font-weight:600">Đọc tất cả</button>
        </div>
        <div class="notif-list" id="notif-list"></div>
      </div>
    </div>
    <div class="user-menu" id="user-menu">
      <button class="user-btn" onclick="toggleUserMenu()">
        ${avatarHtml}
        <span>${user.full_name || user.email.split('@')[0]}</span> ▾
      </button>
      <div class="user-dropdown" id="user-dropdown">
        ${user.role === 'buyer' ? '<a href="/buyer/wishlist.html"><span style="margin-right:8px">❤️</span> Yêu thích</a>' : ''}
        ${user.role === 'buyer' ? '<a href="/buyer/track.html"><img src="/icons/clock.png" class="icon-img-sm" alt=""> Tra cứu đơn</a>' : ''}
        <button onclick="logout()"><img src="/icons/profile.png" class="icon-img-sm" alt=""> Đăng xuất</button>
      </div>
    </div>`;

  startNotifPolling(renderNotifDropdown);
  if (user.role === 'buyer') updateCartBadge();

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#notif-toggle') && !e.target.closest('#notif-dropdown'))
      document.getElementById('notif-dropdown')?.classList.remove('open');
    if (!e.target.closest('#user-menu'))
      document.getElementById('user-dropdown')?.classList.remove('open');
  });
}

function toggleNotif() {
  document.getElementById('notif-dropdown')?.classList.toggle('open');
  document.getElementById('user-dropdown')?.classList.remove('open');
}
function toggleUserMenu() {
  document.getElementById('user-dropdown')?.classList.toggle('open');
  document.getElementById('notif-dropdown')?.classList.remove('open');
}
async function markAllRead() {
  await api.patch('/api/notifications/read-all');
  const data = await api.get('/api/notifications');
  if (data) renderNotifDropdown(data);
}

function initDashNotif() {
  startNotifPolling(renderNotifDropdown);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#notif-toggle') && !e.target.closest('#notif-dropdown'))
      document.getElementById('notif-dropdown')?.classList.remove('open');
  });
}
