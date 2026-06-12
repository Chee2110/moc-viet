'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const ExcelJS = require('exceljs');
const { query, queryOne, getPool } = require('./database');

const LOGO_PATH = path.join(__dirname, 'bonci-assets', 'logo.jpg');

// ── numberToWords ─────────────────────────────────────────────────────────────
const _U = ['','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function _rh(n, isFirst) {
  if (n === 0) return '';
  const h = Math.floor(n/100), t = Math.floor((n%100)/10), o = n%10;
  let r = '';
  if (h > 0) r += _U[h] + ' trăm'; else if (!isFirst) r += 'không trăm';
  if (t === 0) { if (o > 0) r += (r ? ' lẻ ' : '') + _U[o]; }
  else if (t === 1) { r += (r ? ' mười' : 'mười'); if (o===5) r+=' lăm'; else if (o>0) r+=' '+_U[o]; }
  else { r+=(r?' ':'')+_U[t]+' mươi'; if(o===1)r+=' mốt'; else if(o===5)r+=' lăm'; else if(o>0)r+=' '+_U[o]; }
  return r.trim();
}
function numberToWords(amount) {
  if (!amount || amount===0) return 'Không đồng.';
  amount = Math.round(Math.abs(amount));
  const ty=Math.floor(amount/1e9), tr=Math.floor((amount%1e9)/1e6), ng=Math.floor((amount%1e6)/1e3), re=amount%1e3;
  const parts=[];
  if(ty) parts.push(_rh(ty,parts.length===0)+' tỷ');
  if(tr) parts.push(_rh(tr,parts.length===0)+' triệu');
  if(ng) parts.push(_rh(ng,parts.length===0)+' nghìn');
  if(re) parts.push(_rh(re,parts.length===0));
  if(!parts.length) return 'Không đồng.';
  const t=parts.join(' ');
  return t.charAt(0).toUpperCase()+t.slice(1)+' đồng.';
}

// ── invAuth: yêu cầu JWT Mộc Việt với role admin ─────────────────────────────
function invAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Không có quyền truy cập' });
    req.user = { ...payload, company_id: 1 };
    next();
  } catch { res.status(401).json({ error: 'Token không hợp lệ' }); }
}

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

