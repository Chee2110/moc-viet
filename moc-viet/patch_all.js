const fs = require('fs');
let src = fs.readFileSync('c:/Users/Admin/OneDrive/Desktop/MOC VIET/moc-viet/public/admin/inv/assets/index-DPc7HcZ_.js', 'utf8');
const orig = src.length;

function rep(label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    if (src.includes(newStr)) {
      console.log('SKIP [' + label + ']: already applied');
      return;
    }
    console.log('FAIL [' + label + ']: not found');
    process.exit(1);
  }
  src = src.replace(oldStr, newStr);
  console.log('OK  [' + label + ']');
}

// ── 1-5. Revenue stats: Restored original columns (Tổng tiền nhập, Tổng tiền bán, Lợi nhuận tổng) as requested by user ──

// ── 10-12. Invoices: Restored original 6-column layout (Số HĐ, Ngày xuất, Khách hàng, Tổng tiền, Trạng thái, Thao tác) as requested by user ──

// ── 13. Price inputs: comma formatting ───────────────────────────────────────
rep('price-cost',
  'type:"number",className:"input",placeholder:"0",value:s.cost_price,onChange:c=>l("cost_price",c.target.value),min:0',
  'type:"text",inputMode:"numeric",className:"input",placeholder:"0",value:s.cost_price?Number(String(s.cost_price).replace(/,/g,"")).toLocaleString("en-US"):"",onChange:c=>l("cost_price",c.target.value.replace(/[^0-9]/g,""))');
rep('price-sell',
  'type:"number",className:"input",placeholder:"0",value:s.sell_price,onChange:c=>l("sell_price",c.target.value),min:0',
  'type:"text",inputMode:"numeric",className:"input",placeholder:"0",value:s.sell_price?Number(String(s.sell_price).replace(/,/g,"")).toLocaleString("en-US"):"",onChange:c=>l("sell_price",c.target.value.replace(/[^0-9]/g,""))');

