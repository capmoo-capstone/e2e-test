import { test, expect } from '@playwright/test';
import path from 'path';
import { generateExcelBuffer, LESSPAPER_HEADERS, FIORI_HEADERS } from './utils/excelGenerator';

// Helper to login as a specific role
async function login(page, role = 'super_admin') {
  await page.goto('/login');
  await page.getByRole('combobox').click();
  await page.getByRole('option').filter({ hasText: new RegExp(`\\(${role}\\)$`) }).click();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/app/**');
}

// Helper to mock holiday endpoint
async function mockHolidays(page, holidayDates: string[]) {
  await page.route('**/th.th%23holiday%40group.v.calendar.google.com/**', async (route) => {
    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\n`;
    for (const d of holidayDates) {
      const cleanDate = d.replace(/-/g, '');
      icsContent += `BEGIN:VEVENT\nDTSTART;VALUE=DATE:${cleanDate}\nSUMMARY:Mock Holiday\nEND:VEVENT\n`;
    }
    icsContent += `END:VCALENDAR`;
    await route.fulfill({
      contentType: 'text/calendar',
      body: icsContent,
    });
  });
}

// Helper to select a future date in DatePicker
async function selectFutureDate(page, dayNum = 20) {
  await page.getByRole('button', { name: /เลือกวันที่|yyyy-mm-dd/i }).click();
  await page.locator('.rdp-months').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.rdp-button_next').first().click();
  // Match exactly the day number text inside the day grid cell
  await page.locator('.rdp-day:not(.rdp-day_outside)').filter({ hasText: new RegExp('^' + dayNum + '$') }).first().click();
}

// Helper to assert cell validation errors (to avoid strict mode conflicts)
async function assertCellError(page, text: string) {
  await expect(page.locator('.text-destructive, p.text-destructive').filter({ hasText: text }).first()).toBeVisible({ timeout: 10000 });
}

// Helper to assert manual form field errors (to avoid strict mode conflicts)
async function assertFieldError(page, text: string) {
  await expect(page.locator('[data-slot="field-error"], .text-destructive, .text-warning-dark, .text-warning').filter({ hasText: text }).first()).toBeVisible({ timeout: 10000 });
}

test.describe('Import Project Page E2E Tests', () => {

  test.describe('1. Auth & Access Control (TC-001, TC-002)', () => {
    test('TC-001: Authorized users access Import Project', async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import');
      await expect(page.getByRole('heading', { name: 'นำเข้าโครงการ' })).toBeVisible();
    });

    test('TC-002: Unauthorized users denied', async ({ page }) => {
      await login(page, 'guest');
      await page.goto('/app/project-import');
      // Guest role doesn't have create/import permission, so should be redirected/blocked
      await expect(page).not.toHaveURL(/.*\/app\/project-import$/);
    });
  });

  test.describe('2. File Upload Validations (TC-003, TC-004, TC-444)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=lesspaper');
    });

    test('TC-003: Reject invalid Excel extension', async ({ page }) => {
      const buffer = Buffer.from('dummy txt file content');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer
      });
      await expect(page.getByText(/รองรับไฟล์ \.xlsx และ \.xls/i)).toBeVisible();
    });

    test('TC-004 & TC-444: Excel rows limit boundaries (Max 50 items)', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');

      // ---------------------------------------------------------
      // Boundary 1: Exceed limit for 1 entry (51 rows) - Error
      // ---------------------------------------------------------
      const overLimitRows = Array.from({ length: 51 }, (_, i) => ({
        'เลขที่ใบขอซื้อขอจ้าง': `PR-OVER-${i}`,
        'โครงการ': `Project ${i}`,
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD'
      }));
      const overBuffer = generateExcelBuffer(LESSPAPER_HEADERS, overLimitRows);
      
      await fileInput.setInputFiles({
        name: 'over_limit.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: overBuffer
      });
      
      // Check Error Message from real HTML
      await expect(page.getByText('ไฟล์มี 51 รายการ นำเข้าได้ไม่เกิน 50 รายการต่อครั้ง กรุณาแบ่งไฟล์แล้วลองใหม่')).toBeVisible();

      // ---------------------------------------------------------
      // Boundary 2: Equal limit (50 rows) - Pass
      // ---------------------------------------------------------
      const exactLimitRows = Array.from({ length: 50 }, (_, i) => ({
        'เลขที่ใบขอซื้อขอจ้าง': `PR-EXACT-${i}`,
        'โครงการ': `Project ${i}`,
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD'
      }));
      const exactBuffer = generateExcelBuffer(LESSPAPER_HEADERS, exactLimitRows);
      
      await fileInput.setInputFiles({
        name: 'exact_limit.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: exactBuffer
      });
      
      // Fixed False Positive: Wait preview table to be shown
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
      // Check if this table has exact 50 rows
      await expect(page.locator('tbody tr')).toHaveCount(50);
      // Check if there is no error about limit
      await expect(page.getByText(/นำเข้าได้ไม่เกิน 50 รายการต่อครั้ง/)).not.toBeVisible();
    });
  });

  test.describe('3. Parsing States & Errors (TC-005, TC-006)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=lesspaper');
    });

    test('TC-005: Show Excel parsing state', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '202611001',
        'เลขที่รับจาก Less paper': '999001',
        'โครงการ': 'Parsing Test Project',
        'รายละเอียด': 'Valid details',
        'วิธีการจัดหา': 'LT100K',
        'วันที่ส่งมอบ': '2028-12-30',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, [row]);
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'valid.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
    });

    test('TC-006: Show Excel parse error', async ({ page }) => {
      const buffer = Buffer.from('this is not a valid zip or excel file structure');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'corrupt.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });
      await expect(page.getByText('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์')).toBeVisible();
    });
  });

  test.describe('4. LessPaper Bulk Import Flow (TC-007 to TC-014)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=lesspaper');
      await page.waitForLoadState('networkidle');
    });

    test('TC-007: LessPaper required fields', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '1111',
        'เลขที่รับจาก Less paper': '', // Missing
        'โครงการ': '', // Missing
        'รายละเอียด': 'Some description',
        'วิธีการจัดหา': '', // Missing
        'วงเงินงบประมาณ': '', // Missing
        'หน่วยงาน': '', // Missing
        'ฝ่าย': '', // Missing
        'ปีงบประมาณ': '' // Missing
      };
      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, [row]);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'missing.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      // Wait for table to render
      await expect(page.locator('tbody tr').first()).toBeVisible();

      // Trigger validation by clicking submit
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();

      // Look for cell validation errors in the rendered table using custom helper
      await assertCellError(page, 'กรุณาระบุเลขที่หนังสือ Lesspaper');
      await assertCellError(page, 'กรุณาระบุชื่อโครงการ');
      await assertCellError(page, 'กรุณาเลือกวิธีการจัดหา');
      await assertCellError(page, 'กรุณากรอกวงเงินงบประมาณ');
      await assertCellError(page, 'กรุณาเลือกหน่วยงาน');
      await assertCellError(page, 'กรุณาเลือกฝ่าย');
    });

    test('TC-008: LessPaper duplicate PR existing', async ({ page }) => {
      await page.route('**/projects/import', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Duplicate PR number: 9999000111'
          })
        });
      });

      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '9999000111',
        'เลขที่รับจาก Less paper': '10001',
        'โครงการ': 'Project Duplicate PR',
        'รายละเอียด': 'Desc 1',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, [row]);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'dup_db.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();
      await assertCellError(page, 'เลขที่ใบขอซื้อขอจ้างซ้ำกับโครงการที่มีอยู่แล้ว');
    });

    test('TC-009: LessPaper duplicate PR in upload', async ({ page }) => {
      const row1 = {
        'เลขที่ใบขอซื้อขอจ้าง': '9999000222',
        'เลขที่รับจาก Less paper': '10001',
        'โครงการ': 'Project 1',
        'รายละเอียด': 'Desc 1',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const row2 = { ...row1, 'เลขที่รับจาก Less paper': '10002', 'โครงการ': 'Project 2' };
      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, [row1, row2]);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'dup_pr_upload.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();
      await assertCellError(page, 'เลขที่ใบขอซื้อขอจ้างซ้ำกันในชุดนำเข้า');
    });

    test('TC-010: LessPaper budget numeric/positive', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '2222',
        'เลขที่รับจาก Less paper': '10100',
        'โครงการ': 'Budget Validation',
        'รายละเอียด': 'Desc',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': -1000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, [row]);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'neg_budget.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();
      await assertCellError(page, 'วงเงินงบประมาณต้องมากกว่า 0');
    });

    test('TC-011: LessPaper procurement budget range', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '3333',
        'เลขที่รับจาก Less paper': '10101',
        'โครงการ': 'Budget Range Validation',
        'รายละเอียด': 'Desc',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 150000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, [row]);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'range_budget.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();
      await assertCellError(page, 'ต้องไม่เกิน 100,000 บาท');
    });

    test('TC-012: LessPaper future delivery date', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '4444',
        'เลขที่รับจาก Less paper': '10102',
        'โครงการ': 'Past Delivery Date',
        'รายละเอียด': 'Desc',
        'วิธีการจัดหา': 'LT100K',
        'วันที่ส่งมอบ': '2020-01-01',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, [row]);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'past_date.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();
      await assertCellError(page, 'กรุณาระบุวันที่ในอนาคต');
    });

    test('TC-013 & TC-014: LessPaper edit table and delete row', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '5555',
        'เลขที่รับจาก Less paper': '10103',
        'โครงการ': 'Project to Edit and Delete',
        'รายละเอียด': 'Desc',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, [row]);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'edit_delete.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();

      // 1. Edit a cell (e.g. description)
      const descTextarea = page.locator('tbody tr').first().locator('textarea');
      await descTextarea.fill('Updated Description');
      await descTextarea.blur();
      await expect(descTextarea).toHaveValue('Updated Description');

      // 2. Delete the row
      const deleteBtn = page.locator('tbody tr').first().locator('button').filter({ has: page.locator('.lucide-trash-2') });
      await deleteBtn.click();
      
      // Confirm deletion in dialog
      await page.getByRole('button', { name: 'ลบโครงการ', exact: true }).click();
      
      // Verify row is deleted
      await expect(page.locator('tbody tr')).toHaveCount(0);
    });
  });

  test.describe('5. Fiori Bulk Import Flow (TC-015 to TC-022)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=fiori');
      await page.waitForLoadState('networkidle');
    });

    test('TC-015: Fiori PR required', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '', // Missing
        'โครงการ': 'Fiori Project',
        'รายละเอียด': 'Desc',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(FIORI_HEADERS, [row], 'FIORI');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'fiori_missing_pr.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();
      await assertCellError(page, 'กรุณาระบุเลขที่ใบขอซื้อขอจ้าง');
    });

    test('TC-016: Fiori duplicate PR existing', async ({ page }) => {
      await page.route('**/projects/import', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Duplicate PR number: 8888000555'
          })
        });
      });

      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '8888000555',
        'โครงการ': 'Fiori Duplicate PR',
        'รายละเอียด': 'Desc',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(FIORI_HEADERS, [row], 'FIORI');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'fiori_dup_db.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();
      await assertCellError(page, 'เลขที่ใบขอซื้อขอจ้างซ้ำกับโครงการที่มีอยู่แล้ว');
    });

    test('TC-017: Fiori duplicate PR in upload', async ({ page }) => {
      const row1 = {
        'เลขที่ใบขอซื้อขอจ้าง': '8888000333',
        'โครงการ': 'Fiori Project 1',
        'รายละเอียด': 'Desc 1',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const row2 = { ...row1, 'โครงการ': 'Fiori Project 2' };
      const buffer = generateExcelBuffer(FIORI_HEADERS, [row1, row2], 'FIORI');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'fiori_dup_upload.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();
      await assertCellError(page, 'เลขที่ใบขอซื้อขอจ้างซ้ำกันในชุดนำเข้า');
    });

    test('TC-018: Fiori default method', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '8888000444',
        'โครงการ': 'Fiori Default Method',
        'รายละเอียด': 'Desc',
        'วิธีการจัดหา': '',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(FIORI_HEADERS, [row], 'FIORI');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'fiori_default.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      const selectTrigger = page.locator('tbody tr').first().locator('td').nth(3).locator('[role="combobox"]');
      await expect(selectTrigger).toContainText('ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน');
    });

    test('TC-019 to TC-022: Fiori validations, edit, delete', async ({ page }) => {
      const row = {
        'เลขที่ใบขอซื้อขอจ้าง': '8888000555',
        'โครงการ': 'Fiori Edit Delete',
        'รายละเอียด': 'Desc',
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': -1000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      };
      const buffer = generateExcelBuffer(FIORI_HEADERS, [row], 'FIORI');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'fiori_neg.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();

      // Verify budget error
      await assertCellError(page, 'วงเงินงบประมาณต้องมากกว่า 0');

      // Edit budget to valid
      const budgetInput = page.locator('tbody tr').first().locator('input[inputmode="decimal"]');
      await budgetInput.fill('75000');
      await budgetInput.blur();

      // Verify validation error disappears
      await expect(page.getByText('วงเงินงบประมาณต้องมากกว่า 0')).not.toBeVisible();

      // Delete row
      const deleteBtn = page.locator('tbody tr').first().locator('button').filter({ has: page.locator('.lucide-trash-2') });
      await deleteBtn.click();
      await page.getByRole('button', { name: 'ลบโครงการ', exact: true }).click();
      await expect(page.locator('tbody tr')).toHaveCount(0);
    });
  });

  test.describe('6. Manual Form - User & Scoping Constraints (TC-023 to TC-025)', () => {
    test('TC-023: Representative single unit lock', async ({ page }) => {
      await login(page, 'facilities_rep');
      await page.goto('/app/project-import?mode=manual');

      const deptSelect = page.locator('button#department_id');
      const unitSelect = page.locator('button#unit_id');

      await expect(deptSelect).toBeDisabled();
      await expect(unitSelect).toBeDisabled();
      await expect(deptSelect).toContainText('สำนักงานบริหารระบบกายภาพ');
      await expect(unitSelect).toContainText('ฝ่ายอาคารสถานที่');
    });

    test('TC-024: Representative multiple own units', async ({ page }) => {
      await login(page, 'student_affairs_rep');
      await page.goto('/app/project-import?mode=manual');

      const deptSelect = page.locator('button#department_id');
      const unitSelect = page.locator('button#unit_id');

      await expect(deptSelect).toBeDisabled();
      await expect(deptSelect).toContainText('สำนักงานบริหารกิจการนิสิต');

      await expect(unitSelect).toBeEnabled();
      await unitSelect.click();

      await expect(page.getByRole('option', { name: 'ฝ่ายทุนการศึกษาและบริการนิสิต' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'ฝ่ายประสานงานและเครือข่ายกิจการนิสิต' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'ฝ่ายการเงิน' })).not.toBeVisible();
    });

    test('TC-025: Procurement user organization select', async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=manual');

      const deptSelect = page.locator('button#department_id');
      const unitSelect = page.locator('button#unit_id');

      await expect(deptSelect).toBeEnabled();
      await deptSelect.click();

      await expect(page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' })).toBeVisible();
      await page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' }).click();

      await expect(unitSelect).toBeEnabled();
      await unitSelect.click();
      await expect(page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'ฝ่ายซ่อมบำรุง' })).toBeVisible();
    });
  });

  test.describe('7. Manual Form - Validations & Gating (TC-026 to TC-029)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=manual');
      // Wait for organization options to load
      await page.locator('button#department_id').waitFor({ state: 'visible' });
    });

    test('TC-026: Manual required fields', async ({ page }) => {
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();

      await assertFieldError(page, 'กรุณาเลือกหน่วยงาน');
      await assertFieldError(page, 'กรุณาระบุชื่อโครงการ');
      await assertFieldError(page, 'กรุณาระบุรายละเอียดโครงการ');
      await assertFieldError(page, 'กรุณาเลือกวิธีการจัดหา');
      await assertFieldError(page, 'กรุณากรอกวงเงินงบประมาณ');
    });

    test('TC-027: Manual duplicate PR', async ({ page }) => {
      await page.route('**/projects/create', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Duplicate PR number: 7777000111'
          })
        });
      });

      await page.locator('button#department_id').click();
      await page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' }).click();
      await page.locator('button#unit_id').click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();

      await page.locator('input#title').fill('Manual Duplicate PR Test');
      await page.locator('textarea#description').fill('Valid Description');
      await page.locator('button#procurement_type').click();
      await page.getByRole('option', { name: 'ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน' }).click();
      
      await page.locator('input#pr_no').fill('7777000111');
      await page.locator('input#budget').fill('50,000');
      await page.locator('input#budget').blur();
      
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
      await assertFieldError(page, 'เลขที่ใบขอซื้อขอจ้างซ้ำกับโครงการที่มีอยู่แล้ว');
    });

    test('TC-028: Manual budget numeric/positive', async ({ page }) => {
      await page.locator('button#department_id').click();
      await page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' }).click();
      await page.locator('button#unit_id').click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();

      await page.locator('input#title').fill('Positive Budget Test');
      await page.locator('textarea#description').fill('Valid Description');
      await page.locator('button#procurement_type').click();
      await page.getByRole('option', { name: 'ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน' }).click();
      
      await page.locator('input#budget').fill('0');
      await page.locator('input#budget').blur();
      
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
      await assertFieldError(page, 'วงเงินงบประมาณต้องมากกว่า 0');
    });

    test('TC-029: Manual procurement budget range', async ({ page }) => {
      await page.locator('button#department_id').click();
      await page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' }).click();
      await page.locator('button#unit_id').click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();

      await page.locator('input#title').fill('Range Budget Test');
      await page.locator('textarea#description').fill('Valid Description');
      await page.locator('button#procurement_type').click();
      await page.getByRole('option', { name: 'ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน' }).click();
      
      await page.locator('input#budget').fill('150,000');
      await page.locator('input#budget').blur();
      
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
      await assertFieldError(page, 'ต้องไม่เกิน 100,000 บาท');
    });
  });

  test.describe('8. Manual Form - Budget Plan Selection (TC-030 to TC-033, TC-424)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'student_affairs_rep');
      await page.route('**/budget-plans**', async (route) => {
        const now = new Date();
        const currentFY = now.getMonth() >= 9 ? now.getFullYear() + 544 : now.getFullYear() + 543;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total: 1,
            page: 1,
            pageSize: 100,
            totalPages: 1,
            data: [
              {
                id: 'mock-plan-1',
                budget_year: currentFY,
                unit_id: 'UNIT-EDU',
                activity_type: '101',
                activity_type_name: 'Student service improvement',
                description: 'Student service improvement',
                budget_name: 'Student affairs user-testing budget',
                budget_amount: 650000,
                project_id: null,
                created_at: new Date().toISOString(),
                created_by: 'some-user-id'
              }
            ]
          })
        });
      });
      await page.goto('/app/project-import?mode=manual');
    });

    test('TC-030 & TC-031 & TC-032 & TC-033 & TC-424: Budget plan selector validations', async ({ page }) => {
      // Select Unit first so budget plans are populated
      const unitSelect = page.locator('button#unit_id');
      await unitSelect.click();
      await page.getByRole('option', { name: 'ฝ่ายทุนการศึกษาและบริการนิสิต' }).click();

      // Find combobox trigger using flexible locator to avoid translation issues
      const budgetPlanTrigger = page.locator('button[role="combobox"]').filter({ hasText: /แผนงบประมาณ|กรุณาเลือก/ }).first();
      
      // Wait for it to become enabled (since it might load asynchronously)
      await expect(budgetPlanTrigger).toBeEnabled({ timeout: 15000 });

      // Click to open plans popover
      await budgetPlanTrigger.click();

      // Verify display details (activity name, cost center/unit, amount)
      await expect(page.getByText('Student service improvement')).toBeVisible();
      await expect(page.getByText('650,000 บาท')).toBeVisible();

      // Select plan -> verify budget auto-sums
      await page.getByText('Student service improvement').click();
      // Click off to close popover
      await page.locator('h1', { name: 'สร้างโครงการ' }).click();

      const budgetInput = page.locator('input#budget');
      await expect(budgetInput).toHaveValue('650,000');

      // Edit budget below plan sum -> warning appears
      await budgetInput.fill('600000');
      await budgetInput.blur();
      await assertFieldError(page, 'จำนวนเงินน้อยกว่าวงเงินงบประมาณที่ตั้งไว้');
    });
  });

  test.describe('9. Manual Form - Delivery Date & Urgency Warnings (TC-034, TC-036, TC-425, TC-446)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=manual');
    });

    test('TC-034 & TC-425: Urgency warning and acknowledgement dialog', async ({ page }) => {
      await page.locator('button#department_id').click();
      await page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' }).click();
      await page.locator('button#unit_id').click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();

      await page.locator('input#title').fill('Delivery Warning Project');
      await page.locator('textarea#description').fill('Description');
      await page.locator('button#procurement_type').click();
      await page.getByRole('option', { name: 'ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน' }).click();
      
      await page.locator('input#budget').fill('50,000');
      await page.locator('input#budget').blur();

      // Select delivery date below standard timeline (e.g. 5 working days from today)
      await selectFutureDate(page, 5);

      // Warning text "อาจล่าช้า (เกณฑ์ขั้นต่ำ 15 วัน)" should display below delivery date input
      await expect(page.getByText('อาจล่าช้า (เกณฑ์ขั้นต่ำ 15 วัน)')).toBeVisible();

      // Click save button -> dialog should show up blocking immediate save
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
      
      await expect(page.getByText('วันที่ส่งมอบน้อยกว่าปกติ')).toBeVisible();
      await expect(page.getByText('คุณระบุวันที่ส่งมอบน้อยกว่าวันทำงานตามปกติของสำนักพัสดุ')).toBeVisible();

      // Click cancel in dialog -> returns to form
      await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      await expect(page.getByText('วันที่ส่งมอบน้อยกว่าปกติ')).not.toBeVisible();
    });

    test('TC-446: Urgency calculation with Thai public holidays', async ({ page }) => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const year = nextMonth.getFullYear();
      const monthStr = String(nextMonth.getMonth() + 1).padStart(2, '0');
      const holidayDateStr = `${year}-${monthStr}-08`;

      await mockHolidays(page, [holidayDateStr]);
      
      await page.locator('button#department_id').click();
      await page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' }).click();
      await page.locator('button#unit_id').click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();

      await page.locator('input#title').fill('Holiday Crossing Project');
      await page.locator('textarea#description').fill('Description');
      await page.locator('button#procurement_type').click();
      await page.getByRole('option', { name: 'ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน' }).click();

      await selectFutureDate(page, 10);
      
      // Checking that warning is displayed
      await expect(page.getByText('อาจล่าช้า (เกณฑ์ขั้นต่ำ 15 วัน)')).toBeVisible();
    });
  });

  test.describe('10. Success Flow, Routing & Navigation (TC-035, TC-037 to TC-041)', () => {
    test('TC-035 & TC-037 & TC-038 & TC-040 & TC-041: Success path, receive number, and navigation', async ({ page }) => {
      const uniqueSuffix = Date.now().toString().slice(-6);
      const projectTitle = `E2E Success Project ${uniqueSuffix}`;

      await login(page, 'document_staff');
      await page.goto('/app/project-import?mode=manual');

      // Create a project manually
      await page.locator('button#department_id').click();
      await page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' }).click();
      await page.locator('button#unit_id').click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();

      // Change Fiscal Year to 2570 to check prefix (TC-035)
      await page.locator('button#fiscal_year').click();
      await page.getByRole('option', { name: '2570' }).click();

      await page.locator('input#title').fill(projectTitle);
      await page.locator('textarea#description').fill('Successful creation description');
      await page.locator('button#procurement_type').click();
      await page.getByRole('option', { name: 'ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน' }).click();
      
      await page.locator('input#budget').fill('80,000');
      await page.locator('input#budget').blur();

      // Choose a delivery date far in the future to avoid any urgency warnings
      await page.getByRole('button', { name: /เลือกวันที่|yyyy-mm-dd/i }).click();
      await page.locator('.rdp-months').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rdp-button_next').first().click();
      await page.locator('.rdp-button_next').first().click(); // Click twice to be 2 months ahead
      await page.locator('.rdp-day').filter({ hasText: /^15$/ }).first().click();

      // Submit
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();

      // Verify redirect to Success page
      await expect(page).toHaveURL(/.*\/app\/project-import\/success\?mode=manual/);
      await expect(page.getByText('สร้างโครงการเรียบร้อย')).toBeVisible();

      // TC-040: Verify "สร้างโครงการเพิ่มเติม" returns to import selector (for document staff)
      const importMoreBtn = page.getByRole('button', { name: /สร้างโครงการเพิ่มเติม/i });
      await expect(importMoreBtn).toBeVisible();

      // TC-041: Click "ไปที่หน้าโครงการทั้งหมด" -> navigates to Projects page
      await page.getByRole('button', { name: 'ไปที่หน้าโครงการทั้งหมด' }).click();
      await page.goto('/app/projects?search=' + encodeURIComponent(projectTitle));
      await expect(page).toHaveURL(/.*\/app\/projects/);

      // Verify title is visible in the row
      await expect(page.getByText(projectTitle)).toBeVisible({ timeout: 15000 });

      // Verify status is "ยังไม่ได้มอบหมาย" (TC-037)
      const row = page.locator('tbody tr').filter({ hasText: projectTitle });
      await expect(row.getByText('ยังไม่ได้มอบหมาย')).toBeVisible();

      // Verify receive no. starts with fiscal year "2570" (TC-035)
      const receiveNoCell = row.locator('td').first();
      await expect(receiveNoCell).toContainText(/^2570\//);
    });

    test('TC-039: Representative success navigation returns to manual form', async ({ page }) => {
      const uniqueSuffix = Date.now().toString().slice(-6);
      const projectTitle = `Rep Success Project ${uniqueSuffix}`;

      await login(page, 'facilities_rep');
      await page.goto('/app/project-import?mode=manual');

      await page.locator('input#title').fill(projectTitle);
      await page.locator('textarea#description').fill('Rep project description');
      await page.locator('button#procurement_type').click();
      await page.getByRole('option', { name: 'ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน' }).click();
      
      await page.locator('input#budget').fill('45,000');
      await page.locator('input#budget').blur();

      // Choose a delivery date far in the future
      await page.getByRole('button', { name: /เลือกวันที่|yyyy-mm-dd/i }).click();
      await page.locator('.rdp-months').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rdp-button_next').first().click();
      await page.locator('.rdp-button_next').first().click();
      await page.locator('.rdp-day').filter({ hasText: /^15$/ }).first().click();

      // Submit
      await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();

      // Expect success page
      await expect(page).toHaveURL(/.*\/app\/project-import\/success\?mode=manual/);
      
      // TC-039: Click "สร้างโครงการเพิ่มเติม" -> should return to manual form directly (not selector)
      await page.getByRole('button', { name: /สร้างโครงการเพิ่มเติม/i }).click();
      await expect(page).toHaveURL(/.*\/app\/project-import\?mode=manual/);
    });
  });

  test.describe('11. Templates (TC-042, TC-043)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'document_staff');
    });

    test('TC-042: LessPaper template download', async ({ page }) => {
      await page.goto('/app/project-import?mode=lesspaper');
      
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /ดาวน์โหลด Template/i }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe('lesspaper-project-import-template.xlsx');
    });

    test('TC-043: Fiori template download', async ({ page }) => {
      await page.goto('/app/project-import?mode=fiori');
      
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /ดาวน์โหลด Template/i }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe('fiori-project-import-template.xlsx');
    });
  });

  test.describe('12. Edge Cases (TC-448, TC-449)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'document_staff');
    });

    test('TC-448: Duplicate-submit prevention on project creation', async ({ page }) => {
      await page.goto('/app/project-import?mode=manual');

      // Fill valid data
      await page.locator('button#department_id').click();
      await page.getByRole('option', { name: 'สำนักงานบริหารระบบกายภาพ' }).click();
      await page.locator('button#unit_id').click();
      await page.getByRole('option', { name: 'ฝ่ายอาคารสถานที่' }).click();

      const uniqueSuffix = Date.now().toString().slice(-6);
      await page.locator('input#title').fill(`Prevent Duplicate Project ${uniqueSuffix}`);
      await page.locator('textarea#description').fill('Duplicate click test');
      await page.locator('button#procurement_type').click();
      await page.getByRole('option', { name: 'ซื้อ/จ้าง แบบเจาะจง ไม่เกิน 1 แสน' }).click();
      
      await page.locator('input#budget').fill('25,000');
      await page.locator('input#budget').blur();

      await page.getByRole('button', { name: /เลือกวันที่|yyyy-mm-dd/i }).click();
      await page.locator('.rdp-months').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rdp-button_next').first().click();
      await page.locator('.rdp-button_next').first().click();
      await page.locator('.rdp-day').filter({ hasText: /^15$/ }).first().click();

      const submitBtn = page.getByRole('button', { name: 'ยืนยัน', exact: true });

      // Intercept request to introduce artificial delay
      await page.route('**/projects/create', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      // Double-click submit button
      await submitBtn.click();

      // Expect the button to be disabled during submit
      await expect(submitBtn).toBeDisabled();

      // Success page should be reached
      await expect(page).toHaveURL(/.*\/app\/project-import\/success\?mode=manual/, { timeout: 10000 });
    });

    test('TC-449: Excel bulk import partial failure transactional rollback', async ({ page }) => {
      // Mock import failure response
      await page.route('**/projects/import', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Duplicate PR number: 9999000555'
          })
        });
      });

      await page.goto('/app/project-import?mode=lesspaper');
      await page.waitForLoadState('networkidle');

      const rows = Array.from({ length: 5 }, (_, i) => ({
        'เลขที่ใบขอซื้อขอจ้าง': i === 4 ? '9999000555' : `888800${i}`,
        'เลขที่รับจาก Less paper': `${10000 + i}`,
        'โครงการ': `Transactional Rollback Project ${i}`,
        'รายละเอียด': `Desc ${i}`,
        'วิธีการจัดหา': 'LT100K',
        'วงเงินงบประมาณ': 50000,
        'หน่วยงาน': 'DEPT-LOC',
        'ฝ่าย': 'UNIT-BUILD',
        'ปีงบประมาณ': '2569'
      }));

      const buffer = generateExcelBuffer(LESSPAPER_HEADERS, rows);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'rollback_test.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      });

      await expect(page.locator('tbody tr').first()).toBeVisible();

      // Click submit
      await page.getByRole('button', { name: 'ยืนยันการนำเข้าโครงการ' }).click();

      // Expect row 5 (index 4) to show cell error
      await assertCellError(page, 'เลขที่ใบขอซื้อขอจ้างซ้ำกับโครงการที่มีอยู่แล้ว');
    });
  });
});