// SSO: đổi mv_token (Mộc Việt) → bonci_token mà không cần nhập lại mật khẩu
router.get('/auth/sso', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Chưa đăng nhập' });
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Không có quyền' });
    const user    = await queryOne('SELECT * FROM users WHERE id = $1', [payload.id]);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    const company = await queryOne('SELECT * FROM inv_companies WHERE id = 1');
    const token   = jwt.sign(
      { id: user.id, company_id: 1, username: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.email, role: user.role, company_id: 1, company_name: company?.name || 'Nam Khánh' } });
  } catch { res.status(401).json({ error: 'Token không hợp lệ' }); }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu' });
    const user = await queryOne('SELECT * FROM users WHERE email = $1', [username]);
    if (!user || user.role !== 'admin') return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    const company = await queryOne('SELECT * FROM inv_companies WHERE id = 1');
    const token = jwt.sign(
      { id: user.id, company_id: 1, username: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.email, role: user.role, company_id: 1, company_name: company?.name || 'Nam Khánh' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════
async function nextProductCode(client, companyId) {
  const r = await client.query(
    `SELECT MAX(SUBSTRING(product_code FROM 3)::int) AS max_num FROM inv_products WHERE company_id=$1 AND product_code LIKE 'SP%'`,
    [companyId]
  );
  return 'SP' + String((Number(r.rows[0].max_num) || 0) + 1).padStart(3, '0');
}

router.get('/products', invAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, COALESCE(i.quantity,0)::float8 AS stock
       FROM inv_products p LEFT JOIN inv_inventory i ON i.product_id=p.id
       WHERE p.company_id=$1 ORDER BY p.product_code`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/products', invAuth, async (req, res) => {
  const { product_code, name, unit, cost_price, sell_price, description, category, distributor, initial_stock } = req.body;
  const companyId = req.user.company_id;
  if (!name) return res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const code = product_code?.trim() || await nextProductCode(client, companyId);
    const ex = await client.query('SELECT id FROM inv_products WHERE company_id=$1 AND product_code=$2', [companyId, code]);
    if (ex.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Mã sản phẩm ${code} đã tồn tại` }); }
    const r = await client.query(
      'INSERT INTO inv_products(company_id,product_code,name,unit,cost_price,sell_price,description,category,distributor) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [companyId, code, name, unit||'cái', cost_price||0, sell_price||0, description||'', category||'', distributor||'']
    );
    const productId = r.rows[0].id;
    await client.query('INSERT INTO inv_inventory(product_id,company_id,quantity) VALUES($1,$2,0)', [productId, companyId]);
    if (initial_stock && Number(initial_stock) > 0) {
      const today = new Date().toISOString().slice(0,10);
      await client.query(
        'INSERT INTO inv_inventory_logs(product_id,company_id,type,quantity,price,date,note) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [productId, companyId, 'init', initial_stock, cost_price||0, today, 'Tồn kho ban đầu']
      );
      await client.query('UPDATE inv_inventory SET quantity=$1,updated_at=NOW() WHERE product_id=$2', [initial_stock, productId]);
    }
    await client.query('COMMIT');
    res.json({ id: productId, product_code: code, message: 'Thêm sản phẩm thành công' });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.put('/products/:id', invAuth, async (req, res) => {
  try {
    const { name, unit, cost_price, sell_price, description, category, distributor, product_code } = req.body;
    const companyId = req.user.company_id;
    const product = await queryOne('SELECT id FROM inv_products WHERE id=$1 AND company_id=$2', [req.params.id, companyId]);
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    if (product_code) {
      const conflict = await queryOne('SELECT id FROM inv_products WHERE company_id=$1 AND product_code=$2 AND id!=$3', [companyId, product_code, req.params.id]);
      if (conflict) return res.status(400).json({ error: `Mã sản phẩm ${product_code} đã tồn tại` });
    }
    await query(
      `UPDATE inv_products SET
         product_code=COALESCE($1,product_code), name=COALESCE($2,name), unit=COALESCE($3,unit),
         cost_price=COALESCE($4,cost_price), sell_price=COALESCE($5,sell_price),
         description=COALESCE($6,description), category=COALESCE($7,category), distributor=COALESCE($8,distributor)
       WHERE id=$9 AND company_id=$10`,
      [product_code||null, name||null, unit||null, cost_price??null, sell_price??null, description??null, category??null, distributor??null, req.params.id, companyId]
    );
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/products/:id', invAuth, async (req, res) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const p = await client.query('SELECT id FROM inv_products WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!p.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Không tìm thấy sản phẩm' }); }
    await client.query('DELETE FROM inv_inventory_logs WHERE product_id=$1', [req.params.id]);
    await client.query('DELETE FROM inv_inventory WHERE product_id=$1', [req.params.id]);
    await client.query('DELETE FROM inv_products WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    await client.query('COMMIT');
    res.json({ message: 'Xóa sản phẩm thành công' });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/inventory/import', invAuth, async (req, res) => {
  const { product_id, quantity, price, date, note, supplier } = req.body;
  const companyId = req.user.company_id;
  if (!product_id || !quantity || Number(quantity) <= 0) return res.status(400).json({ error: 'Thiếu thông tin nhập kho' });
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const p = await client.query('SELECT id,cost_price FROM inv_products WHERE id=$1 AND company_id=$2', [product_id, companyId]);
    if (!p.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Không tìm thấy sản phẩm' }); }
    const importDate  = date || new Date().toISOString().slice(0,10);
    const importPrice = (price!==undefined && price!=='') ? Number(price) : (Number(p.rows[0].cost_price)||0);
    await client.query(
      'INSERT INTO inv_inventory_logs(product_id,company_id,type,quantity,price,date,note,supplier) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [product_id, companyId, 'import', quantity, importPrice, importDate, note||'', supplier||'']
    );
    await client.query('UPDATE inv_inventory SET quantity=quantity+$1,updated_at=NOW() WHERE product_id=$2', [quantity, product_id]);
    await client.query('COMMIT');
    res.json({ message: 'Nhập kho thành công' });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.get('/inventory/imports/export-excel', invAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const now = new Date();
    const from = req.query.from || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const to   = req.query.to   || now.toISOString().slice(0,10);
    const { supplier } = req.query;

    let sql = `
      SELECT p.product_code, p.name AS product_name, p.unit,
             il.quantity::float8, il.price::float8, (il.quantity*il.price)::float8 AS total,
             il.date, il.supplier, il.note
      FROM inv_inventory_logs il JOIN inv_products p ON p.id=il.product_id
      WHERE il.company_id=$1 AND il.type IN ('import','init') AND il.invoice_id IS NULL
        AND il.date BETWEEN $2 AND $3`;
    const params = [companyId, from, to];
    if (supplier) { params.push(supplier); sql += ` AND il.supplier=$${params.length}`; }
    sql += ' ORDER BY il.date ASC, il.created_at ASC';

    const rows    = await query(sql, params);
    const company = await queryOne('SELECT * FROM inv_companies WHERE id=$1', [companyId]);
    const totalAmount = rows.reduce((s,r) => s+Number(r.total), 0);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phiếu nhập kho');
    ws.pageSetup = { paperSize:9, orientation:'portrait', fitToPage:true, fitToWidth:1, fitToHeight:1, horizontalCentered:true, margins:{left:.3,right:.3,top:.5,bottom:.5,header:.3,footer:.3} };
    ws.columns = [{width:1.2},{width:5},{width:14},{width:34},{width:8},{width:9},{width:13},{width:16},{width:9}];

    const TNR='Times New Roman', thin={style:'thin',color:{argb:'FF000000'}}, box={top:thin,left:thin,bottom:thin,right:thin};
    const CA={horizontal:'center',vertical:'middle',wrapText:true}, LA={horizontal:'left',vertical:'middle'}, RA={horizontal:'right',vertical:'middle'};
    const gc=(rowN,col)=>ws.getCell(`${col}${rowN}`), merge=(rowN,f,t)=>ws.mergeCells(`${f}${rowN}:${t}${rowN}`);
    let n;

    const toDate=new Date(to), soPhieu=supplier?supplier:`${from} - ${to}`;
    n=ws.addRow([]).number; ws.getRow(n).height=22;
    merge(n,'B','D'); gc(n,'B').value=company?.name||'CÔNG TY TNHH NK NAM KHÁNH'; gc(n,'B').font={bold:true,size:12,name:TNR}; gc(n,'B').alignment=LA;
    merge(n,'F','I'); gc(n,'F').value='PHIẾU NHẬP KHO'; gc(n,'F').font={bold:true,size:14,name:TNR,color:{argb:'FF0070C0'}}; gc(n,'F').alignment=CA;

    n=ws.addRow([]).number; ws.getRow(n).height=18;
    merge(n,'B','D'); gc(n,'B').value=company?.address||''; gc(n,'B').font={size:10,name:TNR}; gc(n,'B').alignment=LA;
    merge(n,'F','I'); gc(n,'F').value=`Ngày ${toDate.getDate()} tháng ${toDate.getMonth()+1} năm ${toDate.getFullYear()}`; gc(n,'F').font={italic:true,size:10,name:TNR}; gc(n,'F').alignment=CA;

    n=ws.addRow([]).number; ws.getRow(n).height=18;
    merge(n,'F','I'); gc(n,'F').value=`Số Phiếu: ${soPhieu}`; gc(n,'F').font={italic:true,size:10,name:TNR}; gc(n,'F').alignment=CA;

    if (fs.existsSync(LOGO_PATH)) {
      const imgId=wb.addImage({filename:LOGO_PATH,extension:'jpeg'});
      ws.addImage(imgId,{tl:{col:0,row:0},br:{col:1.8,row:3},editAs:'oneCell'});
    }

    n=ws.addRow([]).number; ws.getRow(n).height=6;
    const addInfo=(label,value)=>{ n=ws.addRow([]).number; ws.getRow(n).height=18; merge(n,'B','I'); gc(n,'B').value=`${label}${value||''}`; gc(n,'B').font={size:11,name:TNR}; gc(n,'B').alignment=LA; };
    addInfo('Tên nhà CC: ',supplier||''); addInfo('Người giao: ',''); addInfo('Diễn giải: ','');
    n=ws.addRow([]).number; ws.getRow(n).height=18; merge(n,'B','I'); gc(n,'B').value='Nhân viên mua hàng'; gc(n,'B').font={size:11,name:TNR}; gc(n,'B').alignment=LA;
    n=ws.addRow([]).number; ws.getRow(n).height=6;

    const hdrFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF002060'}}, hdrFont={bold:true,size:10,name:TNR,color:{argb:'FFFFFFFF'}};
    n=ws.addRow([null,'STT','MÃ HÀNG','TÊN SẢN PHẨM','ĐƠN VỊ TÍNH','SỐ LƯỢNG','ĐƠN GIÁ','THÀNH TIỀN','% CHIẾT KHẤU']).number;
    ws.getRow(n).height=30;
    ['B','C','D','E','F','G','H','I'].forEach(col=>{ const cell=gc(n,col); cell.font=hdrFont; cell.fill=hdrFill; cell.alignment={...CA,wrapText:true}; cell.border=box; });

    const numFmt='#,##0';
    rows.forEach((row,i)=>{
      n=ws.addRow([null,i+1,row.product_code,row.product_name,row.unit,Number(row.quantity),Number(row.price),Number(row.total),'']).number;
      ws.getRow(n).height=18;
      const cols={B:'center',C:'left',D:'left',E:'center',F:'right',G:'right',H:'right',I:'center'};
      Object.entries(cols).forEach(([col,align])=>{ const cell=gc(n,col); cell.font={size:10,name:TNR}; cell.alignment={horizontal:align,vertical:'middle'}; cell.border=box; });
      gc(n,'F').numFmt=numFmt; gc(n,'G').numFmt=numFmt; gc(n,'H').numFmt=numFmt;
    });

    const addTotal=(label,value,bold)=>{
      n=ws.addRow([]).number; ws.getRow(n).height=18;
      merge(n,'B','G'); gc(n,'B').value=label; gc(n,'B').font={bold:!!bold,size:10,name:TNR}; gc(n,'B').alignment=LA; gc(n,'B').border=box;
      merge(n,'H','I'); gc(n,'H').value=value??''; if(typeof value==='number') gc(n,'H').numFmt=numFmt;
      gc(n,'H').font={bold:!!bold,size:10,name:TNR}; gc(n,'H').alignment=RA; gc(n,'H').border=box;
    };
    addTotal('Tổng cộng tiền hàng:',totalAmount,false);
    addTotal('Tổng cộng chiết khấu',0,false);
    addTotal('Tổng cộng thuế suất:',0,false);
    addTotal('Tổng cộng tiền thanh toán',totalAmount,true);

    n=ws.addRow([]).number; ws.getRow(n).height=18;
    merge(n,'B','I'); gc(n,'B').value=`Bằng chữ: ${numberToWords(Math.round(totalAmount))}`; gc(n,'B').font={italic:true,size:10,name:TNR}; gc(n,'B').alignment=LA; gc(n,'B').border=box;

    n=ws.addRow([]).number; ws.getRow(n).height=10;
    n=ws.addRow([]).number; ws.getRow(n).height=18;
    const td=new Date();
    merge(n,'F','I'); gc(n,'F').value=`Ngày ${td.getDate()} tháng ${td.getMonth()+1} năm ${td.getFullYear()}`; gc(n,'F').font={italic:true,size:10,name:TNR}; gc(n,'F').alignment=CA;

    const sigTitles=['Người lập phiếu','Người nhập hàng','Thủ kho','Kế toán trưởng'], sigCols=[['B','C'],['D','E'],['F','G'],['H','I']];
    n=ws.addRow([]).number; ws.getRow(n).height=18;
    sigTitles.forEach((title,i)=>{ const[f,t]=sigCols[i]; merge(n,f,t); gc(n,f).value=title; gc(n,f).font={bold:true,size:10,name:TNR}; gc(n,f).alignment=CA; });
    n=ws.addRow([]).number; ws.getRow(n).height=14;
    sigCols.forEach(([f,t])=>{ merge(n,f,t); gc(n,f).value='(ký, họ tên)'; gc(n,f).font={italic:true,size:9,name:TNR}; gc(n,f).alignment=CA; });
    for(let i=0;i<3;i++){n=ws.addRow([]).number;ws.getRow(n).height=16;}

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename="PhieuNhapKho.xlsx"');
    res.send(await wb.xlsx.writeBuffer());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/inventory/imports', invAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const now = new Date();
    const from = req.query.from || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const to   = req.query.to   || now.toISOString().slice(0,10);
    const { supplier } = req.query;

    let sql = `
      SELECT il.id, il.product_id, p.product_code, p.name AS product_name, p.unit, p.category,
             il.quantity::float8, il.price::float8, (il.quantity*il.price)::float8 AS total,
             il.date, il.supplier, il.note, il.created_at
      FROM inv_inventory_logs il JOIN inv_products p ON p.id=il.product_id
      WHERE il.company_id=$1 AND il.type IN ('import','init') AND il.invoice_id IS NULL
        AND il.date BETWEEN $2 AND $3`;
    const params = [companyId, from, to];
    if (supplier) { params.push(supplier); sql += ` AND il.supplier=$${params.length}`; }
    sql += ' ORDER BY il.date DESC, il.created_at DESC';

    const rows = await query(sql, params);
    const suppliersRes = await query(
      `SELECT DISTINCT supplier FROM inv_inventory_logs WHERE company_id=$1 AND type='import' AND supplier!='' AND supplier IS NOT NULL ORDER BY supplier`,
      [companyId]
    );
    const suppliers = suppliersRes.map(r => r.supplier);
    const totals = rows.reduce((a,r)=>({qty:a.qty+Number(r.quantity),amount:a.amount+Number(r.total)}),{qty:0,amount:0});
    res.json({ rows, suppliers, totals });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/inventory/logs/:productId', invAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { from, to, type } = req.query;
    let sql = `
      SELECT il.*, il.quantity::float8 AS quantity, il.price::float8 AS price,
        CASE WHEN il.invoice_id IS NOT NULL THEN (SELECT invoice_number FROM inv_invoices WHERE id=il.invoice_id) ELSE NULL END AS invoice_number,
        CASE WHEN il.invoice_id IS NOT NULL THEN (SELECT customer_name FROM inv_invoices WHERE id=il.invoice_id) ELSE NULL END AS customer_name
      FROM inv_inventory_logs il
      WHERE il.product_id=$1 AND il.company_id=$2`;
    const params = [req.params.productId, companyId];
    if (from)              { params.push(from);  sql+=` AND il.date>=$${params.length}`; }
    if (to)                { params.push(to);    sql+=` AND il.date<=$${params.length}`; }
    if (type && type!=='all') { params.push(type); sql+=` AND il.type=$${params.length}`; }
    sql += ' ORDER BY il.date DESC, il.created_at DESC';
    res.json(await query(sql, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICES — helpers
// ═══════════════════════════════════════════════════════════════════════════════
async function nextInvoiceNumber(client, companyId) {
  const now=new Date(), yy=String(now.getFullYear()).slice(-2), mm=String(now.getMonth()+1).padStart(2,'0');
  const prefix=`${yy}${mm}`;
  const r = await client.query(
    `SELECT COUNT(*)::int AS count FROM inv_invoices WHERE company_id=$1 AND invoice_number LIKE $2 AND (is_return=0 OR is_return IS NULL)`,
    [companyId, `${prefix}%`]
  );
  return `${prefix}${String((r.rows[0].count||0)+1).padStart(3,'0')}`;
}

async function upsertCustomer(client, companyId, name, address) {
  if (!name) return null;
  const ex = await client.query('SELECT id FROM inv_customers WHERE company_id=$1 AND LOWER(name)=LOWER($2)', [companyId, name.trim()]);
  if (ex.rows.length) {
    if (address) await client.query('UPDATE inv_customers SET address=$1 WHERE id=$2', [address, ex.rows[0].id]);
    return ex.rows[0].id;
  }
  const cr = await client.query(
    `SELECT MAX(SUBSTRING(customer_code FROM 3)::int) AS max_num FROM inv_customers WHERE company_id=$1 AND customer_code LIKE 'KH%'`,
    [companyId]
  );
  const code = 'KH'+String((Number(cr.rows[0].max_num)||0)+1).padStart(3,'0');
  const r = await client.query(
    'INSERT INTO inv_customers(company_id,customer_code,name,address) VALUES($1,$2,$3,$4) RETURNING id',
    [companyId, code, name.trim(), address||'']
  );
  return r.rows[0].id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICES — routes (static paths first)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/invoices/import-excel', invAuth, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    const companyId = req.user.company_id;
    const validated = [];
    for (const [idx, row] of rows.entries()) {
      const product = await queryOne('SELECT id,name,unit,cost_price,sell_price FROM inv_products WHERE company_id=$1 AND product_code=$2', [companyId, row.product_code]);
      if (!product) { validated.push({...row, rowIndex:idx+1, valid:false, error:`Mã SP "${row.product_code}" không tồn tại`}); continue; }
      const inv = await queryOne('SELECT quantity FROM inv_inventory WHERE product_id=$1', [product.id]);
      const stock = Number(inv?.quantity)||0;
      if (Number(row.quantity) > stock) { validated.push({...row, rowIndex:idx+1, valid:false, error:`"${product.name}" chỉ còn ${stock}`}); continue; }
      validated.push({...row, rowIndex:idx+1, valid:true, product_id:product.id, product_name:product.name, unit:product.unit, cost_price:Number(product.cost_price)});
    }
    res.json({ preview: validated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/invoices/import-excel/confirm', invAuth, async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  const companyId = req.user.company_id;
  const validRows = rows.filter(r => r.valid);
  if (!validRows.length) return res.status(400).json({ error: 'Không có dòng hợp lệ' });

  const groups = {};
  for (const row of validRows) {
    const key = `${row.customer_name}||${row.date}`;
    if (!groups[key]) groups[key] = { customer_name:row.customer_name, customer_address:row.customer_address||'', date:row.date, items:[] };
    groups[key].items.push(row);
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const group of Object.values(groups)) {
      const invoiceNumber = await nextInvoiceNumber(client, companyId);
      const subtotal = group.items.reduce((s,i)=>s+Number(i.quantity)*Number(i.unit_price),0);
      const invR = await client.query(
        'INSERT INTO inv_invoices(company_id,invoice_number,customer_name,customer_address,date,vat_rate,subtotal,vat_amount,total_amount,status) VALUES($1,$2,$3,$4,$5,0,$6,0,$6,$7) RETURNING id',
        [companyId, invoiceNumber, group.customer_name, group.customer_address, group.date, subtotal, 'unpaid']
      );
      const invoiceId = invR.rows[0].id;
      for (const item of group.items) {
        await client.query(
          'INSERT INTO inv_invoice_items(invoice_id,product_id,product_code,product_name,unit,quantity,unit_price,cost_price,total_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [invoiceId, item.product_id, item.product_code, item.product_name, item.unit, item.quantity, item.unit_price, item.cost_price||0, Number(item.quantity)*Number(item.unit_price)]
        );
        await client.query(`INSERT INTO inv_inventory_logs(product_id,company_id,type,quantity,price,date,invoice_id) VALUES($1,$2,'export',$3,$4,$5,$6)`, [item.product_id,companyId,item.quantity,item.unit_price,group.date,invoiceId]);
        await client.query('UPDATE inv_inventory SET quantity=quantity-$1,updated_at=NOW() WHERE product_id=$2', [item.quantity, item.product_id]);
      }
      created.push(invoiceNumber);
    }
    await client.query('COMMIT');
    res.json({ message:`Đã tạo ${created.length} hóa đơn`, invoice_numbers:created });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error:err.message }); }
  finally { client.release(); }
});

router.get('/invoices', invAuth, async (req, res) => {
  try {
    const { from, to, status, search } = req.query;
    let sql = 'SELECT * FROM inv_invoices WHERE company_id=$1';
    const params = [req.user.company_id];
    if (from)   { params.push(from);   sql+=` AND date>=$${params.length}`; }
    if (to)     { params.push(to);     sql+=` AND date<=$${params.length}`; }
    if (status) { params.push(status); sql+=` AND status=$${params.length}`; }
    if (search) {
      params.push(`%${search}%`); params.push(`%${search}%`);
      sql+=` AND (invoice_number LIKE $${params.length-1} OR customer_name LIKE $${params.length})`;
    }
    sql += ' ORDER BY date DESC, created_at DESC';
    res.json(await query(sql, params));
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.get('/invoices/:id/export-excel', invAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const invoice = await queryOne('SELECT * FROM inv_invoices WHERE id=$1 AND company_id=$2', [req.params.id, companyId]);
    if (!invoice) return res.status(404).json({ error:'Không tìm thấy hóa đơn' });
    const items   = await query('SELECT * FROM inv_invoice_items WHERE invoice_id=$1', [req.params.id]);
    const company = await queryOne('SELECT * FROM inv_companies WHERE id=$1', [companyId]);

    const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('PXK');
    ws.pageSetup={paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:1,horizontalCentered:true,margins:{left:.25,right:.25,top:.5,bottom:.5,header:.3,footer:.3}};
    ws.columns=[{width:1.44},{width:4.66},{width:15},{width:42.44},{width:8.33},{width:10.33},{width:12.66},{width:15.89}];

    const TNR='Times New Roman',CAL='Calibri',thin={style:'thin',color:{argb:'FF000000'}},box={top:thin,left:thin,bottom:thin,right:thin};
    const CA={horizontal:'center',vertical:'middle'},LA={horizontal:'left',vertical:'middle'},RA={horizontal:'right',vertical:'middle'};
    const gc=(n,col)=>ws.getCell(`${col}${n}`),merge=(n,f,t)=>ws.mergeCells(`${f}${n}:${t}${n}`);
    const applyBorder=(n,cols)=>cols.forEach(c=>{gc(n,c).border=box;});
    let n;

    n=ws.addRow([null,null,null,company?.name||'CÔNG TY TNHH NK NAM KHÁNH']).number;
    merge(n,'D','H'); gc(n,'D').font={bold:true,size:14,name:TNR}; gc(n,'D').alignment=CA; ws.getRow(n).height=28;

    n=ws.addRow([null,null,null,`Địa chỉ: ${company?.address||''}`]).number;
    merge(n,'D','H'); gc(n,'D').font={size:12,name:TNR}; ws.getRow(n).height=20;

    n=ws.addRow([null,null,null,`Mã số thuế: ${company?.tax_code||''}`]).number;
    merge(n,'D','H'); gc(n,'D').font={size:12,name:TNR}; ws.getRow(n).height=20;

    const repStr=[company?.representative?`Người đại diện: ${company.representative}`:'',company?.representative_title?`Chức vụ: ${company.representative_title}`:''].filter(Boolean).join('  -  ');
    n=ws.addRow([null,null,null,repStr]).number; merge(n,'D','H'); gc(n,'D').font={size:12,name:TNR}; ws.getRow(n).height=20;

    const telStr=`Số điện thoại: ${company?.phone||''}${company?.email?'      -  Gmail: '+company.email:''}`;
    n=ws.addRow([null,null,null,telStr]).number; merge(n,'D','H'); gc(n,'D').font={size:12,name:TNR}; ws.getRow(n).height=20;

    if(fs.existsSync(LOGO_PATH)){const imgId=wb.addImage({filename:LOGO_PATH,extension:'jpeg'});ws.addImage(imgId,{tl:{col:0,row:0},br:{col:3,row:5},editAs:'oneCell'});}

    n=ws.addRow([null,'PHIẾU XUẤT KHO KIÊM BIÊN BẢN GIAO HÀNG ']).number;
    merge(n,'B','H'); gc(n,'B').font={bold:true,size:14,name:TNR}; gc(n,'B').alignment=CA; ws.getRow(n).height=30;

    const d=new Date(invoice.date);
    n=ws.addRow([null,`Ngày ${d.getDate()} tháng ${d.getMonth()+1} năm ${d.getFullYear()}`]).number;
    merge(n,'B','H'); gc(n,'B').font={bold:true,size:12,name:TNR}; gc(n,'B').alignment=CA; ws.getRow(n).height=22;

    n=ws.addRow([null,'Kính gửi: ',null,invoice.customer_name||'']).number;
    merge(n,'B','C'); gc(n,'B').font={size:12,name:TNR}; gc(n,'B').alignment=LA; gc(n,'D').font={bold:true,size:11,name:TNR}; ws.getRow(n).height=22;

    n=ws.addRow([null,`Người đại diện: ${invoice.customer_representative||''}`]).number;
    merge(n,'B','H'); gc(n,'B').font={size:12,name:TNR}; gc(n,'B').alignment=LA; ws.getRow(n).height=20;

    n=ws.addRow([null,`Chức vụ: ${invoice.customer_title||''}`]).number;
    merge(n,'B','H'); gc(n,'B').font={size:12,name:TNR}; gc(n,'B').alignment=LA; ws.getRow(n).height=20;

    n=ws.addRow([null,`Địa chỉ: ${invoice.customer_address||''}`]).number;
    merge(n,'B','H'); gc(n,'B').font={size:12,name:TNR}; gc(n,'B').alignment=LA; ws.getRow(n).height=20;

    const cName=company?.name||'Công ty TNHH NK Nam Khánh';
    n=ws.addRow([null,`${cName} xin trân trọng gửi tới quý Công ty bảng đơn hàng các sản phẩm sau:`]).number;
    merge(n,'B','H'); gc(n,'B').font={size:12,name:TNR}; gc(n,'B').alignment={horizontal:'left',vertical:'middle',wrapText:true}; ws.getRow(n).height=24;

    n=ws.addRow([null,null,null,null,null,null,'Loại tiền: Đồng Việt Nam']).number;
    merge(n,'G','H'); gc(n,'G').font={size:12,name:TNR}; gc(n,'G').alignment={horizontal:'right',vertical:'middle',wrapText:true}; ws.getRow(n).height=20;

    n=ws.addRow([null,'STT','Mã hàng','Tên hàng hóa, dịch vụ','Đơn vị','Số lượng','Đơn giá','Thành tiền']).number;
    ws.getRow(n).height=40;
    ['B','C','D','E','F','G','H'].forEach(col=>{
      gc(n,col).font={bold:true,size:12,name:TNR}; gc(n,col).alignment={horizontal:'center',vertical:'middle',wrapText:true};
      gc(n,col).border=box; gc(n,col).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDCE6F1'}};
    });

    items.forEach((item,idx)=>{
      n=ws.addRow([null,idx+1,item.product_code,item.product_name,item.unit,Number(item.quantity),Number(item.unit_price),Number(item.total_price)]).number;
      ws.getRow(n).height=24; applyBorder(n,['B','C','D','E','F','G','H']);
      gc(n,'B').font={size:14,name:TNR}; gc(n,'B').alignment=CA;
      gc(n,'C').font={size:11,name:CAL}; gc(n,'C').alignment=LA;
      gc(n,'D').font={size:11,name:CAL}; gc(n,'D').alignment={horizontal:'left',vertical:'middle',wrapText:true};
      gc(n,'E').font={size:10,name:CAL}; gc(n,'E').alignment=CA;
      gc(n,'F').font={size:14,name:TNR}; gc(n,'F').alignment=CA; gc(n,'F').numFmt='#,##0';
      gc(n,'G').font={size:14,name:TNR}; gc(n,'G').alignment=LA; gc(n,'G').numFmt='#,##0';
      gc(n,'H').font={size:14,name:TNR}; gc(n,'H').alignment={horizontal:'center',vertical:'middle',wrapText:true}; gc(n,'H').numFmt='#,##0';
    });

    const mkTotalRow=(label,value)=>{
      n=ws.addRow([]).number; ws.getRow(n).height=22; applyBorder(n,['B','C','D','E','F','G','H']);
      gc(n,'B').value=label; gc(n,'B').font={bold:true,size:12,name:TNR};
      gc(n,'H').value=Number(value); gc(n,'H').font={bold:true,size:12,name:TNR};
      gc(n,'H').alignment={horizontal:'center',vertical:'middle',wrapText:true}; gc(n,'H').numFmt='#,##0';
    };
    mkTotalRow('Tổng cộng tiền hàng',invoice.subtotal);
    mkTotalRow(`Thuế VAT (${invoice.vat_rate}%)`,invoice.vat_amount);
    mkTotalRow('Tổng tiền thanh toán ',invoice.total_amount);

    n=ws.addRow([]).number; ws.getRow(n).height=22;
    gc(n,'B').value='Bằng chữ : '; gc(n,'B').font={bold:true,size:12,name:TNR};
    merge(n,'D','H'); gc(n,'D').value=numberToWords(Number(invoice.total_amount)); gc(n,'D').font={size:12,name:TNR}; gc(n,'D').alignment=LA;

    n=ws.addRow([]).number; ws.getRow(n).height=14;
    const sigName=company?.name||'Công ty TNHH NK Nam Khánh';
    n=ws.addRow([]).number; ws.getRow(n).height=26;
    merge(n,'B','D'); gc(n,'B').value=sigName; gc(n,'B').font={bold:true,size:13,name:TNR}; gc(n,'B').alignment=CA;
    merge(n,'F','H'); gc(n,'F').value='Xác nhận của Quý khách hàng'; gc(n,'F').font={bold:true,size:13,name:TNR}; gc(n,'F').alignment=CA;
    n=ws.addRow([]).number; ws.getRow(n).height=20;
    merge(n,'B','D'); gc(n,'B').value='( Ký tên đóng dấu)'; gc(n,'B').font={bold:true,size:13,name:TNR}; gc(n,'B').alignment=CA;
    merge(n,'F','H'); gc(n,'F').value='( Ký tên đóng dấu)'; gc(n,'F').font={bold:true,size:13,name:TNR}; gc(n,'F').alignment=CA;
    n=ws.addRow([]).number; ws.getRow(n).height=55;
    ws.printArea=`A1:H${n}`;

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''PXK-${encodeURIComponent(invoice.invoice_number)}.xlsx`);
    res.send(await wb.xlsx.writeBuffer());
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.get('/invoices/:id', invAuth, async (req, res) => {
  try {
    const invoice = await queryOne('SELECT * FROM inv_invoices WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!invoice) return res.status(404).json({ error:'Không tìm thấy hóa đơn' });
    const items = await query('SELECT * FROM inv_invoice_items WHERE invoice_id=$1', [req.params.id]);
    res.json({ ...invoice, items });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.post('/invoices', invAuth, async (req, res) => {
  const { customer_id,customer_name,customer_address,customer_representative,customer_title,date,vat_rate,note,status,items } = req.body;
  const companyId = req.user.company_id;
  if (!customer_name) return res.status(400).json({ error:'Tên khách hàng là bắt buộc' });
  if (!items?.length)  return res.status(400).json({ error:'Hóa đơn phải có ít nhất 1 sản phẩm' });
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      if (!item.quantity || Number(item.quantity)<=0) throw new Error('Số lượng phải > 0');
      const inv = await client.query('SELECT quantity FROM inv_inventory WHERE product_id=$1', [item.product_id]);
      const stock = Number(inv.rows[0]?.quantity)||0;
      if (Number(item.quantity)>stock) throw new Error(`Sản phẩm "${item.product_name}" chỉ còn ${stock} ${item.unit||''} — không đủ`);
    }
    const vatRate=vat_rate??8, subtotal=items.reduce((s,i)=>s+Number(i.quantity)*Number(i.unit_price),0);
    const vatAmount=subtotal*vatRate/100, totalAmount=subtotal+vatAmount;
    const invoiceDate=date||new Date().toISOString().slice(0,10);
    const invoiceNumber=await nextInvoiceNumber(client, companyId);
    const resolvedCustomerId=customer_id||await upsertCustomer(client,companyId,customer_name,customer_address);
    const invR=await client.query(
      'INSERT INTO inv_invoices(company_id,invoice_number,customer_id,customer_name,customer_address,customer_representative,customer_title,date,vat_rate,subtotal,vat_amount,total_amount,status,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id',
      [companyId,invoiceNumber,resolvedCustomerId||null,customer_name,customer_address||'',customer_representative||'',customer_title||'',invoiceDate,vatRate,subtotal,vatAmount,totalAmount,status||'unpaid',note||'']
    );
    const invoiceId=invR.rows[0].id;
    for (const item of items) {
      const prod=await client.query('SELECT cost_price,product_code FROM inv_products WHERE id=$1',[item.product_id]);
      const p=prod.rows[0];
      await client.query('INSERT INTO inv_invoice_items(invoice_id,product_id,product_code,product_name,unit,quantity,unit_price,cost_price,total_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [invoiceId,item.product_id,item.product_code||p?.product_code||'',item.product_name,item.unit||'',item.quantity,item.unit_price,p?.cost_price||0,Number(item.quantity)*Number(item.unit_price)]);
      await client.query(`INSERT INTO inv_inventory_logs(product_id,company_id,type,quantity,price,date,note,invoice_id) VALUES($1,$2,'export',$3,$4,$5,'',$6)`,
        [item.product_id,companyId,item.quantity,item.unit_price,invoiceDate,invoiceId]);
      await client.query('UPDATE inv_inventory SET quantity=quantity-$1,updated_at=NOW() WHERE product_id=$2',[item.quantity,item.product_id]);
    }
    await client.query('COMMIT');
    res.json({ id:invoiceId, invoice_number:invoiceNumber, message:'Tạo hóa đơn thành công' });
  } catch (err) { await client.query('ROLLBACK'); res.status(400).json({ error:err.message }); }
  finally { client.release(); }
});

router.put('/invoices/:id', invAuth, async (req, res) => {
  const { customer_id,customer_name,customer_address,customer_representative,customer_title,date,vat_rate,note,status,items } = req.body;
  const companyId = req.user.company_id;
  if (!items?.length) return res.status(400).json({ error:'Hóa đơn phải có ít nhất 1 sản phẩm' });
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const inv=await client.query('SELECT * FROM inv_invoices WHERE id=$1 AND company_id=$2',[req.params.id,companyId]);
    if (!inv.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error:'Không tìm thấy hóa đơn' }); }
    const invoice=inv.rows[0];
    const oldItems=await client.query('SELECT * FROM inv_invoice_items WHERE invoice_id=$1',[req.params.id]);
    for (const old of oldItems.rows) await client.query('UPDATE inv_inventory SET quantity=quantity+$1,updated_at=NOW() WHERE product_id=$2',[old.quantity,old.product_id]);
    await client.query('DELETE FROM inv_inventory_logs WHERE invoice_id=$1',[req.params.id]);
    await client.query('DELETE FROM inv_invoice_items WHERE invoice_id=$1',[req.params.id]);
    for (const item of items) {
      if (!item.quantity||Number(item.quantity)<=0) throw new Error('Số lượng phải > 0');
      const invQ=await client.query('SELECT quantity FROM inv_inventory WHERE product_id=$1',[item.product_id]);
      const stock=Number(invQ.rows[0]?.quantity)||0;
      if (Number(item.quantity)>stock) throw new Error(`Sản phẩm "${item.product_name}" chỉ còn ${stock} ${item.unit||''} — không đủ`);
    }
    const vatRate=vat_rate??Number(invoice.vat_rate), subtotal=items.reduce((s,i)=>s+Number(i.quantity)*Number(i.unit_price),0);
    const vatAmount=subtotal*vatRate/100, totalAmount=subtotal+vatAmount, invoiceDate=date||invoice.date;
    const resolvedName=customer_name||invoice.customer_name, resolvedAddress=customer_address??invoice.customer_address;
    const resolvedCustomerId=customer_id||invoice.customer_id||await upsertCustomer(client,companyId,resolvedName,resolvedAddress);
    await client.query(
      'UPDATE inv_invoices SET customer_id=$1,customer_name=$2,customer_address=$3,customer_representative=$4,customer_title=$5,date=$6,vat_rate=$7,subtotal=$8,vat_amount=$9,total_amount=$10,status=$11,note=$12 WHERE id=$13',
      [resolvedCustomerId,resolvedName,resolvedAddress,customer_representative??invoice.customer_representative,customer_title??invoice.customer_title,invoiceDate,vatRate,subtotal,vatAmount,totalAmount,status||invoice.status,note??invoice.note,req.params.id]
    );
    for (const item of items) {
      const prod=await client.query('SELECT cost_price,product_code FROM inv_products WHERE id=$1',[item.product_id]);
      const p=prod.rows[0];
      await client.query('INSERT INTO inv_invoice_items(invoice_id,product_id,product_code,product_name,unit,quantity,unit_price,cost_price,total_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [req.params.id,item.product_id,item.product_code||p?.product_code||'',item.product_name,item.unit||'',item.quantity,item.unit_price,p?.cost_price||0,Number(item.quantity)*Number(item.unit_price)]);
      await client.query(`INSERT INTO inv_inventory_logs(product_id,company_id,type,quantity,price,date,note,invoice_id) VALUES($1,$2,'export',$3,$4,$5,'',$6)`,
        [item.product_id,companyId,item.quantity,item.unit_price,invoiceDate,req.params.id]);
      await client.query('UPDATE inv_inventory SET quantity=quantity-$1,updated_at=NOW() WHERE product_id=$2',[item.quantity,item.product_id]);
    }
    await client.query('COMMIT');
    res.json({ message:'Cập nhật hóa đơn thành công' });
  } catch (err) { await client.query('ROLLBACK'); res.status(400).json({ error:err.message }); }
  finally { client.release(); }
});

router.patch('/invoices/:id/status', invAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['paid','unpaid'].includes(status)) return res.status(400).json({ error:'Trạng thái không hợp lệ' });
    const invoice=await queryOne('SELECT id FROM inv_invoices WHERE id=$1 AND company_id=$2',[req.params.id,req.user.company_id]);
    if (!invoice) return res.status(404).json({ error:'Không tìm thấy hóa đơn' });
    await query('UPDATE inv_invoices SET status=$1 WHERE id=$2',[status,req.params.id]);
    res.json({ message:'Cập nhật trạng thái thành công' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.delete('/invoices/:id', invAuth, async (req, res) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const inv=await client.query('SELECT id FROM inv_invoices WHERE id=$1 AND company_id=$2',[req.params.id,req.user.company_id]);
    if (!inv.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error:'Không tìm thấy hóa đơn' }); }
    const items=await client.query('SELECT * FROM inv_invoice_items WHERE invoice_id=$1',[req.params.id]);
    for (const item of items.rows) await client.query('UPDATE inv_inventory SET quantity=quantity+$1,updated_at=NOW() WHERE product_id=$2',[item.quantity,item.product_id]);
    await client.query('DELETE FROM inv_inventory_logs WHERE invoice_id=$1',[req.params.id]);
    await client.query('DELETE FROM inv_invoice_items WHERE invoice_id=$1',[req.params.id]);
    await client.query('DELETE FROM inv_invoices WHERE id=$1',[req.params.id]);
    await client.query('COMMIT');
    res.json({ message:'Xóa hóa đơn thành công' });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error:err.message }); }
  finally { client.release(); }
});

router.post('/invoices/:id/return', invAuth, async (req, res) => {
  const { items } = req.body;
  const companyId = req.user.company_id;
  if (!items?.length) return res.status(400).json({ error:'Phải có ít nhất 1 sản phẩm hoàn' });
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const orig=await client.query('SELECT * FROM inv_invoices WHERE id=$1 AND company_id=$2 AND (is_return=0 OR is_return IS NULL)',[req.params.id,companyId]);
    if (!orig.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error:'Không tìm thấy hóa đơn' }); }
    const original=orig.rows[0];
    const returnDate=new Date().toISOString().slice(0,10), vatRate=Number(original.vat_rate);
    const subtotal=items.reduce((s,i)=>s+Number(i.quantity)*Number(i.unit_price),0);
    const vatAmount=subtotal*vatRate/100, totalAmount=subtotal+vatAmount;
    const rc=await client.query('SELECT COUNT(*)::int AS cnt FROM inv_invoices WHERE original_invoice_id=$1 AND is_return=1',[req.params.id]);
    const returnSuffix=(rc.rows[0].cnt||0)+1, returnNumber=`${original.invoice_number}-HT${returnSuffix}`;
    const r=await client.query(
      `INSERT INTO inv_invoices(company_id,invoice_number,customer_id,customer_name,customer_address,customer_representative,customer_title,date,vat_rate,subtotal,vat_amount,total_amount,status,note,is_return,original_invoice_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'paid',$13,1,$14) RETURNING id`,
      [companyId,returnNumber,original.customer_id,original.customer_name,original.customer_address,original.customer_representative,original.customer_title,returnDate,vatRate,subtotal,vatAmount,totalAmount,`Hoàn hàng từ ${original.invoice_number}`,Number(req.params.id)]
    );
    const returnId=r.rows[0].id;
    for (const item of items) {
      await client.query('INSERT INTO inv_invoice_items(invoice_id,product_id,product_code,product_name,unit,quantity,unit_price,cost_price,total_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [returnId,item.product_id,item.product_code,item.product_name,item.unit,item.quantity,item.unit_price,item.cost_price||0,Number(item.quantity)*Number(item.unit_price)]);
      await client.query('UPDATE inv_inventory SET quantity=quantity+$1,updated_at=NOW() WHERE product_id=$2',[item.quantity,item.product_id]);
      await client.query(`INSERT INTO inv_inventory_logs(product_id,company_id,type,quantity,price,date,note,invoice_id) VALUES($1,$2,'import',$3,$4,$5,$6,$7)`,
        [item.product_id,companyId,item.quantity,item.cost_price||0,returnDate,`Hoàn hàng từ ${original.invoice_number}`,returnId]);
    }
    await client.query('COMMIT');
    res.json({ message:'Hoàn hàng thành công', invoice_number:returnNumber });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error:err.message }); }
  finally { client.release(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════════
async function nextCustomerCode(companyId) {
  const r=await queryOne(`SELECT MAX(SUBSTRING(customer_code FROM 3)::int) AS max_num FROM inv_customers WHERE company_id=$1 AND customer_code LIKE 'KH%'`,[companyId]);
  return 'KH'+String((Number(r?.max_num)||0)+1).padStart(3,'0');
}

router.get('/customers', invAuth, async (req, res) => {
  try {
    const rows=await query(
      `SELECT c.*, COUNT(i.id)::int AS invoice_count, COALESCE(SUM(i.total_amount),0)::float8 AS total_purchase
       FROM inv_customers c LEFT JOIN inv_invoices i ON i.customer_id=c.id
       WHERE c.company_id=$1 GROUP BY c.id ORDER BY c.customer_code`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.post('/customers', invAuth, async (req, res) => {
  try {
    const { customer_code,name,phone,email,address,note } = req.body;
    const companyId=req.user.company_id;
    if (!name) return res.status(400).json({ error:'Tên khách hàng là bắt buộc' });
    const code=customer_code?.trim()||await nextCustomerCode(companyId);
    const ex=await queryOne('SELECT id FROM inv_customers WHERE company_id=$1 AND customer_code=$2',[companyId,code]);
    if (ex) return res.status(400).json({ error:`Mã khách hàng ${code} đã tồn tại` });
    const r=await query('INSERT INTO inv_customers(company_id,customer_code,name,phone,email,address,note) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [companyId,code,name,phone||'',email||'',address||'',note||'']);
    res.json({ id:r[0].id, customer_code:code, message:'Thêm khách hàng thành công' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.put('/customers/:id', invAuth, async (req, res) => {
  try {
    const { name,phone,email,address,note,customer_code } = req.body;
    const companyId=req.user.company_id;
    const customer=await queryOne('SELECT id FROM inv_customers WHERE id=$1 AND company_id=$2',[req.params.id,companyId]);
    if (!customer) return res.status(404).json({ error:'Không tìm thấy khách hàng' });
    if (customer_code) {
      const conflict=await queryOne('SELECT id FROM inv_customers WHERE company_id=$1 AND customer_code=$2 AND id!=$3',[companyId,customer_code,req.params.id]);
      if (conflict) return res.status(400).json({ error:`Mã khách hàng ${customer_code} đã tồn tại` });
    }
    await query(
      'UPDATE inv_customers SET customer_code=COALESCE($1,customer_code),name=COALESCE($2,name),phone=COALESCE($3,phone),email=COALESCE($4,email),address=COALESCE($5,address),note=COALESCE($6,note) WHERE id=$7 AND company_id=$8',
      [customer_code||null,name||null,phone??null,email??null,address??null,note??null,req.params.id,companyId]
    );
    res.json({ message:'Cập nhật thành công' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.delete('/customers/:id', invAuth, async (req, res) => {
  try {
    const companyId=req.user.company_id;
    const customer=await queryOne('SELECT id FROM inv_customers WHERE id=$1 AND company_id=$2',[req.params.id,companyId]);
    if (!customer) return res.status(404).json({ error:'Không tìm thấy khách hàng' });
    const invCount=await queryOne('SELECT COUNT(*)::int AS count FROM inv_invoices WHERE customer_id=$1',[req.params.id]);
    if ((invCount?.count||0)>0) return res.status(400).json({ error:`Khách hàng này còn ${invCount.count} hóa đơn, không thể xóa` });
    await query('DELETE FROM inv_customers WHERE id=$1 AND company_id=$2',[req.params.id,companyId]);
    res.json({ message:'Xóa khách hàng thành công' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.get('/customers/:id/invoices', invAuth, async (req, res) => {
  try {
    const rows=await query(
      `SELECT i.*, STRING_AGG(ii.product_name||' ×'||CAST(ii.quantity::int AS TEXT),', ') AS items_summary
       FROM inv_invoices i LEFT JOIN inv_invoice_items ii ON ii.invoice_id=i.id
       WHERE i.customer_id=$1 AND i.company_id=$2 GROUP BY i.id ORDER BY i.date DESC`,
      [req.params.id, req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS (company info)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/settings', invAuth, async (req, res) => {
  try { res.json(await queryOne('SELECT * FROM inv_companies WHERE id=$1',[req.user.company_id])); }
  catch (err) { res.status(500).json({ error:err.message }); }
});

router.put('/settings', invAuth, async (req, res) => {
  try {
    const { name,tax_code,address,phone,email,representative,representative_title,bank_account,bank_name,bank_account_2,bank_name_2 } = req.body;
    await query(
      `UPDATE inv_companies SET
         name=COALESCE($1,name), tax_code=COALESCE($2,tax_code), address=COALESCE($3,address),
         phone=COALESCE($4,phone), email=COALESCE($5,email), representative=COALESCE($6,representative),
         representative_title=COALESCE($7,representative_title), bank_account=COALESCE($8,bank_account),
         bank_name=COALESCE($9,bank_name), bank_account_2=COALESCE($10,bank_account_2), bank_name_2=COALESCE($11,bank_name_2)
       WHERE id=$12`,
      [name||null,tax_code??null,address??null,phone??null,email??null,representative??null,representative_title??null,bank_account??null,bank_name??null,bank_account_2??null,bank_name_2??null,req.user.company_id]
    );
    res.json({ message:'Cập nhật thông tin công ty thành công' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/categories', invAuth, async (req, res) => {
  try {
    const rows=await query(
      `SELECT c.*, COUNT(p.id)::int AS product_count FROM inv_categories c
       LEFT JOIN inv_products p ON p.company_id=c.company_id AND p.category=c.name
       WHERE c.company_id=$1 GROUP BY c.id ORDER BY c.name`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.post('/categories', invAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error:'Tên danh mục là bắt buộc' });
    const ex=await queryOne('SELECT id FROM inv_categories WHERE company_id=$1 AND name=$2',[req.user.company_id,name.trim()]);
    if (ex) return res.status(400).json({ error:'Danh mục đã tồn tại' });
    const r=await query('INSERT INTO inv_categories(company_id,name) VALUES($1,$2) RETURNING id',[req.user.company_id,name.trim()]);
    res.json({ id:r[0].id, name:name.trim() });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.put('/categories/:id', invAuth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error:'Tên danh mục là bắt buộc' });
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const cat=await client.query('SELECT * FROM inv_categories WHERE id=$1 AND company_id=$2',[req.params.id,req.user.company_id]);
    if (!cat.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error:'Không tìm thấy danh mục' }); }
    const conflict=await client.query('SELECT id FROM inv_categories WHERE company_id=$1 AND name=$2 AND id!=$3',[req.user.company_id,name.trim(),req.params.id]);
    if (conflict.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error:'Tên danh mục đã tồn tại' }); }
    await client.query('UPDATE inv_products SET category=$1 WHERE company_id=$2 AND category=$3',[name.trim(),req.user.company_id,cat.rows[0].name]);
    await client.query('UPDATE inv_categories SET name=$1 WHERE id=$2',[name.trim(),req.params.id]);
    await client.query('COMMIT');
    res.json({ message:'Cập nhật thành công' });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error:err.message }); }
  finally { client.release(); }
});

router.delete('/categories/:id', invAuth, async (req, res) => {
  try {
    const cat=await queryOne('SELECT * FROM inv_categories WHERE id=$1 AND company_id=$2',[req.params.id,req.user.company_id]);
    if (!cat) return res.status(404).json({ error:'Không tìm thấy danh mục' });
    await query("UPDATE inv_products SET category='' WHERE company_id=$1 AND category=$2",[req.user.company_id,cat.name]);
    await query('DELETE FROM inv_categories WHERE id=$1',[req.params.id]);
    res.json({ message:'Xóa thành công' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/reports/dashboard', invAuth, async (req, res) => {
  try {
    const companyId=req.user.company_id, now=new Date();
    const monthStart=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const monthEnd=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);

    const totalProducts=await queryOne('SELECT COUNT(*)::int AS count FROM inv_products WHERE company_id=$1',[companyId]);
    const totalStock=await queryOne('SELECT COALESCE(SUM(i.quantity),0)::float8 AS total FROM inv_inventory i JOIN inv_products p ON p.id=i.product_id WHERE p.company_id=$1',[companyId]);
    const monthRevenue=await queryOne(
      `SELECT COALESCE(SUM(CASE WHEN inv.is_return=0 OR inv.is_return IS NULL THEN ii.quantity*ii.unit_price ELSE -(ii.quantity*ii.unit_price) END),0)::float8 AS revenue,
              COALESCE(SUM(CASE WHEN inv.is_return=0 OR inv.is_return IS NULL THEN ii.quantity*ii.cost_price ELSE -(ii.quantity*ii.cost_price) END),0)::float8 AS cogs
       FROM inv_invoice_items ii JOIN inv_invoices inv ON inv.id=ii.invoice_id
       WHERE inv.company_id=$1 AND inv.date BETWEEN $2 AND $3`,
      [companyId,monthStart,monthEnd]
    );

    const year=now.getFullYear(), monthlyRevenue=[];
    for (let m=1;m<=12;m++) {
      const mStart=`${year}-${String(m).padStart(2,'0')}-01`, mEnd=new Date(year,m,0).toISOString().slice(0,10);
      const r=await queryOne(`SELECT COALESCE(SUM(ii.quantity*ii.unit_price),0)::float8 AS revenue FROM inv_invoice_items ii JOIN inv_invoices i ON i.id=ii.invoice_id WHERE i.company_id=$1 AND i.date BETWEEN $2 AND $3`,[companyId,mStart,mEnd]);
      monthlyRevenue.push({ month:m, revenue:Number(r.revenue) });
    }

    const top5Selling=await query(
      `SELECT ii.product_name, SUM(ii.quantity)::float8 AS total_qty, SUM(ii.total_price)::float8 AS total_revenue
       FROM inv_invoice_items ii JOIN inv_invoices i ON i.id=ii.invoice_id
       WHERE i.company_id=$1 AND i.date BETWEEN $2 AND $3
       GROUP BY ii.product_id,ii.product_name ORDER BY total_qty DESC LIMIT 5`,
      [companyId,monthStart,monthEnd]
    );

    const lowStock=await query(
      `SELECT p.product_code,p.name,p.unit,COALESCE(inv.quantity,0)::float8 AS stock
       FROM inv_products p LEFT JOIN inv_inventory inv ON inv.product_id=p.id
       WHERE p.company_id=$1 ORDER BY stock ASC LIMIT 5`,
      [companyId]
    );

    const pieCategoryData=await query(
      `SELECT COALESCE(NULLIF(p.category,''),'Không phân loại') AS name,
              SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.total_price ELSE -ii.total_price END)::float8 AS value
       FROM inv_invoice_items ii JOIN inv_invoices i ON i.id=ii.invoice_id JOIN inv_products p ON p.id=ii.product_id
       WHERE i.company_id=$1 AND i.date BETWEEN $2 AND $3
       GROUP BY COALESCE(NULLIF(p.category,''),'Không phân loại') HAVING SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.total_price ELSE -ii.total_price END)>0
       ORDER BY value DESC`,
      [companyId,monthStart,monthEnd]
    );

    const pieProductData=await query(
      `SELECT ii.product_name AS name, COALESCE(NULLIF(p.category,''),'Không phân loại') AS category,
              SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.total_price ELSE -ii.total_price END)::float8 AS value
       FROM inv_invoice_items ii JOIN inv_invoices i ON i.id=ii.invoice_id JOIN inv_products p ON p.id=ii.product_id
       WHERE i.company_id=$1 AND i.date BETWEEN $2 AND $3 GROUP BY ii.product_id,ii.product_name,p.category
       HAVING SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.total_price ELSE -ii.total_price END)>0 ORDER BY value DESC`,
      [companyId,monthStart,monthEnd]
    );

    res.json({
      totalProducts:totalProducts.count, totalStock:Number(totalStock.total),
      monthRevenue:Number(monthRevenue.revenue), monthProfit:Number(monthRevenue.revenue)-Number(monthRevenue.cogs),
      monthlyRevenue, top5Selling, lowStock, pieCategoryData, pieProductData
    });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.get('/reports/products', invAuth, async (req, res) => {
  try {
    const companyId=req.user.company_id, now=new Date();
    const from=req.query.from||`${now.getFullYear()}-01-01`, to=req.query.to||now.toISOString().slice(0,10);
    const rows=await query(
      `SELECT p.id,p.product_code,p.name,p.unit,p.cost_price::float8,p.sell_price::float8,p.category,
              COALESCE(inv.quantity,0)::float8 AS stock,
              COALESCE(SUM(CASE WHEN il.type IN ('import','init') AND il.invoice_id IS NULL AND il.date BETWEEN $1 AND $2 THEN il.quantity ELSE 0 END),0)::float8 AS imported_qty,
              COALESCE((SELECT SUM(CASE WHEN i2.is_return=0 OR i2.is_return IS NULL THEN ii2.quantity ELSE -ii2.quantity END)
                        FROM inv_invoice_items ii2 JOIN inv_invoices i2 ON i2.id=ii2.invoice_id
                        WHERE ii2.product_id=p.id AND i2.company_id=p.company_id AND i2.date BETWEEN $3 AND $4),0)::float8 AS sold_qty
       FROM inv_products p LEFT JOIN inv_inventory inv ON inv.product_id=p.id
       LEFT JOIN inv_inventory_logs il ON il.product_id=p.id AND il.company_id=p.company_id
       WHERE p.company_id=$5 GROUP BY p.id,inv.quantity ORDER BY p.product_code`,
      [from,to,from,to,companyId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.get('/reports/revenue', invAuth, async (req, res) => {
  try {
    const companyId=req.user.company_id, now=new Date();
    const from=req.query.from||`${now.getFullYear()}-01-01`, to=req.query.to||now.toISOString().slice(0,10);
    const rows=await query(
      `SELECT p.id,p.product_code,p.name,p.unit,p.cost_price::float8,p.sell_price::float8,p.category,
              COALESCE(inv.quantity,0)::float8 AS stock,
              COALESCE(import_data.total_import_cost,0)::float8 AS total_import_cost,
              COALESCE(sale_data.total_revenue,0)::float8 AS total_revenue,
              COALESCE(sale_data.total_cogs,0)::float8 AS total_cogs,
              (COALESCE(sale_data.total_revenue,0)-COALESCE(sale_data.total_cogs,0))::float8 AS profit,
              (COALESCE(inv.quantity,0)*p.cost_price)::float8 AS inventory_value
       FROM inv_products p LEFT JOIN inv_inventory inv ON inv.product_id=p.id
       LEFT JOIN (SELECT product_id, SUM(quantity*price) AS total_import_cost FROM inv_inventory_logs WHERE type IN ('import','init') AND company_id=$1 GROUP BY product_id) import_data ON import_data.product_id=p.id
       LEFT JOIN (SELECT ii.product_id,
                    SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.quantity*ii.unit_price ELSE -(ii.quantity*ii.unit_price) END) AS total_revenue,
                    SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.quantity*ii.cost_price ELSE -(ii.quantity*ii.cost_price) END) AS total_cogs
                  FROM inv_invoice_items ii JOIN inv_invoices i ON i.id=ii.invoice_id
                  WHERE i.company_id=$2 AND i.date BETWEEN $3 AND $4 GROUP BY ii.product_id) sale_data ON sale_data.product_id=p.id
       WHERE p.company_id=$5 ORDER BY p.product_code`,
      [companyId,companyId,from,to,companyId]
    );
    const totals=rows.reduce((a,r)=>({total_import_cost:a.total_import_cost+Number(r.total_import_cost),total_revenue:a.total_revenue+Number(r.total_revenue),profit:a.profit+Number(r.profit),inventory_value:a.inventory_value+Number(r.inventory_value)}),{total_import_cost:0,total_revenue:0,profit:0,inventory_value:0});
    res.json({ rows, totals });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.get('/reports/category-revenue', invAuth, async (req, res) => {
  try {
    const companyId=req.user.company_id, now=new Date();
    const from=req.query.from||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const to=req.query.to||now.toISOString().slice(0,10);

    const catRows=await query(
      `SELECT COALESCE(NULLIF(p.category,''),'Không phân loại') AS category,
              SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.total_price ELSE -ii.total_price END)::float8 AS revenue,
              SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.quantity*ii.cost_price ELSE -(ii.quantity*ii.cost_price) END)::float8 AS cogs,
              COUNT(DISTINCT ii.product_id)::int AS product_count,
              SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.quantity ELSE -ii.quantity END)::float8 AS total_qty
       FROM inv_invoice_items ii JOIN inv_invoices i ON i.id=ii.invoice_id JOIN inv_products p ON p.id=ii.product_id
       WHERE i.company_id=$1 AND i.date BETWEEN $2 AND $3
       GROUP BY COALESCE(NULLIF(p.category,''),'Không phân loại')
       HAVING SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.total_price ELSE -ii.total_price END)>0
       ORDER BY revenue DESC`,
      [companyId,from,to]
    );

    const productRows=await query(
      `SELECT COALESCE(NULLIF(p.category,''),'Không phân loại') AS category, ii.product_name AS name, p.product_code,
              SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.total_price ELSE -ii.total_price END)::float8 AS revenue,
              SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.quantity*ii.cost_price ELSE -(ii.quantity*ii.cost_price) END)::float8 AS cogs,
              SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.quantity ELSE -ii.quantity END)::float8 AS qty
       FROM inv_invoice_items ii JOIN inv_invoices i ON i.id=ii.invoice_id JOIN inv_products p ON p.id=ii.product_id
       WHERE i.company_id=$1 AND i.date BETWEEN $2 AND $3 GROUP BY ii.product_id,ii.product_name,p.category,p.product_code
       HAVING SUM(CASE WHEN i.is_return=0 OR i.is_return IS NULL THEN ii.total_price ELSE -ii.total_price END)>0
       ORDER BY revenue DESC`,
      [companyId,from,to]
    );

    const totalRevenue=catRows.reduce((s,r)=>s+Number(r.revenue),0);
    const totalProfit=catRows.reduce((s,r)=>s+(Number(r.revenue)-Number(r.cogs)),0);
    const categories=catRows.map(c=>({
      ...c, revenue:Number(c.revenue), cogs:Number(c.cogs), profit:Number(c.revenue)-Number(c.cogs),
      pct:totalRevenue>0?((Number(c.revenue)/totalRevenue)*100).toFixed(1):'0.0',
      products:productRows.filter(p=>p.category===c.category).map(p=>({...p,revenue:Number(p.revenue),cogs:Number(p.cogs),profit:Number(p.revenue)-Number(p.cogs)}))
    }));
    res.json({ categories, totalRevenue, totalProfit });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

module.exports = router;
