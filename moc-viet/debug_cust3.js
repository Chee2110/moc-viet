const fs = require('fs');
const src = fs.readFileSync('c:/Users/Admin/OneDrive/Desktop/MOC VIET/moc-viet/public/admin/inv/assets/index-DPc7HcZ_.js', 'utf8');

const CUST_START = 'title:t?"Sửa khách hàng":"Thêm khách hàng mới",children:p.jsxs("div",{className:"space-y-4"';
const CUST_END   = ',children:a?"Đang lưu...":"Lưu"})]})]})})}';

const si = src.indexOf(CUST_START);
const ei = src.indexOf(CUST_END, si);
const captured = src.slice(si, ei + CUST_END.length);
console.log('Captured length:', captured.length);

// Print last 60 chars character by character
const last60 = captured.slice(-60);
console.log('\nLast 60 chars:');
for (let i = 0; i < last60.length; i++) {
  const c = last60[i];
  const code = c.codePointAt(0);
  console.log(i + ': ' + JSON.stringify(c) + ' (U+' + code.toString(16).toUpperCase() + ')');
}

// Also print what's right before CUST_START
console.log('\nBefore (50):', JSON.stringify(src.slice(si - 50, si)));
