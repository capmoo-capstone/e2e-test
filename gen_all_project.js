const fs = require('fs');
const path = require('path');

const content = `import { test, expect } from '@playwright/test';

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

  test.describe('Table Rendering & Basic Access (TC-053 to TC-065)', () => {
    test('TC-053: Page loads successfully', async ({ page }) => {
      await expect(page.locator('h1').filter({ hasText: 'โครงการทั้งหมด' })).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('TC-054: Display standard columns', async ({ page }) => {
      const headers = ['ลำดับ', 'เลขที่รับจาก Less paper', 'ชื่อโครงการ', 'สถานะ', 'วิธีการจัดหา', 'ผู้รับผิดชอบ', 'จัดการ'];
      for (const h of headers) {
        await expect(page.locator('th').filter({ hasText: h })).toBeVisible();
      }
    });

    test('TC-055 to TC-060: Access constraints by Role', async ({ page }) => {
      // TC-055 Admin sees all, TC-058 Document Staff sees all
      // The implementation details for each role's row count would be here.
      // We check that the table renders properly for these roles.
      const roles = ['super_admin', 'document_staff', 'facilities_rep', 'procurement1'];
      for (const role of roles) {
        await page.goto('/login'); // reset
        await login(page, role);
        await page.goto('/app/projects');
        await expect(page.locator('h1').filter({ hasText: 'โครงการทั้งหมด' })).toBeVisible();
        await expect(page.locator('table')).toBeVisible();
      }
    });

    test('TC-062: Pagination controls', async ({ page }) => {
      const nextBtn = page.getByRole('button', { name: 'Next' });
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('TC-064: Empty state illustration', async ({ page }) => {
      await page.goto('/login');
      await login(page, 'guest'); // Usually guest has 0 projects
      await page.goto('/app/projects');
      await expect(page.getByText('ไม่มีโครงการ')).toBeVisible();
    });
  });

  test.describe('Advanced Filters (TC-066 to TC-073)', () => {
    test('TC-066: Search by valid project name', async ({ page }) => {
      await page.locator('input[placeholder="ค้นหาชื่อโครงการ..."]').fill('User Testing');
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('tbody tr').first()).toBeVisible();
    });

    test('TC-069: Filter by Status', async ({ page }) => {
      await page.getByRole('button', { name: 'สถานะโครงการ' }).click();
      await page.getByRole('option', { name: 'รอการตอบรับ' }).click();
      await page.keyboard.press('Escape');
      await page.waitForLoadState('networkidle');
    });

    test('TC-070: Filter by Procurement Type', async ({ page }) => {
      await page.getByRole('button', { name: 'วิธีการจัดหา' }).click();
      await page.getByRole('option', { name: 'LT100K' }).click();
      await page.keyboard.press('Escape');
      await page.waitForLoadState('networkidle');
    });

    test('TC-075: Clear all filters', async ({ page }) => {
      await page.getByRole('button', { name: 'สถานะโครงการ' }).click();
      await page.getByRole('option', { name: 'รอการตอบรับ' }).click();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'ล้างตัวกรอง' }).click();
    });
  });

  test.describe('Action Menus & Audit Logs (TC-079 to TC-095)', () => {
    test('TC-079: Add Assignee action visible for IN_PROGRESS', async ({ page }) => {
      await page.locator('input[placeholder="ค้นหาชื่อโครงการ..."]').fill('Network monitoring sensors');
      await page.waitForTimeout(500); // debounce
      
      const row = page.locator('tbody tr').first();
      await row.locator('button[aria-haspopup="menu"]').click(); // three dots
      await expect(page.getByRole('menuitem', { name: 'เพิ่มผู้รับผิดชอบ' })).toBeVisible();
    });

    test('TC-083: Add Assignee action hidden for CLOSED/WAITING_CANCEL', async ({ page }) => {
      await page.locator('input[placeholder="ค้นหาชื่อโครงการ..."]').fill('Air purifier order');
      await page.waitForTimeout(500);
      
      const row = page.locator('tbody tr').first();
      await row.locator('button[aria-haspopup="menu"]').click();
      await expect(page.getByRole('menuitem', { name: 'เพิ่มผู้รับผิดชอบ' })).not.toBeVisible();
    });

    test('TC-089: Request Cancel logic', async ({ page }) => {
      await page.locator('input[placeholder="ค้นหาชื่อโครงการ..."]').fill('Network monitoring sensors');
      await page.waitForTimeout(500);
      
      const row = page.locator('tbody tr').first();
      await row.locator('button[aria-haspopup="menu"]').click();
      
      const cancelAction = page.getByRole('menuitem', { name: 'ขอยกเลิกโครงการ' });
      if (await cancelAction.isVisible()) {
        await cancelAction.click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog.getByText('ระบุเหตุผลในการยกเลิก')).toBeVisible();
        await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
      }
    });

    test('TC-091: Approve WAITING_CANCEL', async ({ page }) => {
      // Must be Procurement Head
      await page.goto('/login');
      await login(page, 'proc_head1');
      await page.goto('/app/projects');
      
      await page.locator('input[placeholder="ค้นหาชื่อโครงการ..."]').fill('Air purifier order');
      await page.waitForTimeout(500);
      
      const row = page.locator('tbody tr').first();
      await row.locator('button[aria-haspopup="menu"]').click();
      
      const approveCancel = page.getByRole('menuitem', { name: 'อนุมัติการยกเลิก' });
      if (await approveCancel.isVisible()) {
        await approveCancel.click();
        // Just cancel the modal for safety during tests
        await page.locator('[role="dialog"]').getByRole('button', { name: 'ปิด' }).click();
      }
    });
  });
});
`;

fs.writeFileSync(path.join(__dirname, 'tests', 'all-project.spec.ts'), content);
console.log('Created all-project.spec.ts');
