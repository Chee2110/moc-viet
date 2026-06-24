const fs = require('fs');
let src = fs.readFileSync('c:/Users/Admin/OneDrive/Desktop/MOC VIET/moc-viet/public/admin/inv/assets/index-DPc7HcZ_.js', 'utf8');

// Find the customer form section in the ORIGINAL bundle (before any patches)
const CUST_START = 'title:t?"Sửa khách hàng":"Thêm khách hàng mới",children:p.jsxs("div",{className:"space-y-4"';
const CUST_END   = ',children:a?"Đang lưu...":"Lưu"})]})]})})}';

const si = src.indexOf(CUST_START);
const ei = src.indexOf(CUST_END, si);
console.log('In ORIGINAL bundle: si=', si, 'ei=', ei);
if (si >= 0 && ei >= 0) {
  console.log('Captured range:', ei - si + CUST_END.length, 'chars');
  const captured = src.slice(si, ei + CUST_END.length);
  console.log('Last 100:', JSON.stringify(captured.slice(-100)));
  // What does the full capture look like at the end?
  console.log('\nAfter CUST_END in original (next 80):', JSON.stringify(src.slice(ei + CUST_END.length, ei + CUST_END.length + 80)));
}

// Now show what replacement we're making
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

console.log('\nnewForm last 50:', JSON.stringify(newForm.slice(-50)));
console.log('The suffix we append after newForm: "})})}"\n');

// Let's build the replacement and test its syntax
const replacement =
  'title:t?"Sửa khách hàng":"Thêm khách hàng mới",children:' +
  newForm +
  '})})}';
console.log('replacement last 80:', JSON.stringify(replacement.slice(-80)));

// Test newForm alone
try { new Function('function f(){return ' + newForm + '}'); console.log('newForm syntax OK'); }
catch(e) { console.log('newForm syntax ERR:', e.message); }

// Check what comes before CUST_START in original
if (si >= 0) {
  console.log('\nBefore CUST_START (80 chars):', JSON.stringify(src.slice(si-80, si)));
}