// ── 14. Report components ─────────────────────────────────────────────────────
const reportComponents = `function RptInvPage(){const[from,setFrom]=F.useState(new Date().getFullYear()+"-01-01");const[to,setTo]=F.useState(new Date().toISOString().slice(0,10));const[rows,setRows]=F.useState([]);const[totals,setTotals]=F.useState({total_revenue:0,total_collected:0,total_debt:0,count:0});const[loading,setLoading]=F.useState(!1);const load=F.useCallback(async()=>{setLoading(!0);try{const r=await Le.get("/reports/invoices",{params:{from,to}});setRows(r.data.rows||[]);setTotals(r.data.totals||{});}catch(e){}finally{setLoading(!1);};},[from,to]);F.useEffect(()=>{load();},[load]);const dLbl={pending:"Chưa giao",delivering:"Đang giao",delivered:"Đã giao"};return p.jsxs("div",{className:"p-6 space-y-5",children:[p.jsx("h1",{className:"text-xl font-bold text-gray-800",children:"Báo cáo hoá đơn"}),p.jsxs("div",{className:"flex items-center gap-3",children:[p.jsx("input",{type:"date",value:from,onChange:e=>setFrom(e.target.value),className:"input"}),p.jsx("span",{className:"text-gray-400",children:"→"}),p.jsx("input",{type:"date",value:to,onChange:e=>setTo(e.target.value),className:"input"}),p.jsx("button",{onClick:load,className:"btn-primary",children:"Lọc"})]}),p.jsxs("div",{className:"grid grid-cols-4 gap-4",children:[p.jsxs("div",{className:"bg-white p-4 rounded-xl border",children:[p.jsx("p",{className:"text-xs text-gray-500",children:"Tổng đơn"}),p.jsx("p",{className:"text-xl font-bold text-gray-800",children:totals.count||0})]}),p.jsxs("div",{className:"bg-white p-4 rounded-xl border",children:[p.jsx("p",{className:"text-xs text-gray-500",children:"Doanh thu"}),p.jsx("p",{className:"text-xl font-bold text-gray-800",children:qe(totals.total_revenue||0)})]}),p.jsxs("div",{className:"bg-white p-4 rounded-xl border",children:[p.jsx("p",{className:"text-xs text-gray-500",children:"Đã thu"}),p.jsx("p",{className:"text-xl font-bold text-green-700",children:qe(totals.total_collected||0)})]}),p.jsxs("div",{className:"bg-white p-4 rounded-xl border border-red-100",children:[p.jsx("p",{className:"text-xs text-gray-500",children:"Còn nợ"}),p.jsx("p",{className:"text-xl font-bold text-red-600",children:qe(totals.total_debt||0)})]})]}),p.jsx("div",{className:"bg-white rounded-xl border overflow-hidden",children:p.jsx("table",{className:"w-full",children:p.jsxs("tbody",{children:[p.jsxs("tr",{className:"bg-gray-50 border-b",children:[p.jsx("th",{className:"table-th",children:"Số HĐ"}),p.jsx("th",{className:"table-th",children:"Ngày"}),p.jsx("th",{className:"table-th",children:"Khách hàng"}),p.jsx("th",{className:"table-th text-right",children:"Tổng tiền"}),p.jsx("th",{className:"table-th text-right",children:"Đã thu"}),p.jsx("th",{className:"table-th text-right",children:"Còn nợ"}),p.jsx("th",{className:"table-th text-center",children:"TT TT"}),p.jsx("th",{className:"table-th text-center",children:"TT Giao"})]}),loading?p.jsx("tr",{children:p.jsx("td",{colSpan:8,className:"table-td text-center py-8 text-gray-400",children:"Đang tải..."})}):rows.length===0?p.jsx("tr",{children:p.jsx("td",{colSpan:8,className:"table-td text-center py-8 text-gray-400",children:"Chưa có dữ liệu"})}):rows.map(k=>p.jsxs("tr",{className:"hover:bg-gray-50 border-b",children:[p.jsx("td",{className:"table-td font-mono text-xs text-primary font-semibold",children:k.invoice_number}),p.jsx("td",{className:"table-td text-gray-600",children:Fm(k.date)}),p.jsx("td",{className:"table-td font-medium",children:k.customer_name}),p.jsx("td",{className:"table-td text-right font-semibold",children:qe(k.total_amount)}),p.jsx("td",{className:"table-td text-right text-green-700",children:qe(k.collected_amount||0)}),p.jsx("td",{className:"table-td text-right "+(k.debt>0?"text-red-600 font-medium":"text-green-700"),children:qe(k.debt||0)}),p.jsx("td",{className:"table-td text-center",children:k.status==="paid"?p.jsx("span",{className:"badge-green",children:"Đã TT"}):k.status==="partial"?p.jsx("span",{className:"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800",children:"1 phần"}):p.jsx("span",{className:"badge-yellow",children:"Chưa TT"})}),p.jsx("td",{className:"table-td text-center text-xs text-gray-600",children:dLbl[k.delivery_status||"pending"]})]},k.id))]})})})]})}
function RptCusPage(){const[from,setFrom]=F.useState(new Date().getFullYear()+"-01-01");const[to,setTo]=F.useState(new Date().toISOString().slice(0,10));const[rows,setRows]=F.useState([]);const[loading,setLoading]=F.useState(!1);const load=F.useCallback(async()=>{setLoading(!0);try{const r=await Le.get("/reports/customers",{params:{from,to}});setRows(r.data||[]);}catch(e){}finally{setLoading(!1);};},[from,to]);F.useEffect(()=>{load();},[load]);return p.jsxs("div",{className:"p-6 space-y-5",children:[p.jsx("h1",{className:"text-xl font-bold text-gray-800",children:"Báo cáo khách hàng"}),p.jsxs("div",{className:"flex items-center gap-3",children:[p.jsx("input",{type:"date",value:from,onChange:e=>setFrom(e.target.value),className:"input"}),p.jsx("span",{className:"text-gray-400",children:"→"}),p.jsx("input",{type:"date",value:to,onChange:e=>setTo(e.target.value),className:"input"}),p.jsx("button",{onClick:load,className:"btn-primary",children:"Lọc"})]}),p.jsx("div",{className:"bg-white rounded-xl border overflow-hidden",children:p.jsx("table",{className:"w-full",children:p.jsxs("tbody",{children:[p.jsxs("tr",{className:"bg-gray-50 border-b",children:[p.jsx("th",{className:"table-th",children:"Mã KH"}),p.jsx("th",{className:"table-th",children:"Tên"}),p.jsx("th",{className:"table-th",children:"SĐT"}),p.jsx("th",{className:"table-th text-right",children:"Tổng mua"}),p.jsx("th",{className:"table-th text-right",children:"Đã thu"}),p.jsx("th",{className:"table-th text-right",children:"Còn nợ"}),p.jsx("th",{className:"table-th text-right",children:"Nợ 0-30"}),p.jsx("th",{className:"table-th text-right",children:"Nợ 30-60"}),p.jsx("th",{className:"table-th text-right",children:"Nợ >60"})]}),loading?p.jsx("tr",{children:p.jsx("td",{colSpan:9,className:"table-td text-center py-8 text-gray-400",children:"Đang tải..."})}):rows.length===0?p.jsx("tr",{children:p.jsx("td",{colSpan:9,className:"table-td text-center py-8 text-gray-400",children:"Chưa có dữ liệu"})}):rows.map(c=>p.jsxs("tr",{className:"hover:bg-gray-50 border-b",children:[p.jsx("td",{className:"table-td font-mono text-xs text-primary",children:c.customer_code}),p.jsx("td",{className:"table-td font-medium",children:c.name}),p.jsx("td",{className:"table-td text-gray-600",children:c.phone||"-"}),p.jsx("td",{className:"table-td text-right font-semibold",children:qe(c.total_purchase||0)}),p.jsx("td",{className:"table-td text-right text-green-700",children:qe(c.total_collected||0)}),p.jsx("td",{className:"table-td text-right font-medium "+(c.total_debt>0?"text-red-600":"text-green-700"),children:qe(c.total_debt||0)}),p.jsx("td",{className:"table-td text-right text-orange-600",children:qe(c.debt_0_30||0)}),p.jsx("td",{className:"table-td text-right text-red-500",children:qe(c.debt_30_60||0)}),p.jsx("td",{className:"table-td text-right text-red-700 font-semibold",children:qe(c.debt_60plus||0)})]},c.id))]})})})]})}
`;
if (src.includes('function RptInvPage(){') && src.includes('function RptCusPage(){')) {
  console.log('SKIP [rpt-components]: already applied');
} else {
  rep('rpt-components', 'function ibe(){return p.jsx(RM,', reportComponents + 'function ibe(){return p.jsx(RM,');
}

