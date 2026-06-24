const xlsx = require('xlsx');

const filePath = 'test_plan.xlsx';
const wb = xlsx.readFile(filePath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const stringMap = {
  "งานยังไม่เริ่ม Step 1": "งานยังไม่เริ่ม",
  "วันที่ต้องส่งมอบ": "วันครบกำหนดส่งมอบ",
  "เลขที่ใบสั่งซื้อ/จ้าง": "เลขที่ใบสั่งซื้อ (PO Number)",
  "คณะกรรมการตรวจรับ": "กรรมการตรวจรับ",
  "เจ้าหน้าที่บริหารสัญญา": "ผู้รับผิดชอบงานบริหารสัญญา",
  "งานล่าช้า": "ล่าช้ากว่ากำหนด",
  "แนวโน้มงาน": "แนวโน้มปริมาณงาน (6 เดือนล่าสุด)",
  "ช่วงจัดซื้อ/จัดจ้าง": "ระยะเวลาการทำงานจัดซื้อ/จ้าง",
  "ช่วงบริหารสัญญา": "ระยะเวลาการทำงานบริหารสัญญา",
  "แจ้งเพื่อทราบ": "รับทราบ"
};

let modifiedCount = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row[0] || !row[0].startsWith('TC-')) continue;
  
  const tcNum = parseInt(row[0].replace('TC-', ''));
  if (tcNum >= 300) {
    // Check steps and expected result
    for (let col of [5, 6]) { // 5: steps, 6: expectedResult
      let cellText = row[col];
      if (typeof cellText === 'string') {
        let newText = cellText;
        for (const [oldStr, newStr] of Object.entries(stringMap)) {
          // Replace using string replacement (global flag not needed since we want exact phrase, but we can use split/join for safety)
          newText = newText.split(`"${oldStr}"`).join(`"${newStr}"`);
          newText = newText.split(`(${oldStr})`).join(`(${newStr})`);
          // Sometimes it might be plain text without quotes, though the test plan uses ("...")
        }
        
        if (newText !== cellText) {
          row[col] = newText;
          modifiedCount++;
        }
      }
    }
  }
}

if (modifiedCount > 0) {
  const newSheet = xlsx.utils.aoa_to_sheet(data);
  wb.Sheets[sheetName] = newSheet;
  xlsx.writeFile(wb, filePath);
  console.log(`Updated UI strings in ${modifiedCount} cells.`);
} else {
  console.log('No UI strings needed updating or not found.');
}
