const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'test_plan.xlsx';
const exportDir = path.join(__dirname, 'json_exports');

if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

const wb = xlsx.readFile(filePath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Define category groupings
const groupings = {
  tc_projects: [
    'Import Project Page', 'All Projects Page', 'Assign Project Page',
    'Project ID Page', 'Import Budget Plan Page', 'Project Management'
  ],
  tc_vendor_finance: [
    'Vendor Form Page', 'Vendor Response Page', 'Finance Page'
  ],
  tc_dashboards: [
    'My Dashboard To Do List', 'Personal KPI Dashboard', 'Overview Dashboard',
    'KPI Dashboard', 'Home Page'
  ],
  tc_notifications: [
    'Email Notification', 'Web Notification'
  ],
  tc_settings_admin: [
    'Setting Page', 'Authentication', 'Admin / Security', 'User Management',
    'Settings Management', 'UI Styling', 'API Docs'
  ]
};

const results = {
  tc_projects: [],
  tc_vendor_finance: [],
  tc_dashboards: [],
  tc_notifications: [],
  tc_settings_admin: [],
  tc_unmapped: []
};

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row[0] || !row[0].startsWith('TC-')) continue;

  const testCase = {
    testId: row[0],
    category: row[1],
    title: row[2],
    prerequisites: row[3],
    testData: row[4],
    steps: row[5],
    expectedResult: row[6],
    priority: row[7],
    status: row[8],
    tester: row[9],
    testedDate: row[10]
  };

  const category = row[1];
  let mapped = false;

  for (const [fileKey, categoriesList] of Object.entries(groupings)) {
    if (categoriesList.includes(category)) {
      results[fileKey].push(testCase);
      mapped = true;
      break;
    }
  }

  if (!mapped) {
    results.tc_unmapped.push(testCase);
  }
}

// Write to JSON files
for (const [fileKey, testCases] of Object.entries(results)) {
  if (testCases.length > 0) {
    const outPath = path.join(exportDir, `${fileKey}.json`);
    fs.writeFileSync(outPath, JSON.stringify(testCases, null, 2), 'utf-8');
    console.log(`Exported ${testCases.length} test cases to ${fileKey}.json`);
  }
}
