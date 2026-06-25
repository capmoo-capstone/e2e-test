const xlsx = require('xlsx');

const filePath = 'test_plan.xlsx';
const wb = xlsx.readFile(filePath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Update specific rows for TC-001 to TC-047
const updates = {
  // Login mappings
  'document staff': 'user `document_staff` with password `document_staff` (Role: Document Staff)',
  'representative': 'user `facilities_rep` with password `facilities_rep` (Role: Facilities Rep)',
  'guest': 'user `guest` with password `guest` (Role: Guest)',
  'finance staff': 'user `finance_staff` with password `finance_staff` (Role: Finance Staff)',
  'contract staff': 'user `contract` with password `contract` (Role: Contract)',
  'procurement staff': 'user `procurement1` with password `procurement1` (Role: Procurement1)',
  'procurement head': 'user `proc_head1` with password `proc_head1` (Role: Procurement Head1)',
  'Unit Representative': 'user `facilities_rep` with password `facilities_rep` (Role: Facilities Rep)',

  // Expected result updates
  'Error says only Excel files are supported': 'UI shows error: "รองรับเฉพาะไฟล์ Excel .xlsx และ .xls"',
  'Error says file must not exceed 50 rows': 'UI shows error indicating the file must not exceed 50 rows (Note: Exact message depends on implementation, e.g., "จำนวนแถวต้องไม่เกิน 50 แถว")',
};

let modifiedCount = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row[0] || !row[0].startsWith('TC-')) continue;
  
  const tcNum = parseInt(row[0].replace('TC-', ''));
  if (tcNum >= 1 && tcNum <= 47) {
    let originalRowStr = JSON.stringify(row);
    
    // Check steps (index 5) for login updates
    if (typeof row[5] === 'string') {
      let text = row[5];
      // Regex replace case insensitive, but keep the exact replacement string
      text = text.replace(/Login as document staff/i, 'Login as ' + updates['document staff']);
      text = text.replace(/Login as representative/i, 'Login as ' + updates['representative']);
      text = text.replace(/Login as guest/i, 'Login as ' + updates['guest']);
      text = text.replace(/Login as finance staff/i, 'Login as ' + updates['finance staff']);
      text = text.replace(/Login as contract staff/i, 'Login as ' + updates['contract staff']);
      text = text.replace(/Login as procurement staff/i, 'Login as ' + updates['procurement staff']);
      text = text.replace(/Login as procurement head/i, 'Login as ' + updates['procurement head']);
      text = text.replace(/Login as Unit Representative/i, 'Login as ' + updates['Unit Representative']);
      row[5] = text;
    }

    // Check expected result (index 6) for specific errors
    if (typeof row[6] === 'string') {
      let text = row[6];
      if (text.includes('Error says only Excel files are supported')) {
        text = text.replace('Error says only Excel files are supported', updates['Error says only Excel files are supported']);
      }
      if (text.includes('Error says file must not exceed 50 rows')) {
        text = text.replace('Error says file must not exceed 50 rows', updates['Error says file must not exceed 50 rows']);
      }
      row[6] = text;
    }
    
    if (JSON.stringify(row) !== originalRowStr) {
      modifiedCount++;
    }
  }
}

if (modifiedCount > 0) {
  const newSheet = xlsx.utils.aoa_to_sheet(data);
  wb.Sheets[sheetName] = newSheet;
  xlsx.writeFile(wb, filePath);
  console.log(`Updated data in ${modifiedCount} rows.`);
} else {
  console.log('No rows updated.');
}
