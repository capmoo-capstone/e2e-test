const fs = require('fs');

// 1. Fix all-project.spec.ts
let allProjects = fs.readFileSync('tests/all-project.spec.ts', 'utf8');
allProjects = allProjects.replace("async function login(page, role = 'super_admin') {", "async function login(page, role = 'super_admin') {\n  await page.context().clearCookies();");
allProjects = allProjects.replace('input[placeholder="ค้นหา..."]', 'input[placeholder="ค้นหาชื่อโครงการ..."]');
allProjects = allProjects.replace("getByRole('button', { name: 'ล้างค่าตัวกรอง' })", "getByRole('button', { name: /ล้าง.*ตัวกรอง/ })");
fs.writeFileSync('tests/all-project.spec.ts', allProjects);

// 2. Fix import-project.spec.ts (remove the duplicated block at the bottom)
let importProjects = fs.readFileSync('tests/import-project.spec.ts', 'utf8');
const searchString = "  test.describe('TC-048 to TC-052: Additional Import & Manual Form Edge Cases', () => {";
const duplicateIndex = importProjects.indexOf(searchString);
if (duplicateIndex !== -1) {
    const cleanContent = importProjects.substring(0, duplicateIndex).trimEnd() + '\n});\n';
    fs.writeFileSync('tests/import-project.spec.ts', cleanContent);
}

console.log('Fixed scripts');