// ── 15. Report routes ─────────────────────────────────────────────────────────
rep('rpt-routes',
  'p.jsx(Hr,{path:"settings",element:p.jsx(qwe,{})})]}),p.jsx(Hr,{path:"*"',
  'p.jsx(Hr,{path:"settings",element:p.jsx(qwe,{})}),p.jsx(Hr,{path:"report-invoices",element:p.jsx(RptInvPage,{})}),p.jsx(Hr,{path:"report-customers",element:p.jsx(RptCusPage,{})})]}),p.jsx(Hr,{path:"*"');

// ── 16. Customer form state ───────────────────────────────────────────────────
rep('cust-init',
  'F.useState({customer_code:"",name:"",phone:"",email:"",address:"",note:""})',
  'F.useState({customer_code:"",name:"",phone:"",email:"",address:"",note:"",company_name:"",company_address:"",company_phone:"",contact_name:"",delivery_address:"",contact_phone:""})');
rep('cust-edit',
  't?{customer_code:t.customer_code||"",name:t.name||"",phone:t.phone||"",email:t.email||"",address:t.address||"",note:t.note||""}',
  't?{customer_code:t.customer_code||"",name:t.name||"",phone:t.phone||"",email:t.email||"",address:t.address||"",note:t.note||"",company_name:t.company_name||"",company_address:t.company_address||"",company_phone:t.company_phone||"",contact_name:t.contact_name||"",delivery_address:t.delivery_address||"",contact_phone:t.contact_phone||""}');
rep('cust-reset',
  ':{customer_code:"",name:"",phone:"",email:"",address:"",note:""}',
  ':{customer_code:"",name:"",phone:"",email:"",address:"",note:"",company_name:"",company_address:"",company_phone:"",contact_name:"",delivery_address:"",contact_phone:""}');

// ── 17. Customer form JSX: complete restructure ───────────────────────────────
const L = (text, req) => req
  ? `p.jsxs("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:["${text} ",p.jsx("span",{className:"text-red-500",children:"*"})]})`
  : `p.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"${text}"})`;
const I = (f, ph, extra='') =>
  `p.jsx("input",{className:"input",placeholder:"${ph}",value:i.${f},onChange:l=>o("${f}",l.target.value)${extra}})`;
const R = (lb, inpx) => `p.jsxs("div",{children:[${lb},${inpx}]})`;

const fields = [
  R(L('Mã khách hàng'),               I('customer_code','Tự sinh nếu để trống')),
  R(L('Tên công ty'),                  I('company_name','Tên công ty')),
  R(L('Địa chỉ công ty'),              I('company_address','Địa chỉ công ty')),
  R(L('Số điện thoại công ty'),        I('company_phone','SĐT công ty')),
  R(L('Tên người liên hệ',true),       I('name','Nhập tên người liên hệ',',required:!0')),
  R(L('Địa chỉ nhận hàng',true),       I('delivery_address','Địa chỉ nhận hàng',',required:!0')),
  R(L('Số điện thoại người liên hệ',true), I('contact_phone','SĐT người liên hệ',',required:!0')),
  `p.jsxs("div",{children:[${L('Ghi chú')},p.jsx("textarea",{className:"input resize-none",rows:2,placeholder:"Ghi chú thêm...",value:i.note,onChange:l=>o("note",l.target.value)})]})`,
].join(',');

