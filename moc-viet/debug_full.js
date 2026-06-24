const fs = require('fs');
let src = fs.readFileSync('c:/Users/Admin/OneDrive/Desktop/MOC VIET/moc-viet/public/admin/inv/assets/index-DPc7HcZ_.js', 'utf8');

function rep(label, oldStr, newStr) {
  if (!src.includes(oldStr)) { console.log('FAIL [' + label + ']: not found'); process.exit(1); }
  src = src.replace(oldStr, newStr);
  try { new Function(src); console.log('OK+SYNTAX [' + label + ']'); }
  catch(e) { console.log('SYNTAX ERR after [' + label + ']:', e.message); process.exit(1); }
}

// 1
rep('rev-hdr',
  'p.jsx("th",{className:"table-th text-right",children:"Tổng tiền nhập"}),p.jsx("th",{className:"table-th text-right",children:"Tổng tiền bán"}),',
  '');
// 2-3
rep('rev-cs-load',
  'colSpan:11,className:"table-td text-center text-gray-400 py-8",children:"Đang tải..."',
  'colSpan:9,className:"table-td text-center text-gray-400 py-8",children:"Đang tải..."');
rep('rev-cs-empty',
  'colSpan:11,className:"table-td text-center text-gray-400 py-8",children:"Chưa có dữ liệu"',
  'colSpan:9,className:"table-td text-center text-gray-400 py-8",children:"Chưa có dữ liệu"');
// 4
rep('rev-data',
  'p.jsx("td",{className:"table-td text-right text-primary",children:qe(S.total_import_cost)}),p.jsx("td",{className:"table-td text-right text-green-700",children:qe(S.total_revenue)}),',
  '');
// 5
rep('rev-profit',
  'className:`font-semibold ${S.profit>=0?"text-green-700":"text-red-600"}`,children:[S.profit>=0?"+":"",qe(S.profit)]',
  'className:`font-semibold ${S.sell_price-S.cost_price>=0?"text-green-700":"text-red-600"}`,children:[S.sell_price-S.cost_price>=0?"+":"",qe(S.sell_price-S.cost_price)]');
// 6
rep('nav-nL',
  '{to:"/",icon:GM,label:"Dashboard",exact:!0},{to:"/products",icon:Dp,label:"Thống kê sản phẩm"},{to:"/revenue",icon:sw,label:"Thống kê doanh thu"},{to:"/categories",icon:QM,label:"Tỷ lệ danh mục"},{to:"/import-data",icon:rL,label:"Dữ liệu nhà cung cấp"},{to:"/invoices",icon:VM,label:"Hóa đơn"},{to:"/customers",icon:tL,label:"Khách hàng"}',
  '{to:"/",icon:GM,label:"Dashboard",exact:!0},{to:"/products",icon:Dp,label:"Thống kê sản phẩm"},{to:"/revenue",icon:sw,label:"Thống kê doanh thu"},{hd:!0,icon:QM,label:"Báo cáo"},{to:"/categories",icon:QM,label:"Danh mục",sub:!0},{to:"/report-invoices",icon:sw,label:"Hoá đơn",sub:!0},{to:"/report-customers",icon:tL,label:"Khách hàng",sub:!0},{to:"/import-data",icon:rL,label:"Dữ liệu nhà cung cấp"},{to:"/invoices",icon:VM,label:"Đơn hàng"},{to:"/customers",icon:tL,label:"Khách hàng"}');
// 7
const oldNavRender = 'children:nL.map(({to:a,icon:i,label:s,exact:o})=>p.jsxs(S_,{to:a,end:o,className:({isActive:l})=>`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${l?"bg-red-50 text-red-700 border-l-[3px] border-red-500":"text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"}`,children:[p.jsx(i,{size:18}),s]},a))';
const newNavRender  = 'children:nL.map(({to:a,icon:i,label:s,exact:o,sub:sb,hd:hd})=>hd?p.jsxs("div",{onClick:()=>sO(v=>!v),className:"flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent",children:[p.jsxs("div",{className:"flex items-center gap-3",children:[p.jsx(i,{size:18}),s]}),p.jsx(BM,{size:14,className:"text-gray-400 transition-transform duration-200 "+(hO?"rotate-180":"rotate-0")})]},s):sb?hO?p.jsxs(S_,{to:a,className:({isActive:l})=>"flex items-center gap-3 pl-8 pr-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 "+(l?"bg-red-50 text-red-700 border-l-[3px] border-red-500":"text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"),children:[p.jsx(i,{size:18}),s]},a):null:p.jsxs(S_,{to:a,end:o,className:({isActive:l})=>"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 "+(l?"bg-red-50 text-red-700 border-l-[3px] border-red-500":"text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"),children:[p.jsx(i,{size:18}),s]},a))';
rep('nav-render', oldNavRender, newNavRender);
// 8
rep('nav-state',
  'function aL(){const{user:e,logout:t}=Ip(),r=rc(),n=()=>{t(),r("/login")};return',
  'function aL(){const{user:e,logout:t}=Ip(),r=rc(),n=()=>{t(),r("/login")};const[hO,sO]=F.useState(!1);return');
// 9
rep('inv-title',
  'children:"Hóa đơn"}),p.jsxs("p",{className:"text-gray-500 text-sm mt-0.5",children:[t.length," hóa đơn"',
  'children:"Đơn hàng"}),p.jsxs("p",{className:"text-gray-500 text-sm mt-0.5",children:[t.length," đơn hàng"');
