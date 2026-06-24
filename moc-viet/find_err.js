const fs = require('fs');
const patch = fs.readFileSync('c:/Users/Admin/OneDrive/Desktop/MOC VIET/moc-viet/patch_all.js','utf8');
const start = patch.indexOf('const reportComponents = `') + 'const reportComponents = `'.length;
const end = patch.indexOf('function RptCusPage', start);
const comp = patch.slice(start, end);

// Count brackets at position 4093
const pos = 4093;
const s = comp.slice(0, pos);
let stack = [];
let inStr = false, strChar = '', escaped = false;
for (let i=0; i<s.length; i++) {
  const c = s[i];
  if (escaped) { escaped = false; continue; }
  if (c === '\\') { escaped = true; continue; }
  if (!inStr && (c === '"' || c === "'")) { inStr = true; strChar = c; continue; }
  if (inStr && c === strChar) { inStr = false; continue; }
  if (inStr) continue;
  if ('([{'.includes(c)) stack.push(c);
  if (')]}'.includes(c)) stack.pop();
}
console.log('Stack depth:', stack.length);
console.log('Last 20 opens:', stack.slice(-20).join(''));

// Also print everything between map( and position 4093
const mapIdx = comp.lastIndexOf('.map(k=>', pos);
console.log('\nMap starts at char:', mapIdx);
console.log('Content from map to pos:', comp.slice(mapIdx, pos+5));