const buttons = `p.jsxs("div",{className:"flex gap-3 pt-2",children:[p.jsx("button",{className:"btn-secondary flex-1",onClick:r,children:"Hủy"}),p.jsx("button",{className:"btn-primary flex-1 justify-center",disabled:a||!i.name||!i.delivery_address||!i.contact_phone,onClick:()=>n(i),children:a?"Đang lưu...":"Lưu"})]})`;
const newForm = `p.jsxs("div",{className:"space-y-3",children:[${fields},${buttons}]})`;

// Use the unique anchor: modal title + children
const CUST_START = 'title:t?"Sửa khách hàng":"Thêm khách hàng mới",children:p.jsxs("div",{className:"space-y-4"';
const CUST_END   = ',children:a?"Đang lưu...":"Lưu"})]})]})})}';

const si = src.indexOf(CUST_START);
if (si < 0) {
  if (src.includes('Tên người liên hệ') && src.includes('Địa chỉ nhận hàng')) {
    console.log('SKIP [cust-form]: already applied');
  } else {
    console.log('FAIL [cust-form]: start not found');
    process.exit(1);
  }
} else {
  const ei = src.indexOf(CUST_END, si);
  if (ei < 0) { console.log('FAIL [cust-form]: end not found'); process.exit(1); }

  // Verify length is reasonable (should be ~2000-5000 chars)
  console.log('[cust-form] range:', ei - si, 'chars');
  if (ei - si > 10000) { console.log('FAIL: range too large, wrong anchor'); process.exit(1); }

  src = src.slice(0, si) +
    'title:t?"Sửa khách hàng":"Thêm khách hàng mới",children:' + newForm +
    '})}' +
    src.slice(ei + CUST_END.length);
  console.log('OK  [cust-form]');
}

// ── 18. Product search dropdown in Stock Import ────────────────────────────────
const oldStockSelect = 'function Rue({open:e,products:t,onClose:r,onSubmit:n,saving:a}){const[i,s]=F.useState({product_id:"",quantity:"",price:"",date:qd(),note:"",supplier:""}),o=t.find(c=>c.id===Number(i.product_id));F.useEffect(()=>{e||s({product_id:"",quantity:"",price:"",date:qd(),note:"",supplier:""})},[e]),F.useEffect(()=>{o&&s(c=>({...c,price:o.cost_price??""}))},[i.product_id]);const l=(c,u)=>s(f=>({...f,[c]:u}));const[M_,N_]=F.useState([]);F.useEffect(()=>{if(!e)return;const tk=localStorage.getItem("bonci_token");if(!tk)return;fetch("/api/inv/products/meta",{headers:{"Authorization":"Bearer "+tk}}).then(x=>x.json()).then(d=>{if(d.distributors)N_(d.distributors)}).catch(()=>{})},[e]);return p.jsx(hs,{open:e,onClose:r,title:"Nhập kho",size:"sm",children:p.jsxs("div",{className:"space-y-4",children:[p.jsxs("div",{children:[p.jsxs("label",{className:"block text-sm font-medium text-gray-600 mb-1",children:["Sản phẩm ",p.jsx("span",{className:"text-red-500",children:"*"})]}),p.jsxs("select",{className:"input",value:i.product_id,onChange:c=>l("product_id",c.target.value),children:[p.jsx("option",{value:"",children:"-- Chọn sản phẩm --"}),t.map(c=>p.jsxs("option",{value:c.id,children:["[",c.product_code,"] ",c.name," (Tồn: ",c.stock,")"]},c.id))]})]}),';