// 10
rep('inv-hdr',
  'p.jsx("th",{className:"table-th",children:"Số HĐ"}),p.jsx("th",{className:"table-th",children:"Ngày xuất"}),p.jsx("th",{className:"table-th",children:"Khách hàng"}),p.jsx("th",{className:"table-th text-right",children:"Tổng tiền"}),p.jsx("th",{className:"table-th text-center",children:"Trạng thái"}),p.jsx("th",{className:"table-th text-center",children:"Thao tác"})',
  'p.jsx("th",{className:"table-th",children:"Số HĐ"}),p.jsx("th",{className:"table-th",children:"Ngày xuất"}),p.jsx("th",{className:"table-th",children:"Khách hàng"}),p.jsx("th",{className:"table-th text-right",children:"Tổng tiền"}),p.jsx("th",{className:"table-th text-right",children:"Thực thu"}),p.jsx("th",{className:"table-th text-right",children:"Công nợ"}),p.jsx("th",{className:"table-th text-center",children:"TT Thanh toán"}),p.jsx("th",{className:"table-th text-center",children:"TT Đơn hàng"}),p.jsx("th",{className:"table-th text-center",children:"Thao tác"})');
// 11
rep('inv-cs1','colSpan:6,className:"table-td text-center text-gray-400 py-8",children:"Đang tải..."',
              'colSpan:9,className:"table-td text-center text-gray-400 py-8",children:"Đang tải..."');
rep('inv-cs2','colSpan:6,className:"table-td text-center text-gray-400 py-8",children:"Chưa có hóa đơn nào"',
              'colSpan:9,className:"table-td text-center text-gray-400 py-8",children:"Chưa có đơn hàng nào"');
// 12
rep('inv-row',
  'p.jsx("td",{className:"table-td text-center",children:k.is_return?p.jsxs("span",{className:"badge-red flex items-center gap-1 w-fit mx-auto",children:[p.jsx(GC,{size:12})," Hoàn hàng"]}):p.jsx("button",{onClick:()=>E(k),title:"Nhấn để đổi trạng thái",className:"cursor-pointer hover:opacity-75 transition-opacity",children:k.status==="paid"?p.jsxs("span",{className:"badge-green flex items-center gap-1 w-fit mx-auto",children:[p.jsx(WC,{size:12})," Đã TT"]}):p.jsxs("span",{className:"badge-yellow flex items-center gap-1 w-fit mx-auto",children:[p.jsx(HC,{size:12})," Chưa TT"]})})})',
  'p.jsx("td",{className:"table-td text-right",children:p.jsx("input",{type:"number",min:0,defaultValue:Number(k.collected_amount)||0,onBlur:async e=>{const v=Math.max(0,Number(e.target.value)||0);try{const rs=await Le.patch("/invoices/"+k.id+"/collect",{collected_amount:v});r(prev=>prev.map(row=>String(row.id)===String(k.id)?{...row,collected_amount:v,status:rs.data.status}:row));}catch(err){alert("Lỗi cập nhật thực thu");}},onKeyDown:e=>{if(e.key==="Enter")e.target.blur();},className:"w-24 text-right px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary"})}),' +
  'p.jsx("td",{className:"table-td text-right font-medium "+(Number(k.total_amount)-Number(k.collected_amount||0)>0?"text-red-600":"text-green-700"),children:qe(Number(k.total_amount)-Number(k.collected_amount||0))}),' +
  'p.jsx("td",{className:"table-td text-center",children:k.is_return?p.jsxs("span",{className:"badge-red flex items-center gap-1 w-fit mx-auto",children:[p.jsx(GC,{size:12})," Hoàn hàng"]}):k.status==="paid"?p.jsxs("span",{className:"badge-green flex items-center gap-1 w-fit mx-auto",children:[p.jsx(WC,{size:12})," Đã TT"]}):k.status==="partial"?p.jsx("span",{className:"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800",children:"TT 1 phần"}):p.jsxs("span",{className:"badge-yellow flex items-center gap-1 w-fit mx-auto",children:[p.jsx(HC,{size:12})," Chưa TT"]})}),' +
  'p.jsx("td",{className:"table-td text-center",children:p.jsx("select",{value:k.delivery_status||"pending",onChange:async e=>{const v=e.target.value;try{await Le.patch("/invoices/"+k.id+"/delivery",{delivery_status:v});r(prev=>prev.map(row=>String(row.id)===String(k.id)?{...row,delivery_status:v}:row));}catch(err){alert("Lỗi cập nhật");}},className:"text-xs border border-gray-200 rounded px-1 py-0.5",children:[p.jsx("option",{value:"pending",children:"Chưa giao"}),p.jsx("option",{value:"delivering",children:"Đang giao"}),p.jsx("option",{value:"delivered",children:"Đã giao"})]})})'
);
// 13
rep('price-cost',
  'type:"number",className:"input",placeholder:"0",value:s.cost_price,onChange:c=>l("cost_price",c.target.value),min:0',
  'type:"text",inputMode:"numeric",className:"input",placeholder:"0",value:s.cost_price?Number(String(s.cost_price).replace(/,/g,"")).toLocaleString("en-US"):"",onChange:c=>l("cost_price",c.target.value.replace(/[^0-9]/g,""))');
rep('price-sell',
  'type:"number",className:"input",placeholder:"0",value:s.sell_price,onChange:c=>l("sell_price",c.target.value),min:0',
  'type:"text",inputMode:"numeric",className:"input",placeholder:"0",value:s.sell_price?Number(String(s.sell_price).replace(/,/g,"")).toLocaleString("en-US"):"",onChange:c=>l("sell_price",c.target.value.replace(/[^0-9]/g,""))');

console.log('All patches OK, bundle size:', src.length);
