const fs = require('fs');
const data = JSON.parse(fs.readFileSync('tests/target_tcs_2.json', 'utf8'));
const allProjectsTCs = data.filter(t => parseInt(t.testId.replace('TC-','')) >= 53 && parseInt(t.testId.replace('TC-','')) <= 95);

let script = `import { test, expect } from '@playwright/test';

// Helper to login as a specific role
async function login(page, role = 'super_admin') {
  await page.goto('/login');
  await page.getByRole('combobox').click();
  await page.getByRole('option').filter({ hasText: new RegExp(\`\\\\(\${role}\\\\)$\`) }).click();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/app/**');
}

test.describe('All Projects Page (TC-053 to TC-095)', () => {
  test.beforeEach(async ({ page }) => {
    // Default to admin for most basic views
    await login(page, 'super_admin');
    await page.goto('/app/projects');
    await page.waitForLoadState('networkidle');
  });

`;

let prevCategory = '';
let currentDescribe = '';

// Create meaningful groups
const groups = {
  'Table Rendering & Basic Access': ['TC-053', 'TC-054', 'TC-055', 'TC-056', 'TC-057'],
  'Summary Cards': ['TC-058', 'TC-059', 'TC-060'],
  'Search & Filters': ['TC-061', 'TC-062', 'TC-063', 'TC-064', 'TC-065', 'TC-066', 'TC-067', 'TC-068', 'TC-069', 'TC-070', 'TC-071', 'TC-072', 'TC-073', 'TC-074', 'TC-075'],
  'Status & Assignee Displays': ['TC-076', 'TC-077', 'TC-078'],
  'Add/Return Assignee Actions': ['TC-079', 'TC-080', 'TC-081', 'TC-082', 'TC-083', 'TC-084', 'TC-085', 'TC-086'],
  'Cancel Project Actions': ['TC-087', 'TC-088', 'TC-089', 'TC-090', 'TC-091'],
  'Audit Logs & Edge Cases': ['TC-092', 'TC-093', 'TC-094', 'TC-095']
};

function getGroup(testId) {
  for (const [groupName, ids] of Object.entries(groups)) {
    if (ids.includes(testId)) return groupName;
  }
  return 'Other Validations';
}

let activeGroup = '';

for (const tc of allProjectsTCs) {
  const groupName = getGroup(tc.testId);
  if (groupName !== activeGroup) {
    if (activeGroup !== '') script += `  });\n\n`;
    script += `  test.describe('${groupName}', () => {\n`;
    activeGroup = groupName;
  }
  
  script += `    test('${tc.testId}: ${tc.title}', async ({ page }) => {\n`;
  script += `      // Prerequisites: ${tc.prerequisites.replace(/\r\n/g, ' ')}\n`;
  script += `      // Test Data: ${tc.testData.replace(/\r\n/g, ' ')}\n`;
  script += `      // Steps: ${tc.steps.replace(/\r\n/g, ' ')}\n`;
  script += `      // Expected: ${tc.expectedResult.replace(/\r\n/g, ' ')}\n`;
  
  // Custom logic for known tests
  if (tc.testId === 'TC-053') {
    script += `      await expect(page.locator('h1').filter({ hasText: 'โครงการทั้งหมด' })).toBeVisible();\n`;
    script += `      await expect(page.locator('table')).toBeVisible();\n`;
  } else if (tc.testId === 'TC-054') {
    script += `      await page.goto('/login');\n`;
    script += `      await login(page, 'procurement1');\n`;
    script += `      await page.goto('/app/projects');\n`;
    script += `      await expect(page.locator('h1').filter({ hasText: 'โครงการทั้งหมด' })).toBeVisible();\n`;
    script += `      await expect(page.locator('table')).toBeVisible();\n`;
  } else if (tc.testId === 'TC-055') {
    script += `      await page.goto('/login');\n`;
    script += `      await login(page, 'document_staff');\n`;
    script += `      await page.goto('/app/projects');\n`;
    script += `      await expect(page.locator('table')).toBeVisible();\n`;
  } else if (tc.testId === 'TC-061') {
    script += `      await page.locator('input[placeholder="ค้นหาชื่อโครงการ..."]').fill('12345');\n`;
    script += `      await page.keyboard.press('Enter');\n`;
    script += `      await page.waitForLoadState('networkidle');\n`;
  } else if (tc.testId === 'TC-075') {
    script += `      await page.getByRole('button', { name: 'สถานะโครงการ' }).click();\n`;
    script += `      await page.getByRole('option', { name: 'รอการตอบรับ' }).click();\n`;
    script += `      await page.keyboard.press('Escape');\n`;
    script += `      await page.getByRole('button', { name: 'ล้างตัวกรอง' }).click();\n`;
  } else if (tc.testId === 'TC-079') {
    script += `      await page.goto('/login');\n`;
    script += `      await login(page, 'procurement1');\n`;
    script += `      await page.goto('/app/projects');\n`;
    script += `      const row = page.locator('tbody tr').first();\n`;
    script += `      if (await row.isVisible()) {\n`;
    script += `        await row.locator('button[aria-haspopup="menu"]').click();\n`;
    script += `        await expect(page.getByRole('menuitem', { name: 'เพิ่มผู้รับผิดชอบ' }).or(page.getByRole('menuitem', { name: 'ขอยกเลิกโครงการ' }))).toBeVisible();\n`;
    script += `      }\n`;
  } else {
    script += `      // TODO: Implement specific assertions for ${tc.testId}\n`;
    script += `      await page.waitForLoadState('networkidle');\n`;
  }
  
  script += `    });\n\n`;
}

if (activeGroup !== '') script += `  });\n`;
script += `});\n`;

fs.writeFileSync('tests/all-project.spec.ts', script);
console.log('Successfully generated tests/all-project.spec.ts');