const newStockSelect = 'function Rue({open:e,products:t,onClose:r,onSubmit:n,saving:a}){const[i,s]=F.useState({product_id:"",quantity:"",price:"",date:qd(),note:"",supplier:""}),[searchTerm,setSearchTerm]=F.useState(""),[isOpen,setIsOpen]=F.useState(!1),o=t.find(c=>String(c.id)===String(i.product_id));F.useEffect(()=>{e||(s({product_id:"",quantity:"",price:"",date:qd(),note:"",supplier:""}),setSearchTerm(""),setIsOpen(!1))},[e]),F.useEffect(()=>{o&&s(c=>({...c,price:o.cost_price??""}))},[i.product_id]);F.useEffect(()=>{o?setSearchTerm(`[${o.product_code}] ${o.name}`):setSearchTerm("")},[i.product_id,o]);const l=(c,u)=>s(f=>({...f,[c]:u}));const[M_,N_]=F.useState([]);F.useEffect(()=>{if(!e)return;const tk=localStorage.getItem("bonci_token");if(!tk)return;fetch("/api/inv/products/meta",{headers:{"Authorization":"Bearer "+tk}}).then(x=>x.json()).then(d=>{if(d.distributors)N_(d.distributors)}).catch(()=>{})},[e]);const filteredProducts=t.filter(c=>{const txt=`[${c.product_code}] ${c.name}`.toLowerCase();const curVal=o?`[${o.product_code}] ${o.name}`:"";if(searchTerm===curVal)return !0;return txt.includes(searchTerm.toLowerCase());});return p.jsx(hs,{open:e,onClose:r,title:"Nhập kho",size:"sm",children:p.jsxs("div",{className:"space-y-4",children:[p.jsxs("div",{children:[p.jsxs("label",{className:"block text-sm font-medium text-gray-600 mb-1",children:["Sản phẩm ",p.jsx("span",{className:"text-red-500",children:"*"}),i.product_id&&p.jsx("span",{className:"ml-2 text-xs text-green-600 font-normal",children:"✓ Từ danh sách"})]}),p.jsxs("div",{className:"relative",children:[p.jsx("input",{className:"input pr-8",placeholder:"Gõ tên hoặc mã để tìm...",value:searchTerm,onChange:c=>{setSearchTerm(c.target.value);l("product_id","");setIsOpen(!0);},onFocus:()=>setIsOpen(!0),onBlur:()=>setTimeout(()=>setIsOpen(!1),150)}),searchTerm&&p.jsx("button",{type:"button",className:"absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500",onMouseDown:ev=>{ev.preventDefault();setSearchTerm("");l("product_id","");},children:"✕"}),isOpen&&filteredProducts.length>0&&p.jsx("div",{className:"absolute top-full left-0 right-0 z-30 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto mt-0.5",children:filteredProducts.slice(0,20).map(c=>p.jsxs("button",{type:"button",className:"w-full text-left px-3 py-2.5 hover:bg-red-50 hover:text-red-700 text-sm border-b border-gray-50 last:border-b-0 transition-colors flex items-center justify-between",onMouseDown:ev=>{ev.preventDefault();l("product_id",String(c.id));setSearchTerm(`[${c.product_code}] ${c.name}`);setIsOpen(!1);},children:[p.jsxs("div",{children:[p.jsx("div",{className:"font-medium",children:c.name}),p.jsxs("div",{className:"text-xs text-gray-400 mt-0.5",children:["Giá nhập: ",c.cost_price?Number(c.cost_price).toLocaleString("vi-VN")+"đ":"0đ"," — Tồn kho: ",c.stock]})]}),p.jsx("span",{className:"text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded",children:c.product_code})]},c.id))})]})]}),';

rep('stock-search-dropdown', oldStockSelect, newStockSelect);

rep('stock-edit-input',
  'p.jsx("td",{className:"table-td text-right",children:p.jsxs("span",{className:ee.className,children:[ee.label," ",M.stock<=10?M.unit:""]})})',
  'p.jsx("td",{className:"table-td text-right",children:p.jsxs("div",{className:"flex items-center justify-end gap-1",children:[p.jsx("input",{type:"number",defaultValue:M.stock,onBlur:async e=>{const v=Number(e.target.value)||0;if(v===M.stock)return;try{await Le.patch("/products/"+M.id+"/stock",{stock:v});t(prev=>prev.map(row=>String(row.id)===String(M.id)?{...row,stock:v}:row));}catch(err){alert("Lỗi cập nhật tồn kho");e.target.value=M.stock;}},onKeyDown:e=>{if(e.key==="Enter")e.target.blur();},className:"w-20 text-right px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary"}),p.jsx("span",{className:"text-xs text-gray-400 w-8 text-left",children:M.unit})]})})'
);

// ── Syntax check & save ───────────────────────────────────────────────────────
try { new Function(src); console.log('\nSyntax OK. Size:', src.length, '(was', orig, ')'); }
catch(e) { console.log('SYNTAX ERR:', e.message); process.exit(1); }

fs.writeFileSync('c:/Users/Admin/OneDrive/Desktop/MOC VIET/moc-viet/public/admin/inv/assets/index-DPc7HcZ_.js', src, 'utf8');
console.log('All done. Saved.');
