require('dotenv').config();
const express      = require('express');
const http         = require('http');
const path         = require('path');
const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const multer       = require('multer');
const cors         = require('cors');
const fs2          = require('fs');
const WebSocket    = require('ws');
const ExcelJS      = require('exceljs');
const nodemailer   = require('nodemailer');
const { initDatabase, query, queryOne, getPool } = require('./database');

let googleClient = null;
try {
  const { OAuth2Client } = require('google-auth-library');
  if (process.env.GOOGLE_CLIENT_ID) googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
} catch {}

// ── Gmail transporter
let mailer = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  });
  mailer.verify(err => {
    if (err) console.warn('⚠️  Gmail không kết nối được:', err.message);
    else     console.log('✅ Gmail sẵn sàng gửi thông báo');
  });
}

function fmtVND(n) {
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

async function sendOrderEmail(customer, items) {
  if (!mailer) return;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
  const firstProductName = items[0].product_name;
  const subject = `[Mộc Việt] Đơn hàng mới từ ${customer.full_name} — ${items.length > 1 ? `${items.length} mặt hàng` : firstProductName}`;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee">
        <div style="font-weight:600;color:#333">${item.product_name}</div>
        ${item.variant_name ? `<div style="font-size:12px;color:#888">Loại: ${item.variant_name}</div>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${fmtVND(item.total_price)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
      <div style="background:#5D7A3E;padding:24px;color:#fff;text-align:center">
        <h2 style="margin:0;font-size:22px;letter-spacing:1px">🛍️ ĐƠN HÀNG MỚI</h2>
        <div style="font-size:14px;opacity:0.8;margin-top:4px">Mộc Việt — Đồ gỗ & Thủ công mỹ nghệ</div>
      </div>
      <div style="padding:30px">
        <div style="margin-bottom:24px">
          <h3 style="font-size:16px;color:#5D7A3E;border-bottom:2px solid #5D7A3E;display:inline-block;padding-bottom:4px;margin-bottom:12px">Thông tin khách hàng</h3>
          <table style="width:100%;font-size:14px">
            <tr><td style="color:#888;width:120px;padding:4px 0">Khách hàng:</td><td style="font-weight:600">${customer.full_name}</td></tr>
            <tr><td style="color:#888;padding:4px 0">Điện thoại:</td><td style="font-weight:600">${customer.phone}</td></tr>
            <tr><td style="color:#888;padding:4px 0">Địa chỉ:</td><td>${customer.address}</td></tr>
            ${customer.note ? `<tr><td style="color:#888;padding:4px 0">Ghi chú:</td><td style="font-style:italic;color:#555">${customer.note}</td></tr>` : ''}
          </table>
        </div>

        <div style="margin-bottom:24px">
          <h3 style="font-size:16px;color:#5D7A3E;border-bottom:2px solid #5D7A3E;display:inline-block;padding-bottom:4px;margin-bottom:12px">Chi tiết sản phẩm</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="color:#888;font-size:12px;text-transform:uppercase">
                <th style="text-align:left;padding-bottom:8px">Sản phẩm</th>
                <th style="text-align:center;padding-bottom:8px">SL</th>
                <th style="text-align:right;padding-bottom:8px">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding-top:16px;font-weight:700;font-size:16px;text-align:right">TỔNG CỘNG:</td>
                <td style="padding-top:16px;font-weight:700;font-size:18px;color:#5D7A3E;text-align:right">${fmtVND(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="text-align:center;margin-top:30px">
          <a href="http://localhost:${process.env.PORT||3000}/admin/shops.html"
             style="background:#5D7A3E;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">
            Quản lý đơn hàng →
          </a>
        </div>
      </div>
      <div style="background:#f9f9f9;padding:15px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee">
        © 2026 Mộc Việt · Thông báo tự động từ hệ thống quản trị.
      </div>
    </div>`;

  try {
    await mailer.sendMail({ from: `"Mộc Việt" <${process.env.GMAIL_USER}>`, to: adminEmail, subject, html });
  } catch (err) {
    console.warn('⚠️  Gửi email thất bại:', err.message);
  }
}

const app     = express();
const PORT    = process.env.PORT       || 3000;
const JWT_SEC = process.env.JWT_SECRET || 'mocviet_jwt_secret_2026';

app.use(cors()); app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs2.existsSync(uploadDir)) fs2.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ── HTTP server + WebSocket
const server    = http.createServer(app);
const wss       = new WebSocket.Server({ server, path: '/ws' });
const wsClients = new Map(); // userId → Set<WebSocket>

wss.on('connection', (ws, req) => {
  try {
    const url   = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) { ws.close(); return; }
    const decoded = jwt.verify(token, JWT_SEC);
    const uid = decoded.id;
    if (!wsClients.has(uid)) wsClients.set(uid, new Set());
    wsClients.get(uid).add(ws);
    ws.on('close', () => {
      wsClients.get(uid)?.delete(ws);
      if (wsClients.get(uid)?.size === 0) wsClients.delete(uid);
    });
    ws.send(JSON.stringify({ type: 'connected' }));
  } catch { ws.close(); }
});

function notifyUser(userId, payload) {
  const conns = wsClients.get(Number(userId));
  if (!conns) return;
  const msg = JSON.stringify({ type: 'notification', ...payload });
  for (const ws of conns) if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

function notifyAll(payload) {
  const msg = JSON.stringify({ type: 'notification', ...payload });
  for (const [, conns] of wsClients)
    for (const ws of conns) if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

// ── Auth middleware
function auth(req, res, next) {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' });
  try { req.user = jwt.verify(token, JWT_SEC); next(); }
  catch { res.status(401).json({ message: 'Phiên đăng nhập hết hạn' }); }
}
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) { try { req.user = jwt.verify(token, JWT_SEC); } catch {} }
  next();
}
function sellerAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'seller' && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Cần quyền Seller' });
    next();
  });
}
function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Cần quyền Admin' });
    next();
  });
}

// ── Config
app.get('/api/auth/config', (req, res) => {
  res.json({ google_client_id: process.env.GOOGLE_CLIENT_ID || null });
});

// ── Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    const user = await queryOne('SELECT * FROM users WHERE email=$1', [email]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    if (user.is_active === false)
      return res.status(403).json({ message: 'Tài khoản đã bị khoá. Vui lòng liên hệ Admin.' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SEC, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_url: user.avatar_url } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role, shop_name, shop_description } = req.body;
    const requestSeller = role === 'seller';
    if (!email || !password) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    if (requestSeller && !shop_name) return res.status(400).json({ message: 'Vui lòng nhập tên shop' });
    if (await queryOne('SELECT id FROM users WHERE email=$1', [email]))
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    const hashed = bcrypt.hashSync(password, 10);
    const user = await queryOne(
      "INSERT INTO users(email,password,role,full_name,phone) VALUES($1,$2,'buyer',$3,$4) RETURNING id",
      [email, hashed, full_name||null, phone||null]);
    if (requestSeller) {
      await query('INSERT INTO shops(user_id,name,description,status) VALUES($1,$2,$3,$4)',
        [user.id, shop_name, shop_description||'', 'pending']);
      return res.json({ success: true, message: 'Đăng ký thành công! Đơn đăng ký Người bán đang chờ Admin duyệt. Bạn sẽ nhận thông báo khi được phê duyệt.' });
    }
    res.json({ success: true, message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Google OAuth
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!googleClient) return res.status(501).json({ message: 'Google login chưa được cấu hình' });
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name, picture, sub: google_id } = ticket.getPayload();
    let user = await queryOne('SELECT * FROM users WHERE google_id=$1 OR email=$2', [google_id, email]);
    if (!user) {
      user = await queryOne(
        'INSERT INTO users(email,password,role,full_name,google_id,avatar_url) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
        [email, '', 'buyer', name, google_id, picture]);
    } else if (!user.google_id) {
      await query('UPDATE users SET google_id=$1,avatar_url=$2 WHERE id=$3', [google_id, picture, user.id]);
      user = await queryOne('SELECT * FROM users WHERE id=$1', [user.id]);
    }
    if (user.is_active === false) return res.status(403).json({ message: 'Tài khoản đã bị khoá' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SEC, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_url: user.avatar_url } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await queryOne('SELECT id,email,role,full_name,phone,is_active,avatar_url FROM users WHERE id=$1', [req.user.id]);
    const shop = (req.user.role === 'seller' || req.user.role === 'admin')
      ? await queryOne('SELECT * FROM shops WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id])
      : null;
    res.json({ user, shop });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { full_name, phone, email, current_password, new_password } = req.body;
    const setClauses = ['full_name=$1', 'phone=$2'];
    const params     = [full_name||null, phone||null];

    if (email && email !== req.user.email) {
      const dup = await queryOne('SELECT id FROM users WHERE email=$1 AND id!=$2', [email, req.user.id]);
      if (dup) return res.status(409).json({ message: 'Email đã được sử dụng bởi tài khoản khác' });
      params.push(email); setClauses.push(`email=$${params.length}`);
    }

    if (new_password) {
      if (!current_password) return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại' });
      const row = await queryOne('SELECT password FROM users WHERE id=$1', [req.user.id]);
      const ok  = await bcrypt.compare(current_password, row.password);
      if (!ok) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
      if (new_password.length < 6) return res.status(400).json({ message: 'Mật khẩu mới phải ít nhất 6 ký tự' });
      params.push(await bcrypt.hash(new_password, 10));
      setClauses.push(`password=$${params.length}`);
    }

    params.push(req.user.id);
    await query(`UPDATE users SET ${setClauses.join(',')} WHERE id=$${params.length}`, params);
    const updated = await queryOne('SELECT id,email,role,full_name,phone,avatar_url FROM users WHERE id=$1', [req.user.id]);
    res.json({ success: true, user: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Categories (dynamic, DB-backed)
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await query('SELECT id, value, label, sort_order, created_by_name FROM categories ORDER BY sort_order ASC, id ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

function categoryPost(auth) {
  return [auth, async (req, res) => {
    try {
      const { value, label } = req.body;
      if (!value || !label) return res.status(400).json({ message: 'Vui lòng nhập value và tên danh mục' });
      const slug = value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!slug) return res.status(400).json({ message: 'Giá trị slug không hợp lệ (chỉ dùng a-z, 0-9, dấu gạch ngang)' });
      const exists = await queryOne('SELECT id FROM categories WHERE value=$1', [slug]);
      if (exists) return res.status(409).json({ message: 'Danh mục đã tồn tại' });
      const maxOrder = await queryOne('SELECT COALESCE(MAX(sort_order),0) AS m FROM categories');
      const byName = req.user.full_name || req.user.email;
      const row = await queryOne(
        'INSERT INTO categories(value, label, sort_order, created_by_name) VALUES($1,$2,$3,$4) RETURNING *',
        [slug, label.trim(), (maxOrder?.m || 0) + 1, byName]);
      res.json({ success: true, category: row });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }];
}

function categoryPatch(auth) {
  return [auth, async (req, res) => {
    try {
      const { label } = req.body;
      if (!label?.trim()) return res.status(400).json({ message: 'Tên danh mục không được để trống' });
      const cat = await queryOne('SELECT id FROM categories WHERE id=$1', [req.params.id]);
      if (!cat) return res.status(404).json({ message: 'Danh mục không tồn tại' });
      await query('UPDATE categories SET label=$1 WHERE id=$2', [label.trim(), req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }];
}

function categoryDelete(auth) {
  return [auth, async (req, res) => {
    try {
      const cat = await queryOne('SELECT * FROM categories WHERE id=$1', [req.params.id]);
      if (!cat) return res.status(404).json({ message: 'Danh mục không tồn tại' });
      const inUse = await queryOne('SELECT COUNT(*)::int AS c FROM products WHERE category=$1 AND is_deleted=false', [cat.value]);
      if (inUse?.c > 0) return res.status(400).json({ message: `Không thể xoá — có ${inUse.c} sản phẩm đang dùng danh mục này` });
      await query('DELETE FROM categories WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }];
}

app.post('/api/admin/categories',  ...categoryPost(adminAuth));
app.patch('/api/admin/categories/:id', ...categoryPatch(adminAuth));
app.delete('/api/admin/categories/:id', ...categoryDelete(adminAuth));

app.post('/api/seller/categories',  ...categoryPost(sellerAuth));
app.patch('/api/seller/categories/:id', ...categoryPatch(sellerAuth));
app.delete('/api/seller/categories/:id', ...categoryDelete(sellerAuth));

// ── Products (public)
app.get('/api/products', optionalAuth, async (req, res) => {
  try {
    const { search, shop_id, category, min_price, max_price, page=1, limit=24, sort } = req.query;
    const params = [];
    const conds = ["p.is_hidden=false","p.is_deleted=false","s.status='approved'"];
    if (search)    { params.push('%'+search+'%'); conds.push('p.name ILIKE $'+params.length); }
    if (shop_id)   { params.push(shop_id);        conds.push('p.shop_id=$'+params.length); }
    if (category)  { params.push(category);       conds.push('p.category=$'+params.length); }
    if (min_price) { params.push(Number(min_price)); conds.push('p.price>=$'+params.length); }
    if (max_price) { params.push(Number(max_price)); conds.push('p.price<=$'+params.length); }
    const where = conds.join(' AND ');
    const ord = sort==='price_asc' ? 'p.price ASC' : sort==='price_desc' ? 'p.price DESC' : 'p.created_at DESC';
    const pg = Math.max(1,parseInt(page)), lm = Math.min(48,Math.max(1,parseInt(limit)));
    params.push(lm); params.push((pg-1)*lm);
    const countRow = await queryOne('SELECT COUNT(*)::int AS total FROM products p JOIN shops s ON p.shop_id=s.id WHERE '+where, params.slice(0,-2));
    const rows = await query(
      'SELECT p.*, s.name AS shop_name, d.discount_percent, d.discounted_price, d.end_time AS deal_end_time '+
      'FROM products p JOIN shops s ON p.shop_id=s.id '+
      'LEFT JOIN deals d ON d.product_id=p.id AND d.start_time<=NOW() AND d.end_time>=NOW() '+
      'WHERE '+where+' ORDER BY '+ord+' LIMIT $'+(params.length-1)+' OFFSET $'+params.length, params);
    res.json({ products: rows, total: countRow.total, page: pg, limit: lm });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/products/:id', optionalAuth, async (req, res) => {
  try {
    const product = await queryOne(
      'SELECT p.*, s.name AS shop_name, s.id AS shop_id_val, s.hotline AS shop_hotline, s.delivery_days, '+
      'u.phone AS seller_phone, '+
      'd.discount_percent, d.discounted_price, d.end_time AS deal_end_time '+
      'FROM products p JOIN shops s ON p.shop_id=s.id JOIN users u ON s.user_id=u.id '+
      'LEFT JOIN deals d ON d.product_id=p.id AND d.start_time<=NOW() AND d.end_time>=NOW() '+
      'WHERE p.id=$1 AND p.is_hidden=false AND p.is_deleted=false', [req.params.id]);
    if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    const reviewStats = await queryOne(
      'SELECT ROUND(AVG(rating)::numeric,1) AS avg_rating, COUNT(*)::int AS review_count FROM reviews WHERE product_id=$1',
      [product.id]);
    let isFav = false;
    if (req.user) {
      const f = await queryOne('SELECT id FROM favorites WHERE user_id=$1 AND product_id=$2', [req.user.id, product.id]);
      isFav = !!f;
    }
    res.json({
      ...product,
      is_favorite: isFav,
      avg_rating:   reviewStats?.avg_rating   ? Number(reviewStats.avg_rating)   : null,
      review_count: reviewStats?.review_count ?? 0,
      hotline:      product.shop_hotline || product.seller_phone || null,
      delivery_days: product.delivery_days || '2-4',
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Reviews
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || '10'), 50);
    const offset = parseInt(req.query.offset || '0');
    const rows = await query(
      'SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS author '+
      'FROM reviews r LEFT JOIN users u ON r.user_id=u.id '+
      'WHERE r.product_id=$1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3',
      [req.params.id, limit, offset]);
    const stats = await queryOne(
      'SELECT ROUND(AVG(rating)::numeric,1) AS avg_rating, COUNT(*)::int AS total FROM reviews WHERE product_id=$1',
      [req.params.id]);
    res.json({ reviews: rows, avg_rating: stats?.avg_rating ? Number(stats.avg_rating) : null, total: stats?.total ?? 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { product_id, order_id, rating, comment } = req.body;
    if (!product_id || !rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Đánh giá không hợp lệ (1-5 sao)' });
    const existing = await queryOne('SELECT id FROM reviews WHERE product_id=$1 AND user_id=$2', [product_id, req.user.id]);
    if (existing) return res.status(409).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
    if (order_id) {
      const ord = await queryOne('SELECT id FROM orders WHERE id=$1 AND user_id=$2 AND product_id=$3', [order_id, req.user.id, product_id]);
      if (!ord) return res.status(403).json({ message: 'Bạn chưa mua sản phẩm này' });
    }
    const row = await queryOne(
      'INSERT INTO reviews(product_id,user_id,order_id,rating,comment) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [product_id, req.user.id, order_id || null, rating, comment || '']);
    res.json({ success: true, review: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Seller products
app.get('/api/seller/products', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1 AND status=\'approved\' LIMIT 1', [req.user.id]);
    if (!shop) return res.json([]);
    res.json(await query('SELECT * FROM products WHERE shop_id=$1 AND is_deleted=false ORDER BY created_at DESC', [shop.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/seller/products', sellerAuth, upload.any(), async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1 AND status=\'approved\' LIMIT 1', [req.user.id]);
    if (!shop) return res.status(403).json({ message: 'Shop chưa được duyệt' });
    const { name, description, category, is_hidden } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên sản phẩm là bắt buộc' });

    let variants = [];
    try { variants = JSON.parse(req.body.variants || '[]'); } catch(e) {}

    const files = req.files || [];
    // Collect up to 5 product images (product_image_0..4), fallback to legacy 'image' field
    const imgArr = [];
    for (let i = 0; i < 5; i++) {
      const f = files.find(f => f.fieldname === `product_image_${i}`);
      if (f) imgArr[i] = '/uploads/' + f.filename;
    }
    const legacyFile = files.find(f => f.fieldname === 'image');
    if (legacyFile && !imgArr[0]) imgArr[0] = '/uploads/' + legacyFile.filename;
    const images = imgArr.filter(Boolean);
    const imageUrl = images[0] || null;

    for (const file of files) {
      if (file.fieldname.startsWith('variant_image_')) {
        const idx = parseInt(file.fieldname.replace('variant_image_', ''));
        if (variants[idx]) variants[idx].image_url = '/uploads/' + file.filename;
      }
    }

    let price, stock;
    if (variants.length > 0) {
      price = Math.min(...variants.map(v => parseFloat(v.price) || 0));
      stock = variants.reduce((s, v) => s + (parseInt(v.quantity) || 0), 0);
    } else {
      price = parseFloat(req.body.price) || 0;
      stock = parseInt(req.body.stock_quantity) || 0;
    }
    if (!price || price < 1) return res.status(400).json({ message: 'Giá sản phẩm không hợp lệ' });

    const isHidden = req.body.is_hidden === '1' || req.body.is_hidden === 'true';
    const row = await queryOne(
      'INSERT INTO products(shop_id,name,price,description,image_url,category,stock_quantity,is_hidden,variants,images) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [shop.id, name, price, description||'', imageUrl, category||'khac', stock, isHidden, JSON.stringify(variants), JSON.stringify(images)]);
    res.json({ success: true, product: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/seller/products/:id', sellerAuth, upload.any(), async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1', [req.user.id]);
    const product = await queryOne('SELECT * FROM products WHERE id=$1 AND shop_id=$2', [req.params.id, shop?.id]);
    if (!product) return res.status(403).json({ message: 'Không có quyền chỉnh sửa' });
    const { name, description, category } = req.body;

    let variants = [];
    try { variants = JSON.parse(req.body.variants || '[]'); } catch(e) {}

    const files = req.files || [];
    // Collect up to 5 product images; if none uploaded, keep existing
    const imgArr = [];
    for (let i = 0; i < 5; i++) {
      const f = files.find(f => f.fieldname === `product_image_${i}`);
      if (f) imgArr[i] = '/uploads/' + f.filename;
    }
    const legacyFile = files.find(f => f.fieldname === 'image');
    if (legacyFile && !imgArr[0]) imgArr[0] = '/uploads/' + legacyFile.filename;
    const newImages = imgArr.filter(Boolean);
    const existingImages = Array.isArray(product.images) ? product.images : (product.image_url ? [product.image_url] : []);
    const images = newImages.length > 0 ? newImages : existingImages;
    const imageUrl = images[0] || product.image_url;

    for (const file of files) {
      if (file.fieldname.startsWith('variant_image_')) {
        const idx = parseInt(file.fieldname.replace('variant_image_', ''));
        if (variants[idx]) variants[idx].image_url = '/uploads/' + file.filename;
      }
    }

    let price, stock;
    if (variants.length > 0) {
      price = Math.min(...variants.map(v => parseFloat(v.price) || 0));
      stock = variants.reduce((s, v) => s + (parseInt(v.quantity) || 0), 0);
    } else {
      price = parseFloat(req.body.price) || product.price;
      stock = parseInt(req.body.stock_quantity) || product.stock_quantity;
    }

    const isHidden = req.body.is_hidden === '1' || req.body.is_hidden === 'true';
    await query(
      'UPDATE products SET name=$1,price=$2,description=$3,image_url=$4,category=$5,stock_quantity=$6,is_hidden=$7,variants=$8,images=$9,updated_at=NOW() WHERE id=$10',
      [name||product.name, price, description??product.description,
       imageUrl, category||product.category, stock, isHidden, JSON.stringify(variants), JSON.stringify(images), req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/seller/products/:id/hide', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1', [req.user.id]);
    const product = await queryOne('SELECT * FROM products WHERE id=$1 AND shop_id=$2', [req.params.id, shop?.id]);
    if (!product) return res.status(403).json({ message: 'Không có quyền' });
    await query('UPDATE products SET is_hidden=$1 WHERE id=$2', [!product.is_hidden, req.params.id]);
    res.json({ success: true, is_hidden: !product.is_hidden });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/seller/products/:id', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1', [req.user.id]);
    await query('UPDATE products SET is_deleted=true, deleted_at=NOW() WHERE id=$1 AND shop_id=$2', [req.params.id, shop?.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Seller shop
app.get('/api/seller/shop', sellerAuth, async (req, res) => {
  try {
    res.json(await queryOne('SELECT * FROM shops WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/seller/shop', sellerAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Vui lòng nhập tên shop' });
    const existing = await queryOne("SELECT * FROM shops WHERE user_id=$1 AND status IN ('pending','approved')", [req.user.id]);
    if (existing) return res.status(400).json({ message: 'Bạn đã có shop đang hoạt động hoặc chờ duyệt' });
    await query('INSERT INTO shops(user_id,name,description,status) VALUES($1,$2,$3,$4)',
      [req.user.id, name.trim(), description||'', 'pending']);
    res.json({ success: true, message: 'Đã gửi đăng ký shop! Vui lòng chờ Admin duyệt.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/seller/shop', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne("SELECT * FROM shops WHERE user_id=$1 AND status='approved' LIMIT 1", [req.user.id]);
    if (!shop) return res.status(403).json({ message: 'Shop chưa được duyệt' });
    const { name, description, hotline, delivery_days } = req.body;
    await query(
      'UPDATE shops SET name=COALESCE($1,name), description=COALESCE($2,description), hotline=$3, delivery_days=COALESCE($4,delivery_days) WHERE id=$5',
      [name?.trim()||null, description||null, hotline||null, delivery_days||null, shop.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Cart
app.get('/api/cart', auth, async (req, res) => {
  try {
    res.json(await query(
      'SELECT ci.id, ci.quantity, ci.product_id, p.name, p.price, p.image_url, p.stock_quantity, p.category, '+
      's.name AS shop_name, d.discount_percent, d.discounted_price '+
      'FROM cart_items ci JOIN products p ON ci.product_id=p.id JOIN shops s ON p.shop_id=s.id '+
      'LEFT JOIN deals d ON d.product_id=p.id AND d.start_time<=NOW() AND d.end_time>=NOW() '+
      'WHERE ci.user_id=$1 AND p.is_deleted=false ORDER BY ci.created_at DESC', [req.user.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/cart', auth, async (req, res) => {
  try {
    const { product_id, quantity=1 } = req.body;
    const product = await queryOne('SELECT * FROM products WHERE id=$1 AND is_deleted=false AND is_hidden=false', [product_id]);
    if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    if (product.stock_quantity < 1) return res.status(400).json({ message: 'Sản phẩm đã hết hàng' });
    await query('INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=cart_items.quantity+EXCLUDED.quantity',
      [req.user.id, product_id, parseInt(quantity)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/cart/:id', auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ message: 'Số lượng không hợp lệ' });
    await query('UPDATE cart_items SET quantity=$1 WHERE id=$2 AND user_id=$3', [quantity, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/cart/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/cart', auth, async (req, res) => {
  try {
    await query('DELETE FROM cart_items WHERE user_id=$1', [req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Favorites
app.get('/api/favorites', auth, async (req, res) => {
  try {
    res.json(await query(
      'SELECT f.id, f.product_id, f.created_at, p.name, p.price, p.image_url, p.stock_quantity, p.category, '+
      's.name AS shop_name, d.discount_percent, d.discounted_price '+
      'FROM favorites f JOIN products p ON f.product_id=p.id JOIN shops s ON p.shop_id=s.id '+
      'LEFT JOIN deals d ON d.product_id=p.id AND d.start_time<=NOW() AND d.end_time>=NOW() '+
      'WHERE f.user_id=$1 AND p.is_deleted=false ORDER BY f.created_at DESC', [req.user.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/favorites/:product_id', auth, async (req, res) => {
  try {
    const existing = await queryOne('SELECT id FROM favorites WHERE user_id=$1 AND product_id=$2', [req.user.id, req.params.product_id]);
    if (existing) { await query('DELETE FROM favorites WHERE id=$1', [existing.id]); return res.json({ success: true, action: 'removed' }); }
    await query('INSERT INTO favorites(user_id,product_id) VALUES($1,$2)', [req.user.id, req.params.product_id]);
    res.json({ success: true, action: 'added' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Orders
app.post('/api/orders', optionalAuth, async (req, res) => {
  try {
    const { product_id, full_name, phone, address, note, items } = req.body;
    const qtySingle = req.body.quantity; 
    const variantSingle = req.body.variant_name;

    if (!full_name || !phone || !address)
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    if (!/^0[3-9]\d{8}$/.test(phone))
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });

    // Normalize to an array of items
    let orderItems = [];
    if (Array.isArray(items) && items.length > 0) {
      orderItems = items;
    } else if (product_id && qtySingle) {
      orderItems = [{ product_id, variant_name: variantSingle, quantity: qtySingle }];
    } else {
      return res.status(400).json({ message: 'Thông tin đơn hàng không hợp lệ' });
    }

    const userId = req.user ? req.user.id : null;
    const createdOrders = [];

    for (const item of orderItems) {
      const pid = item.product_id || product_id;
      const q = parseInt(item.quantity) || 0;
      if (q <= 0) continue;

      const product = await queryOne(
        'SELECT p.*, s.user_id AS seller_id FROM products p JOIN shops s ON p.shop_id=s.id WHERE p.id=$1 AND p.is_hidden=false AND p.is_deleted=false',
        [pid]);
      if (!product) continue;

      let unitPrice = Number(product.price);
      let stock = parseInt(product.stock_quantity);
      if (item.variant_name && Array.isArray(product.variants)) {
        const v = product.variants.find(x => x.name === item.variant_name);
        if (v) {
          unitPrice = Number(v.price);
          stock = parseInt(v.quantity);
        }
      }

      if (stock < q) throw new Error(`Sản phẩm "${product.name}" (${item.variant_name||''}) chỉ còn ${stock} trong kho`);

      const activeDeal = await queryOne('SELECT * FROM deals WHERE product_id=$1 AND start_time<=NOW() AND end_time>=NOW()', [pid]);
      if (activeDeal) unitPrice = Number(activeDeal.discounted_price);

      const totalPrice = unitPrice * q;
      const order = await queryOne(
        'INSERT INTO orders(user_id,product_id,shop_id,full_name,phone,address,quantity,unit_price,total_price,note,variant_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
        [userId, pid, product.shop_id, full_name, phone, address, q, unitPrice, totalPrice, note||'', item.variant_name || null]);
      
      createdOrders.push({ id: order.id, total_price: totalPrice, product_name: product.name, seller_id: product.seller_id });

      // Update stock
      await query('UPDATE products SET stock_quantity=stock_quantity-$1 WHERE id=$2', [q, pid]);
      if (item.variant_name && Array.isArray(product.variants)) {
        const updatedVars = product.variants.map(v => {
          if (v.name === item.variant_name) return { ...v, quantity: Math.max(0, parseInt(v.quantity) - q) };
          return v;
        });
        await query('UPDATE products SET variants=$1 WHERE id=$2', [JSON.stringify(updatedVars), pid]);
      }
    }

    if (createdOrders.length === 0) return res.status(400).json({ message: 'Không có sản phẩm nào được đặt' });

    // Notify sellers (consolidated if same seller, but here we do simple per-order for notifications)
    for (const o of createdOrders) {
      const msg = `🛍️ Đơn mới #${o.id}: ${o.product_name} từ ${full_name}`;
      const nr = await queryOne('INSERT INTO notifications(user_id,order_id,message) VALUES($1,$2,$3) RETURNING id,created_at', [o.seller_id, o.id, msg]);
      notifyUser(o.seller_id, { id: nr.id, order_id: o.id, message: msg, is_read: false, created_at: nr.created_at });
    }

    // Gửi email thông báo tới admin (non-blocking)
    sendOrderEmail({ full_name, phone, address, note }, createdOrders);

    res.json({ success: true, order_id: createdOrders[0].id, total_orders: createdOrders.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/buyer/orders', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const params = [req.user.id]; let where = 'o.user_id=$1';
    if (status && status !== 'all') { params.push(status); where += ' AND o.status=$'+params.length; }
    res.json(await query(
      'SELECT o.*, p.name AS product_name, p.image_url, s.name AS shop_name '+
      'FROM orders o JOIN products p ON o.product_id=p.id JOIN shops s ON o.shop_id=s.id '+
      'WHERE '+where+' ORDER BY o.created_at DESC', params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/seller/orders', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    if (!shop) return res.json([]);
    const { status } = req.query; const params = [shop.id]; let where = 'o.shop_id=$1';
    if (status && status !== 'all') { params.push(status); where += ' AND o.status=$'+params.length; }
    res.json(await query(
      'SELECT o.*, p.name AS product_name, p.image_url FROM orders o JOIN products p ON o.product_id=p.id WHERE '+where+' ORDER BY o.created_at DESC', params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/seller/orders/export', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    if (!shop) return res.status(404).json({ message: 'Không tìm thấy shop' });
    const { status, period } = req.query;
    const params = [shop.id]; let where = 'o.shop_id=$1';
    if (status && status !== 'all') { params.push(status); where += ' AND o.status=$' + params.length; }

    // Period filter
    let periodLabel = 'tat-ca';
    let periodSheetLabel = 'Tất cả thời gian';
    if (period === 'week') {
      where += ` AND o.created_at >= NOW() - INTERVAL '7 days'`;
      periodLabel = '7-ngay-qua'; periodSheetLabel = '7 ngày qua';
    } else if (period === 'month') {
      where += ` AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', NOW())`;
      periodLabel = 'thang-nay'; periodSheetLabel = 'Tháng này';
    } else if (period === 'quarter') {
      where += ` AND DATE_TRUNC('quarter', o.created_at) = DATE_TRUNC('quarter', NOW())`;
      periodLabel = 'quy-nay'; periodSheetLabel = 'Quý này';
    }

    const rows = await query(
      'SELECT o.id, o.created_at, o.full_name, o.phone, o.address, p.name AS product_name, ' +
      'o.variant_name, o.quantity, o.unit_price, o.total_price, o.status, o.note ' +
      'FROM orders o JOIN products p ON o.product_id=p.id ' +
      'WHERE ' + where + ' ORDER BY o.created_at DESC', params);

    const STATUS_VI = { pending:'Chờ xác nhận', approved:'Đã duyệt', shipping:'Đang giao', completed:'Hoàn thành', rejected:'Từ chối' };
    const wb = new ExcelJS.Workbook(); wb.creator = 'Mộc Việt';
    const statusLabel = status && status !== 'all' ? `${STATUS_VI[status]||status} - ` : '';
    const ws = wb.addWorksheet(`${statusLabel}${periodSheetLabel}`.slice(0,31));
    ws.columns = [
      { header: 'Mã đơn',       key: 'id',           width: 10 },
      { header: 'Ngày đặt',     key: 'date',          width: 20 },
      { header: 'Khách hàng',   key: 'full_name',     width: 22 },
      { header: 'SĐT',          key: 'phone',         width: 14 },
      { header: 'Địa chỉ',      key: 'address',       width: 35 },
      { header: 'Sản phẩm',          key: 'product_name',  width: 30 },
      { header: 'Kích thước / Loại', key: 'variant_name',  width: 20 },
      { header: 'SL',               key: 'quantity',      width: 6  },
      { header: 'Đơn giá (đ)',      key: 'unit_price',    width: 16 },
      { header: 'Tổng tiền (đ)',    key: 'total_price',   width: 16 },
      { header: 'Trạng thái',       key: 'status_vi',     width: 16 },
      { header: 'Ghi chú',          key: 'note',          width: 25 },
    ];
    const hdr = ws.getRow(1);
    hdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5E3C' } };
    hdr.alignment = { horizontal: 'center', vertical: 'middle' };
    hdr.height = 22;
    rows.forEach(r => {
      ws.addRow({
        id: r.id,
        date: new Date(r.created_at).toLocaleString('vi-VN'),
        full_name: r.full_name, phone: r.phone, address: r.address,
        product_name: r.product_name, variant_name: r.variant_name || '', quantity: r.quantity,
        unit_price: Number(r.unit_price), total_price: Number(r.total_price),
        status_vi: STATUS_VI[r.status] || r.status,
        note: r.note || '',
      });
    });
    const grandTotal = rows.reduce((s, r) => s + Number(r.total_price), 0);
    const totalRow = ws.addRow({ id:'', date:'', full_name:'', phone:'', address:'', product_name:'TỔNG CỘNG', variant_name:'', quantity: rows.reduce((s,r)=>s+r.quantity,0), unit_price:'', total_price: grandTotal, status_vi:'', note:'' });
    totalRow.font = { bold: true };
    totalRow.getCell('total_price').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
    ['unit_price','total_price'].forEach(k => { ws.getColumn(k).numFmt = '#,##0'; });
    const statusSlug = status && status !== 'all' ? status : 'tat-ca';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="don-hang-${statusSlug}-${periodLabel}.xlsx"`);
    await wb.xlsx.write(res);
  } catch (err) { res.status(500).json({ message: err.message }); }
});


app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    const { status } = req.query; const params = []; let where = '1=1';
    if (status && status !== 'all') { params.push(status); where += ' AND o.status=$'+params.length; }
    res.json(await query(
      'SELECT o.*, p.name AS product_name, s.name AS shop_name '+
      'FROM orders o JOIN products p ON o.product_id=p.id JOIN shops s ON o.shop_id=s.id '+
      'WHERE '+where+' ORDER BY o.created_at DESC', params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

const VALID_TRANSITIONS = { pending:['approved','rejected'], approved:['shipping'], shipping:['completed'], rejected:[], completed:[] };

app.patch('/api/orders/:id/status', auth, async (req, res) => {
  try {
    const { new_status } = req.body;
    const order = await queryOne('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    if (!(VALID_TRANSITIONS[order.status]||[]).includes(new_status))
      return res.status(400).json({ message: 'Không thể chuyển trạng thái này' });
    if (new_status === 'rejected')
      await query('UPDATE products SET stock_quantity=stock_quantity+$1 WHERE id=$2', [order.quantity, order.product_id]);
    await query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2', [new_status, order.id]);
    if (order.user_id) {
      const msgs = {
        approved:  `✅ Đơn hàng #${order.id} đã được xác nhận!`,
        rejected:  `❌ Đơn hàng #${order.id} đã bị từ chối.`,
        shipping:  `🚚 Đơn hàng #${order.id} đang được giao hàng!`,
        completed: `🎉 Đơn hàng #${order.id} đã hoàn thành!`
      };
      if (msgs[new_status]) {
        const notifRow = await queryOne(
          'INSERT INTO notifications(user_id,order_id,message) VALUES($1,$2,$3) RETURNING id,created_at',
          [order.user_id, order.id, msgs[new_status]]);
        notifyUser(order.user_id, { id: notifRow.id, order_id: order.id, message: msgs[new_status], is_read: false, created_at: notifRow.created_at });
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Guest order tracking
app.get('/api/orders/track', async (req, res) => {
  try {
    const { order_id, phone } = req.query;
    if (!order_id || !phone) return res.status(400).json({ message: 'Vui lòng nhập mã đơn và số điện thoại' });
    const order = await queryOne(
      'SELECT o.*, p.name AS product_name, p.image_url, s.name AS shop_name '+
      'FROM orders o JOIN products p ON o.product_id=p.id JOIN shops s ON o.shop_id=s.id '+
      'WHERE o.id=$1 AND o.phone=$2', [order_id, phone]);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng với thông tin này' });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin shops
app.get('/api/admin/shops', adminAuth, async (req, res) => {
  try {
    const { status } = req.query; const params = []; let where = '1=1';
    if (status) { params.push(status); where += ' AND s.status=$'+params.length; }
    res.json(await query('SELECT s.*, u.email AS seller_email, u.full_name AS seller_name FROM shops s JOIN users u ON s.user_id=u.id WHERE '+where+' ORDER BY s.created_at DESC', params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/admin/shops/:id/approve', adminAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE id=$1', [req.params.id]);
    if (!shop) return res.status(404).json({ message: 'Shop không tồn tại' });
    await query("UPDATE shops SET status='approved' WHERE id=$1", [req.params.id]);
    await query("UPDATE users SET role='seller' WHERE id=$1 AND role='buyer'", [shop.user_id]);
    const msg = `🎉 Shop "${shop.name}" đã được duyệt! Vui lòng đăng xuất và đăng nhập lại để truy cập giao diện Người bán.`;
    const nr = await queryOne('INSERT INTO notifications(user_id,message) VALUES($1,$2) RETURNING id,created_at', [shop.user_id, msg]);
    notifyUser(shop.user_id, { id: nr.id, message: msg, is_read: false, created_at: nr.created_at });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/admin/shops/:id/reject', adminAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE id=$1', [req.params.id]);
    if (!shop) return res.status(404).json({ message: 'Shop không tồn tại' });
    await query("UPDATE shops SET status='rejected' WHERE id=$1", [req.params.id]);
    const msg = `❌ Shop "${shop.name}" đã bị từ chối. Vui lòng liên hệ Admin để biết thêm chi tiết.`;
    const nr = await queryOne('INSERT INTO notifications(user_id,message) VALUES($1,$2) RETURNING id,created_at', [shop.user_id, msg]);
    notifyUser(shop.user_id, { id: nr.id, message: msg, is_read: false, created_at: nr.created_at });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Buyer: check seller registration status
app.get('/api/buyer/shop-status', auth, async (req, res) => {
  try {
    const shop = await queryOne(
      'SELECT id, name, status FROM shops WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]);
    res.json(shop || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin users
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const { role, search, page=1, limit=20 } = req.query;
    const params = []; const conds = [];
    if (role)   { params.push(role);           conds.push('u.role=$'+params.length); }
    if (search) { params.push('%'+search+'%'); conds.push('(u.email ILIKE $'+params.length+' OR u.full_name ILIKE $'+params.length+')'); }
    const where = conds.length ? 'WHERE '+conds.join(' AND ') : '';
    const pg = Math.max(1,parseInt(page)), lm = Math.min(50,Math.max(1,parseInt(limit)));
    params.push(lm); params.push((pg-1)*lm);
    const countRow = await queryOne('SELECT COUNT(*)::int AS total FROM users u '+where, params.slice(0,-2));
    const rows = await query(
      'SELECT u.id,u.email,u.role,u.full_name,u.phone,u.is_active,u.created_at,u.avatar_url, '+
      's.name AS shop_name, s.status AS shop_status '+
      'FROM users u LEFT JOIN shops s ON s.user_id=u.id AND s.status!=\'rejected\' '+
      where+' ORDER BY u.created_at DESC LIMIT $'+(params.length-1)+' OFFSET $'+params.length, params);
    res.json({ users: rows, total: countRow.total, page: pg, limit: lm });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/admin/users/:id/toggle-active', adminAuth, async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Không thể khoá tài khoản Admin' });
    await query('UPDATE users SET is_active=$1 WHERE id=$2', [!user.is_active, req.params.id]);
    res.json({ success: true, is_active: !user.is_active });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/admin/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { new_role } = req.body;
    if (!['admin','seller','buyer'].includes(new_role))
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    const user = await queryOne('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });
    if (user.id === req.user.id) return res.status(400).json({ message: 'Không thể thay đổi vai trò của chính mình' });
    await query('UPDATE users SET role=$1 WHERE id=$2', [new_role, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await queryOne('SELECT * FROM users WHERE id=$1', [userId]);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Không thể xóa tài khoản Admin' });
    if (userId === req.user.id) return res.status(400).json({ message: 'Không thể xóa tài khoản của chính mình' });

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM notifications WHERE user_id=$1', [userId]);
      await client.query('DELETE FROM cart_items   WHERE user_id=$1', [userId]);
      await client.query('DELETE FROM favorites    WHERE user_id=$1', [userId]);
      const shops = await client.query('SELECT id FROM shops WHERE user_id=$1', [userId]);
      for (const shop of shops.rows) {
        const prods = await client.query('SELECT id FROM products WHERE shop_id=$1', [shop.id]);
        const prodIds = prods.rows.map(p => p.id);
        if (prodIds.length) {
          await client.query('DELETE FROM deals      WHERE product_id=ANY($1)', [prodIds]);
          await client.query('DELETE FROM orders     WHERE product_id=ANY($1)', [prodIds]);
          await client.query('DELETE FROM favorites  WHERE product_id=ANY($1)', [prodIds]);
          await client.query('DELETE FROM cart_items WHERE product_id=ANY($1)', [prodIds]);
          await client.query('DELETE FROM products   WHERE id=ANY($1)', [prodIds]);
        }
      }
      await client.query('DELETE FROM shops WHERE user_id=$1', [userId]);
      await client.query('DELETE FROM users WHERE id=$1', [userId]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin broadcast
app.post('/api/admin/notifications/broadcast', adminAuth, async (req, res) => {
  try {
    const { message, target = 'all' } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Vui lòng nhập nội dung thông báo' });
    let whereClause = 'is_active=true AND id!=$1';
    const params = [req.user.id];
    if (target === 'sellers') whereClause += " AND role='seller'";
    else if (target === 'buyers') whereClause += " AND role='buyer'";
    const users = await query('SELECT id FROM users WHERE '+whereClause, params);
    for (const u of users) {
      const nr = await queryOne(
        'INSERT INTO notifications(user_id,message,is_system) VALUES($1,$2,true) RETURNING id,created_at',
        [u.id, `📢 ${message}`]);
      notifyUser(u.id, { id: nr.id, message: `📢 ${message}`, is_read: false, created_at: nr.created_at, is_system: true });
    }
    res.json({ success: true, sent_to: users.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin deals
app.get('/api/admin/products', adminAuth, async (req, res) => {
  try { res.json(await query('SELECT p.*, s.name AS shop_name FROM products p JOIN shops s ON p.shop_id=s.id WHERE p.is_deleted=false ORDER BY p.created_at DESC')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
app.get('/api/admin/deals', adminAuth, async (req, res) => {
  try { res.json(await query('SELECT d.*, p.name AS product_name, p.price AS original_price FROM deals d JOIN products p ON d.product_id=p.id ORDER BY d.created_at DESC')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
app.post('/api/admin/deals', adminAuth, async (req, res) => {
  try {
    const { product_id, discount_percent, start_time, end_time } = req.body;
    if (!product_id || !discount_percent || !start_time || !end_time)
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ' });
    const product = await queryOne('SELECT * FROM products WHERE id=$1', [product_id]);
    if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    const dp = Math.round(Number(product.price) * (1 - discount_percent / 100));
    const conflict = await queryOne('SELECT id FROM deals WHERE product_id=$1 AND NOT (end_time<=$2 OR start_time>=$3)', [product_id, start_time, end_time]);
    if (conflict) return res.status(400).json({ message: 'Sản phẩm đã có deal trong khoảng thời gian này' });
    await query('INSERT INTO deals(product_id,discount_percent,start_time,end_time,discounted_price,created_by) VALUES($1,$2,$3,$4,$5,$6)', [product_id, discount_percent, start_time, end_time, dp, req.user.id]);
    res.json({ success: true, discounted_price: dp });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
app.delete('/api/admin/deals/:id', adminAuth, async (req, res) => {
  try { await query('DELETE FROM deals WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Notifications
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await query(
      'SELECT n.*, o.full_name AS customer_name, o.total_price, o.status AS order_status '+
      'FROM notifications n LEFT JOIN orders o ON n.order_id=o.id '+
      'WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 50', [req.user.id]);
    res.json({ notifications, unread_count: notifications.filter(n => !n.is_read).length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
app.patch('/api/notifications/read-all', auth, async (req, res) => {
  try { await query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  try { await query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Stats
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const [o, p, s, rev, u, ub] = await Promise.all([
      query("SELECT status, COUNT(*)::int AS c FROM orders GROUP BY status"),
      queryOne("SELECT COUNT(*)::int AS c FROM products WHERE is_deleted=false"),
      query("SELECT status, COUNT(*)::int AS c FROM shops GROUP BY status"),
      queryOne("SELECT COALESCE(SUM(total_price),0)::numeric AS s FROM orders WHERE status='completed'"),
      queryOne("SELECT COUNT(*)::int AS c FROM users"),
      queryOne("SELECT COUNT(*)::int AS c FROM users WHERE role='buyer'"),
    ]);
    const om = Object.fromEntries(o.map(r => [r.status, r.c]));
    const sm = Object.fromEntries(s.map(r => [r.status, r.c]));
    const sellers = await queryOne("SELECT COUNT(*)::int AS c FROM users WHERE role='seller'");
    res.json({
      total_orders: Object.values(om).reduce((a,b)=>a+b,0), pending_orders: om.pending||0,
      completed_orders: om.completed||0, total_products: p.c,
      pending_shops: sm.pending||0, approved_shops: sm.approved||0,
      total_revenue: Number(rev.s), total_users: u.c, total_buyers: ub.c,
      total_sellers: sellers.c, active_users: u.c,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/seller/stats', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    if (!shop) return res.json({ shop_status: null });
    const [o, p, rev] = await Promise.all([
      query("SELECT status, COUNT(*)::int AS c FROM orders WHERE shop_id=$1 GROUP BY status", [shop.id]),
      queryOne("SELECT COUNT(*)::int AS c FROM products WHERE shop_id=$1 AND is_deleted=false", [shop.id]),
      queryOne("SELECT COALESCE(SUM(total_price),0)::numeric AS s FROM orders WHERE shop_id=$1 AND status='completed'", [shop.id]),
    ]);
    const om = Object.fromEntries(o.map(r => [r.status, r.c]));
    res.json({ total_orders: Object.values(om).reduce((a,b)=>a+b,0), pending_orders: om.pending||0, total_products: p.c, total_revenue: Number(rev.s), shop_status: shop.status, shop_name: shop.name });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Revenue analytics
app.get('/api/seller/revenue', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT id FROM shops WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    if (!shop) return res.json({ data: [], summary: { total_revenue: 0, total_orders: 0, avg_order: 0 } });
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    let selectKey, params;
    if (period === 'quarterly') {
      selectKey = 'EXTRACT(QUARTER FROM created_at)::int AS period_key';
      params = [shop.id, year];
    } else if (period === 'yearly') {
      selectKey = 'EXTRACT(YEAR FROM created_at)::int AS period_key';
      params = [shop.id];
    } else {
      selectKey = 'EXTRACT(MONTH FROM created_at)::int AS period_key';
      params = [shop.id, year];
    }
    const yearCond = period === 'yearly' ? '' : ' AND EXTRACT(YEAR FROM created_at)=$2';
    const rows = await query(
      `SELECT ${selectKey}, SUM(total_price)::numeric AS revenue, COUNT(*)::int AS orders `+
      `FROM orders WHERE shop_id=$1 AND status='completed'${yearCond} GROUP BY period_key ORDER BY period_key`,
      params);
    const totalRev = rows.reduce((s,r) => s+Number(r.revenue), 0);
    const totalOrders = rows.reduce((s,r) => s+r.orders, 0);
    res.json({ data: rows, summary: { total_revenue: totalRev, total_orders: totalOrders, avg_order: totalOrders ? totalRev/totalOrders : 0 } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/admin/revenue', adminAuth, async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear(), shop_id } = req.query;
    const whereParts = ["status='completed'"];
    const params = [];
    if (period !== 'yearly') { params.push(year); whereParts.push('EXTRACT(YEAR FROM created_at)=$'+params.length); }
    if (shop_id) { params.push(shop_id); whereParts.push('shop_id=$'+params.length); }
    const where = whereParts.join(' AND ');
    let selectKey = period === 'quarterly' ? 'EXTRACT(QUARTER FROM created_at)::int' : period === 'yearly' ? 'EXTRACT(YEAR FROM created_at)::int' : 'EXTRACT(MONTH FROM created_at)::int';
    const rows = await query(
      `SELECT ${selectKey} AS period_key, SUM(total_price)::numeric AS revenue, COUNT(*)::int AS orders FROM orders WHERE ${where} GROUP BY period_key ORDER BY period_key`,
      params);
    let byShop = [];
    if (!shop_id) {
      byShop = await query(
        `SELECT s.name AS shop_name, s.id, COALESCE(SUM(o.total_price),0)::numeric AS revenue, COUNT(o.id)::int AS orders `+
        `FROM shops s LEFT JOIN orders o ON o.shop_id=s.id AND o.status='completed' AND EXTRACT(YEAR FROM o.created_at)=$1 `+
        `WHERE s.status='approved' GROUP BY s.id,s.name ORDER BY revenue DESC LIMIT 10`,
        [year]);
    }
    const totalRev = rows.reduce((s,r) => s+Number(r.revenue), 0);
    const totalOrders = rows.reduce((s,r) => s+r.orders, 0);
    res.json({ data: rows, by_shop: byShop, summary: { total_revenue: totalRev, total_orders: totalOrders, avg_order: totalOrders ? totalRev/totalOrders : 0 } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Excel export
app.get('/api/seller/revenue/export', sellerAuth, async (req, res) => {
  try {
    const shop = await queryOne('SELECT * FROM shops WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    if (!shop) return res.status(404).json({ message: 'Không tìm thấy shop' });
    const { year = new Date().getFullYear() } = req.query;
    const orders = await query(
      'SELECT o.id, o.created_at, o.full_name, o.phone, p.name AS product_name, o.variant_name, o.quantity, o.unit_price, o.total_price '+
      'FROM orders o JOIN products p ON o.product_id=p.id '+
      "WHERE o.shop_id=$1 AND o.status='completed' AND EXTRACT(YEAR FROM o.created_at)=$2 ORDER BY o.created_at DESC",
      [shop.id, year]);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mộc Việt';
    const ws = wb.addWorksheet(`Doanh thu ${year}`);
    ws.columns = [
      { header: 'Mã đơn', key: 'id', width: 10 },
      { header: 'Ngày đặt', key: 'date', width: 18 },
      { header: 'Khách hàng', key: 'full_name', width: 22 },
      { header: 'SĐT', key: 'phone', width: 14 },
      { header: 'Sản phẩm', key: 'product_name', width: 30 },
      { header: 'Kích thước / Loại', key: 'variant_name', width: 20 },
      { header: 'SL', key: 'quantity', width: 6 },
      { header: 'Đơn giá (đ)', key: 'unit_price', width: 16 },
      { header: 'Tổng tiền (đ)', key: 'total_price', width: 16 },
    ];
    const hdr = ws.getRow(1);
    hdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5E3C' } };
    hdr.alignment = { horizontal: 'center', vertical: 'middle' };
    hdr.height = 20;
    orders.forEach(r => {
      ws.addRow({ id: r.id, date: new Date(r.created_at).toLocaleDateString('vi-VN'), full_name: r.full_name, phone: r.phone, product_name: r.product_name, variant_name: r.variant_name || '', quantity: r.quantity, unit_price: Number(r.unit_price), total_price: Number(r.total_price) });
    });
    const grandTotal = orders.reduce((s,r) => s+Number(r.total_price), 0);
    const totalRow = ws.addRow({ id: '', date: '', full_name: '', phone: '', product_name: 'TỔNG DOANH THU', variant_name: '', quantity: '', unit_price: '', total_price: grandTotal });
    totalRow.font = { bold: true };
    totalRow.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
    ['unit_price','total_price'].forEach(k => { ws.getColumn(k).numFmt = '#,##0'; });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="doanh-thu-${year}.xlsx"`);
    await wb.xlsx.write(res);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/admin/revenue/export', adminAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const orders = await query(
      'SELECT o.id, o.created_at, s.name AS shop_name, o.full_name, o.phone, p.name AS product_name, o.variant_name, o.quantity, o.unit_price, o.total_price '+
      'FROM orders o JOIN products p ON o.product_id=p.id JOIN shops s ON o.shop_id=s.id '+
      "WHERE o.status='completed' AND EXTRACT(YEAR FROM o.created_at)=$1 ORDER BY o.created_at DESC",
      [year]);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mộc Việt Admin';
    const ws = wb.addWorksheet(`Doanh thu hệ thống ${year}`);
    ws.columns = [
      { header: 'Mã đơn', key: 'id', width: 10 },
      { header: 'Ngày đặt', key: 'date', width: 18 },
      { header: 'Shop', key: 'shop_name', width: 22 },
      { header: 'Khách hàng', key: 'full_name', width: 22 },
      { header: 'SĐT', key: 'phone', width: 14 },
      { header: 'Sản phẩm', key: 'product_name', width: 30 },
      { header: 'Kích thước / Loại', key: 'variant_name', width: 20 },
      { header: 'SL', key: 'quantity', width: 6 },
      { header: 'Đơn giá (đ)', key: 'unit_price', width: 16 },
      { header: 'Tổng tiền (đ)', key: 'total_price', width: 16 },
    ];
    const hdr = ws.getRow(1);
    hdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5E3C' } };
    hdr.alignment = { horizontal: 'center', vertical: 'middle' };
    hdr.height = 20;
    orders.forEach(r => {
      ws.addRow({ id: r.id, date: new Date(r.created_at).toLocaleDateString('vi-VN'), shop_name: r.shop_name, full_name: r.full_name, phone: r.phone, product_name: r.product_name, variant_name: r.variant_name || '', quantity: r.quantity, unit_price: Number(r.unit_price), total_price: Number(r.total_price) });
    });
    const grandTotal = orders.reduce((s,r) => s+Number(r.total_price), 0);
    const totalRow = ws.addRow({ id:'', date:'', shop_name:'', full_name:'', phone:'', product_name:'TỔNG DOANH THU HỆ THỐNG', variant_name:'', quantity:'', unit_price:'', total_price: grandTotal });
    totalRow.font = { bold: true };
    ['unit_price','total_price'].forEach(k => { ws.getColumn(k).numFmt = '#,##0'; });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="doanh-thu-he-thong-${year}.xlsx"`);
    await wb.xlsx.write(res);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

async function purgeExpiredDeletedProducts() {
  try {
    const expired = await query(
      "SELECT id, image_url, images, variants FROM products WHERE is_deleted=true AND deleted_at IS NOT NULL AND deleted_at <= NOW() - INTERVAL '7 days'"
    );
    if (expired.length === 0) return;

    for (const product of expired) {
      const imagePaths = new Set();

      if (product.image_url) imagePaths.add(product.image_url);

      let images = product.images;
      if (typeof images === 'string') { try { images = JSON.parse(images); } catch {} }
      if (Array.isArray(images)) images.forEach(u => u && imagePaths.add(u));

      let variants = product.variants;
      if (typeof variants === 'string') { try { variants = JSON.parse(variants); } catch {} }
      if (Array.isArray(variants)) variants.forEach(v => v?.image_url && imagePaths.add(v.image_url));

      for (const imgPath of imagePaths) {
        const absPath = path.join(__dirname, 'public', imgPath.replace(/^\//, ''));
        try { fs2.unlinkSync(absPath); } catch {}
      }

      await query('DELETE FROM products WHERE id=$1', [product.id]);
    }

    console.log(`🗑️  Đã xoá vĩnh viễn ${expired.length} sản phẩm (đã xoá > 7 ngày)`);
  } catch (err) {
    console.warn('⚠️  Lỗi dọn dẹp sản phẩm hết hạn:', err.message);
  }
}

initDatabase().then(() => {
  purgeExpiredDeletedProducts();
  setInterval(purgeExpiredDeletedProducts, 24 * 60 * 60 * 1000);
  server.listen(PORT, () => console.log('🌿 Mộc Việt: http://localhost:' + PORT));
});
