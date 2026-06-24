const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'test_plan.xlsx';
const wb = xlsx.readFile(filePath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

let modifiedCount = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  for (let j = 0; j < row.length; j++) {
    const cell = row[j];
    if (typeof cell === 'string') {
      let fixedCell = cell;
      
      // 1. Remove all \r characters (fixing \r\r\r\r\r\n issues)
      if (fixedCell.includes('\r')) {
        fixedCell = fixedCell.replace(/\r/g, '');
      }

      // 2. Replace \n that does not precede a list marker with a space
      if (fixedCell.includes('\n')) {
        // Find \n that is NOT followed by optional spaces then digit. or - or * or •
        fixedCell = fixedCell.replace(/\n+(?!\s*(?:\d+\.|-|\*|•))/g, ' ');
      }

      // 3. Clean up any accidental double spaces created
      fixedCell = fixedCell.replace(/  +/g, ' ').trim();

      if (fixedCell !== cell) {
        row[j] = fixedCell;
        modifiedCount++;
      }
    }
  }
}

if (modifiedCount > 0) {
  const newSheet = xlsx.utils.aoa_to_sheet(data);
  wb.Sheets[sheetName] = newSheet;
  xlsx.writeFile(wb, filePath);
  console.log(`Sanitization complete. Fixed ${modifiedCount} cells with weird newlines/CRs.`);
} else {
  console.log('No weird newlines found to sanitize.');
}
