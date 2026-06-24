const xlsx = require('xlsx');
const wb = xlsx.readFile('test_plan.xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''});
const thaiStrings = new Set();
data.slice(1).forEach(r => {
  if (r[0] && r[0].startsWith('TC-') && parseInt(r[0].replace('TC-', '')) >= 300) {
    const text = r[5] + ' ' + r[6];
    const regex = /\(\"([^"]+)\"\)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      thaiStrings.add(match[1]);
    }
  }
});
console.log(JSON.stringify(Array.from(thaiStrings), null, 2));
