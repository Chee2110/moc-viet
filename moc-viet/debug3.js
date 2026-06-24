// Test RptInvPage component in isolation
const part1 = `function RptInvPage(){const[from,setFrom]=F.useState(new Date().getFullYear()+"-01-01");const[to,setTo]=F.useState(new Date().toISOString().slice(0,10));const[rows,setRows]=F.useState([]);const[totals,setTotals]=F.useState({total_revenue:0,total_collected:0,total_debt:0,count:0});const[loading,setLoading]=F.useState(!1);const load=F.useCallback(async()=>{setLoading(!0);try{const r=await Le.get("/reports/invoices",{params:{from,to}});setRows(r.data.rows||[]);setTotals(r.data.totals||{});}catch(e){}finally{setLoading(!1);};},[from,to]);F.useEffect(()=>{load();},[load]);const dLbl={pending:"Chưa giao",delivering:"Đang giao",delivered:"Đã giao"};return 1;}`;
try { new Function(part1); console.log('Part1 OK'); } catch(e) { console.log('Part1 ERR:', e.message); }

// Test RptCusPage in isolation
const part2 = `function RptCusPage(){const[from,setFrom]=F.useState(new Date().getFullYear()+"-01-01");const[to,setTo]=F.useState(new Date().toISOString().slice(0,10));const[rows,setRows]=F.useState([]);const[loading,setLoading]=F.useState(!1);const load=F.useCallback(async()=>{setLoading(!0);try{const r=await Le.get("/reports/customers",{params:{from,to}});setRows(r.data||[]);}catch(e){}finally{setLoading(!1);};},[from,to]);F.useEffect(()=>{load();},[load]);return 1;}`;
try { new Function(part2); console.log('Part2 OK'); } catch(e) { console.log('Part2 ERR:', e.message); }

// Test problem: arrow character in JSX
const arrow = `function x(){return p.jsx("span",{children:"→"});}`;
try { new Function(arrow); console.log('Arrow OK'); } catch(e) { console.log('Arrow ERR:', e.message); }

// Check the map with key after
const mapWithKey = `function x(){return rows.map(k=>p.jsxs("tr",{children:[p.jsx("td",{})]},k.id))}`;
try { new Function(mapWithKey); console.log('Map with key OK'); } catch(e) { console.log('Map with key ERR:', e.message); }

// Test the rows.map callback ending
const mapEnd = `function x(){return rows.map(k=>p.jsxs("tr",{className:"hover:bg-gray-50 border-b",children:[p.jsx("td",{children:k.invoice_number})]},k.id))}`;
try { new Function(mapEnd); console.log('MapEnd OK'); } catch(e) { console.log('MapEnd ERR:', e.message); }
