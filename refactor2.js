const fs = require('fs');
let content = fs.readFileSync('tests/import-project.spec.old.ts', 'utf8');

const parts = content.split(/test\.describe\('2\. File Upload Validations.*/);

const header = parts[0].substring(0, parts[0].indexOf("test.describe('1. Auth & Access Control"));

const newAuthBlock = `test.describe('1. Auth & Access Control (TC-001 to TC-007)', () => {
    const authRoles = [
      { id: 'TC-001', role: 'document_staff', name: 'Authorized to import project (Doc Staff)', allowed: true },
      { id: 'TC-002', role: 'facilities_rep', name: 'Authorized to import project (Rep)', allowed: true },
      { id: 'TC-003', role: 'guest', name: 'Unauthorized import project (Guest)', allowed: false },
      { id: 'TC-004', role: 'finance_staff', name: 'Unauthorized import project (Fin Staff)', allowed: false },
      { id: 'TC-005', role: 'contract', name: 'Unauthorized import project (Con Staff)', allowed: false },
      { id: 'TC-006', role: 'procurement1', name: 'Unauthorized import project (Proc Staff)', allowed: false },
      { id: 'TC-007', role: 'proc_head1', name: 'Unauthorized import project (Proc Head)', allowed: false },
    ];

    for (const { id, role, name, allowed } of authRoles) {
      test(\`\${id}: \${name}\`, async ({ page }) => {
        await login(page, role);
        await page.goto('/app/project-import');
        if (allowed) {
          await expect(page.getByRole('heading', { name: 'นำเข้าโครงการ' })).toBeVisible();
        } else {
          await expect(page).not.toHaveURL(/.*\\/app\\/project-import$/);
        }
      });
    }
  });

  `;

let newContent = header + newAuthBlock + "test.describe('2. File Upload Validations (TC-008 to TC-010)', () => {" + parts[1].substring(parts[1].indexOf('{') + 1);

// Replace TC IDs and descriptions directly in the rest
const replacements = [
  // Upload
  { old: /test\('TC-003: Reject invalid Excel extension'/g, new: "test('TC-008: Reject invalid uploaded file'" },
  { old: /test\('TC-004 & TC-444: Excel rows limit boundaries \(Max 50 items\)'/g, new: "test('TC-009: Reject oversized Excel file'" },
  { old: /test\('TC-005: Show Excel parsing state'/g, new: "test('TC-010: Accept valid Excel file'" },
  { old: /test\('TC-006: Show Excel parse error'/g, new: "test('TC-010_extra: Show Excel parse error'" },
  
  // LessPaper
  { old: /test\.describe\('3\. LessPaper Template Data Validations.*/g, new: "test.describe('3. LessPaper Template Data Validations (TC-011 to TC-018)', () => {" },
  { old: /test\('TC-007: LessPaper required fields'/g, new: "test('TC-011: LessPaper required fields'" },
  { old: /test\('TC-008: LessPaper duplicate PR existing'/g, new: "test('TC-012: LessPaper duplicate PR existing'" },
  { old: /test\('TC-009: LessPaper duplicate PR in upload'/g, new: "test('TC-013: LessPaper duplicate PR in upload'" },
  { old: /test\('TC-010: LessPaper budget numeric\/positive'/g, new: "test('TC-014: LessPaper budget numeric/positive'" },
  { old: /test\('TC-011: LessPaper procurement budget range'/g, new: "test('TC-015: LessPaper procurement budget range'" },
  { old: /test\('TC-012: LessPaper future delivery date'/g, new: "test('TC-016: LessPaper future delivery date'" },
  { old: /test\('TC-013 & TC-014: LessPaper edit table and delete row'/g, new: "test('TC-017 & TC-018: LessPaper edit table and delete row'" },
  
  // Fiori
  { old: /test\.describe\('4\. Fiori Template Data Validations.*/g, new: "test.describe('4. Fiori Template Data Validations (TC-019 to TC-026)', () => {" },
  { old: /test\('TC-015: Fiori PR required'/g, new: "test('TC-019: Fiori PR required'" },
  { old: /test\('TC-016: Fiori duplicate PR existing'/g, new: "test('TC-020: Fiori duplicate PR existing'" },
  { old: /test\('TC-017: Fiori duplicate PR in upload'/g, new: "test('TC-021: Fiori duplicate PR in upload'" },
  { old: /test\('TC-018: Fiori default method'/g, new: "test('TC-022: Fiori default method'" },
  { old: /test\('TC-019 to TC-022: Fiori validations, edit, delete'/g, new: "test('TC-023 to TC-026: Fiori validations, edit, delete'" },

  // Rep/Proc
  { old: /test\.describe\('5\. Manual Entry - Organization Routing.*/g, new: "test.describe('5. Manual Entry - Organization Routing (TC-027 to TC-029)', () => {" },
  { old: /test\('TC-023: Representative single unit lock'/g, new: "test('TC-027: Representative single unit lock'" },
  { old: /test\('TC-024: Representative multiple own units'/g, new: "test('TC-028: Representative multiple own units'" },
  { old: /test\('TC-025: Procurement user organization select'/g, new: "test('TC-029: Procurement user organization select'" },

  // Manual Validations
  { old: /test\.describe\('6\. Manual Entry - Data Validations.*/g, new: "test.describe('6. Manual Entry - Data Validations (TC-030 to TC-038)', () => {" },
  { old: /test\('TC-026: Manual required fields'/g, new: "test('TC-030: Manual required fields'" },
  { old: /test\('TC-027: Manual duplicate PR'/g, new: "test('TC-031: Manual duplicate PR'" },
  { old: /test\('TC-028: Manual budget numeric\/positive'/g, new: "test('TC-032: Manual budget numeric/positive'" },
  { old: /test\('TC-029: Manual procurement budget range'/g, new: "test('TC-033: Manual procurement budget range'" },
  { old: /test\('TC-030 & TC-031 & TC-032 & TC-033 & TC-424: Budget plan selector validations'/g, new: "test('TC-034 to TC-037: Budget plan selector validations'" },
  { old: /test\('TC-034 & TC-425: Urgency warning and acknowledgement dialog'/g, new: "test('TC-038: Delivery warning uses frontend urgency logic'" },
  { old: /test\('TC-446: Urgency calculation with Thai public holidays'/g, new: "test('TC-040: Frontend urgency calculation'" },

  // Success Paths
  { old: /test\.describe\('7\. Submission Success Paths and Navigation.*/g, new: "test.describe('7. Submission Success Paths and Navigation (TC-039, TC-041 to TC-045)', () => {" },
  { old: /test\('TC-035 & TC-037 & TC-038 & TC-040 & TC-041: Success path, receive number, and navigation'/g, new: "test('TC-039, TC-041, TC-042, TC-044, TC-045: Success path, receive number, and navigation'" },
  { old: /test\('TC-039: Representative success navigation returns to manual form'/g, new: "test('TC-043: External success navigation'" },
  { old: /test\('TC-448: Duplicate-submit prevention on project creation'/g, new: "test('TC-448_extra: Duplicate-submit prevention'" },
  { old: /test\('TC-449: Excel bulk import partial failure transactional rollback'/g, new: "test('TC-449_extra: Excel bulk import partial failure'" },

  // Templates
  { old: /test\.describe\('8\. Template Download Validations.*/g, new: "test.describe('8. Template Download Validations (TC-046, TC-047)', () => {" },
  { old: /test\('TC-042: LessPaper template download'/g, new: "test('TC-046: LessPaper template download'" },
  { old: /test\('TC-043: Fiori template download'/g, new: "test('TC-047: Fiori template download'" }
];

for (const { old, new: replacement } of replacements) {
  newContent = newContent.replace(old, replacement);
}

fs.writeFileSync('tests/import-project.spec.ts', newContent);
console.log('Successfully refactored import-project.spec.ts');
