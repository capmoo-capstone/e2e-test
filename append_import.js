const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'tests', 'import-project.spec.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The last part is `});\n  });\n});\n`. We want to insert our code before the final `});` of `test.describe('Import Project' ...)`

const newTests = `
  test.describe('TC-048 to TC-052: Additional Import & Manual Form Edge Cases', () => {
    
    test('TC-048: Import Project - Multiple budget plan selection', async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import');
      await page.getByRole('button', { name: 'สร้างแบบฟอร์มด้วยตนเอง' }).click();

      // Ensure form is visible
      await expect(page.locator('h3').filter({ hasText: 'เพิ่มโครงการใหม่' })).toBeVisible();

      // Basic fields
      await page.locator('input[name="title"]').fill('TC-048 Multiple Budgets Test');
      await selectFutureDate(page, 'delivery_date', 30);
      
      await page.locator('button[role="combobox"]').filter({ hasText: 'เลือกฝ่าย...' }).click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();
      
      await page.locator('button[role="combobox"]').filter({ hasText: 'วิธีการจัดหา...' }).click();
      await page.getByRole('option', { name: 'LT100K' }).click();

      // Trigger budget plan popover
      const budgetTrigger = page.locator('button[role="combobox"]').filter({ hasText: 'เลือกแผนงบประมาณ...' });
      await budgetTrigger.click();

      // Select first 3 available budget plans
      const popover = page.locator('[role="dialog"], [role="listbox"]').last();
      const planItems = popover.locator('div.cursor-pointer');
      await planItems.nth(0).click();
      await planItems.nth(1).click();
      await planItems.nth(2).click();
      
      // Close popover
      await page.keyboard.press('Escape');

      // The budget input should be disabled and auto-calculated
      const budgetInput = page.locator('input[name="budget"]');
      await expect(budgetInput).toBeDisabled();

      // Mock submit
      await page.route('**/projects/import', async (route) => {
        await route.fulfill({ status: 201, json: { count: 1 } });
      });

      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
      await expect(page.getByText('สร้างโครงการสำเร็จ')).toBeVisible();
    });

    test('TC-049 & TC-050: Import Project - Urgent Delivery Date Warning', async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=manual');
      
      await page.locator('input[name="title"]').fill('TC-049 Urgent Project Test');
      
      // Select LT100K which has an expected duration threshold.
      await page.locator('button[role="combobox"]').filter({ hasText: 'วิธีการจัดหา...' }).click();
      await page.getByRole('option', { name: 'LT100K' }).click();
      
      await page.locator('button[role="combobox"]').filter({ hasText: 'เลือกฝ่าย...' }).click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();
      
      await page.locator('input[name="budget"]').fill('50000');
      
      // Select very close date (e.g. 5 days from now)
      await selectFutureDate(page, 'delivery_date', 5);
      
      // Attempt submit
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
      
      // Urgent modal should appear
      const modal = page.locator('[role="dialog"]');
      await expect(modal.getByText('คำเตือน: โครงการเร่งด่วน')).toBeVisible();
      
      // Cancel
      await modal.getByRole('button', { name: 'ยกเลิก' }).click();
      await expect(modal).not.toBeVisible();
      
      // Resubmit and Confirm
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
      
      // Mock submit
      await page.route('**/projects/import', async (route) => {
        await route.fulfill({ status: 201, json: { count: 1 } });
      });
      
      await modal.getByRole('button', { name: 'ยืนยันและสร้างโครงการ' }).click();
      await expect(page.getByText('สร้างโครงการสำเร็จ')).toBeVisible();
    });

    test('TC-051: Import Project - Prevent double submission', async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=manual');
      
      await page.locator('input[name="title"]').fill('TC-051 Double Submit Test');
      await selectFutureDate(page, 'delivery_date', 30);
      await page.locator('button[role="combobox"]').filter({ hasText: 'เลือกฝ่าย...' }).click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();
      await page.locator('button[role="combobox"]').filter({ hasText: 'วิธีการจัดหา...' }).click();
      await page.getByRole('option', { name: 'LT100K' }).click();
      await page.locator('input[name="budget"]').fill('50000');
      
      // Mock slow API response
      let callCount = 0;
      await page.route('**/projects/import', async (route) => {
        callCount++;
        await new Promise(r => setTimeout(r, 1000));
        await route.fulfill({ status: 201, json: { count: 1 } });
      });

      const submitBtn = page.getByRole('button', { name: 'ยืนยัน', exact: true });
      await submitBtn.click();
      
      // Button should be disabled immediately
      await expect(submitBtn).toBeDisabled();
      
      // Try to click again (force) shouldn't trigger another API call since it's disabled, but Playwright force click ignores disabled state.
      // So we just check disabled state.
      await expect(page.getByText('สร้างโครงการสำเร็จ')).toBeVisible({ timeout: 5000 });
      expect(callCount).toBe(1);
    });

    test('TC-052: Import Project - Bulk Excel ignores invalid rows silently', async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import');
      
      const rows = Array.from({ length: 5 }, (_, i) => ({
        'โครงการ': i === 4 ? '' : \`Valid Project \${i}\`, // Row 5 (index 4) missing title
        'เลขที่รับจาก Less paper': \`LESS-900\${i}\`,
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      }));

      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, rows);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'partial_invalid.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      // UI should only show 4 rows without errors for the last one (it's completely dropped by parser).
      const tableRows = page.locator('tbody tr');
      await expect(tableRows).toHaveCount(4);
    });
  });
`;

// Insert before the last `});`
const lastIndex = content.lastIndexOf('});');
if (lastIndex !== -1) {
  content = content.substring(0, lastIndex) + newTests + content.substring(lastIndex);
  fs.writeFileSync(filePath, content);
  console.log('Appended TC-048 to TC-052 successfully');
} else {
  console.log('Could not find the end of the file.');
}
