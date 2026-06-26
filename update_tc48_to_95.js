const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'test_plan.xlsx';
const wb = xlsx.readFile(filePath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Update specific rows for TC-048 to TC-095
const loginUpdates = {
  'External Staff': 'user `registration_staff` with password `registration_staff` (Role: Guest)',
  'Procurement Staff': 'user `procurement1` with password `procurement1` (Role: Procurement1)',
  'Procurement Head': 'user `proc_head1` with password `proc_head1` (Role: Procurement Head1)',
  'Original Assignee': 'user `procurement1` with password `procurement1` (Role: Procurement1)',
  'Added Assignee': 'user `procurement2` with password `procurement2` (Role: Procurement2)', // Or similar
  'Admin': 'user `super_admin` with password `super_admin` (Role: Super Admin)',
};

const textUpdates = {
  'Target project is in `IN_PROGRESS` status': 'Project: "User Testing - Network monitoring sensors" (Status: IN_PROGRESS)',
  'Target project is at step 1 and has no uploaded files or data': 'Project: "User Testing - Network monitoring sensors"',
  'Target project has moved past step 1, or has data/uploaded docs': 'Project: "User Testing - Accounting software renewal"',
  'Eligible project for cancellation': 'Project: "User Testing - Data center UPS upgrade"',
  'Eligible project and valid reason': 'Project: "User Testing - Data center UPS upgrade" with reason "Duplicate plan"',
  'Project in WAITING_CANCEL status': 'Project: "User Testing - Air purifier order"',
  'Projects exist in various statuses': 'Observe rows in the table matching statuses like "รอการตอบรับ", "ยังไม่ได้มอบหมาย", "รออนุมัติยกเลิก", etc.',
  'Project is currently in the procurement phase': 'Project: "User Testing - Network monitoring sensors"',
  'Project is currently in the contract phase': 'Project: "User Testing - Security service contract"',
  'Projects in UNASSIGNED, WAITING_ACCEPT, CLOSED, CANCELLED, WAITING_CANCEL, and REQUEST_EDIT statuses': 'Projects like "User Testing - New chairs for reading room", "User Testing - Completed tablet procurement"',
  'Projects in CLOSED, CANCELLED, WAITING_CANCEL, and REQUEST_EDIT statuses': 'Projects like "User Testing - Completed tablet procurement", "User Testing - Cancelled printer repair"'
};

let modifiedCount = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row[0] || !row[0].startsWith('TC-')) continue;
  
  const tcNum = parseInt(row[0].replace('TC-', ''));
  if (tcNum >= 48 && tcNum <= 95) {
    let originalRowStr = JSON.stringify(row);
    
    // Check steps (index 5) for login updates
    if (typeof row[5] === 'string') {
      let text = row[5];
      for (const [key, val] of Object.entries(loginUpdates)) {
        const regex = new RegExp(`Login as (the )?${key}`, 'gi');
        text = text.replace(regex, 'Login as ' + val);
      }
      row[5] = text;
    }

    // Check expected result (index 6) and test data (index 4) for specific targets
    for (let col of [4, 6]) {
      if (typeof row[col] === 'string') {
        let text = row[col];
        for (const [key, val] of Object.entries(textUpdates)) {
          if (text.includes(key)) {
            text = text.replace(key, val);
          }
        }
        row[col] = text;
      }
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

// Update Reference JSON
const refPath = 'json_exports/test_data_reference.json';
const refData = JSON.parse(fs.readFileSync(refPath));

const newMockProjects = [
  { "title": "User Testing - Network monitoring sensors", "status": "IN_PROGRESS", "workflow": "LT500K" },
  { "title": "User Testing - Accounting software renewal", "status": "IN_PROGRESS", "workflow": "MT500K", "pr_no": "2568-PR-UT-4" },
  { "title": "User Testing - Data center UPS upgrade", "status": "IN_PROGRESS", "workflow": "EBIDDING", "pr_no": "2568-PR-UT-5" },
  { "title": "User Testing - Security service contract", "status": "IN_PROGRESS", "workflow": "CONTRACT", "less_no": "2568-LESS-UT-6" },
  { "title": "User Testing - Air purifier order", "status": "WAITING_CANCEL", "workflow": "LT100K" },
  { "title": "User Testing - Completed tablet procurement", "status": "CLOSED" },
  { "title": "User Testing - Cancelled printer repair", "status": "CANCELLED" }
];

// Merge without duplicates by title
newMockProjects.forEach(np => {
  if (!refData.mock_projects.find(p => p.title === np.title)) {
    refData.mock_projects.push(np);
  }
});

fs.writeFileSync(refPath, JSON.stringify(refData, null, 2));
console.log('Updated test_data_reference.json');
