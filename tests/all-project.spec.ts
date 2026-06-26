import { test, expect } from '@playwright/test';

// Helper to login as a specific role
async function login(page, role = 'super_admin') {
  await page.goto('/login');
  await page.getByRole('combobox').click();
  await page.getByRole('option').filter({ hasText: new RegExp(`\\(${role}\\)$`) }).click();
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

  test.describe('Table Rendering & Basic Access', () => {
    test('TC-053: Main table columns', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: -
      // Steps: 1. Navigate to All Projects Page ("หน้ารวมโครงการ")
      // Expected: The table correctly displays the following columns: "เลขที่ลงรับ", "โครงการ", "ผู้รับผิดชอบ", "วิธีการจัดหา", "สถานะ", and a three dots action button
      await expect(page.locator('h1').filter({ hasText: 'โครงการทั้งหมด' })).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('TC-054: Procurement role sees all departments', async ({ page }) => {
      // Prerequisites: 1. User is authorized as Procurement Staff
      // Test Data: -
      // Steps: 1. Login as user `procurement1` with password `procurement1` (Role: Procurement1) 2. Navigate to All Projects Page
      // Expected: Projects from all departments are visible in the table
      await page.goto('/login');
      await login(page, 'procurement1');
      await page.goto('/app/projects');
      await expect(page.locator('h1').filter({ hasText: 'โครงการทั้งหมด' })).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('TC-055: External user sees own department only', async ({ page }) => {
      // Prerequisites: 1. User is authorized as an External or Department Staff (not procurement)
      // Test Data: -
      // Steps: 1. Login as External/Department Staff 2. Navigate to All Projects Page
      // Expected: Only projects belonging to the user's own department are visible in the table
      await page.goto('/login');
      await login(page, 'document_staff');
      await page.goto('/app/projects');
      await expect(page.locator('table')).toBeVisible();
    });

    test('TC-056: Default 6-month view', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: -
      // Steps: 1. Navigate to All Projects Page
      // Expected: The table defaults to displaying projects created within the last 6 months
      // TODO: Implement specific assertions for TC-056
      await page.waitForLoadState('networkidle');
    });

    test('TC-057: Default sort', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: -
      // Steps: 1. Navigate to All Projects Page without applying any sort parameters
      // Expected: The table results are sorted by the latest "เลขที่ลงรับ" (Receive Number) descending by default
      // TODO: Implement specific assertions for TC-057
      await page.waitForLoadState('networkidle');
    });

  });

  test.describe('Summary Cards', () => {
    test('TC-058: Procurement summary cards', async ({ page }) => {
      // Prerequisites: 1. User is authorized as Procurement Staff
      // Test Data: -
      // Steps: 1. Login as user `procurement1` with password `procurement1` (Role: Procurement1) 2. Navigate to All Projects Page
      // Expected: The summary cards displayed at the top include: "ทั้งหมด", "ยังไม่มอบหมาย", "รอการตอบรับ", "กำลังดำเนินการ", "ปิดโครงการ", "ยกเลิก", "ด่วน"
      // TODO: Implement specific assertions for TC-058
      await page.waitForLoadState('networkidle');
    });

    test('TC-059: External summary cards', async ({ page }) => {
      // Prerequisites: 1. User is authorized as External/Department Staff
      // Test Data: -
      // Steps: 1. Login as External/Department Staff 2. Navigate to All Projects Page
      // Expected: The summary cards displayed at the top include: "ทั้งหมด", "ยังไม่เริ่ม", "กำลังดำเนินการ", "ปิดโครงการ", "ยกเลิก", "ด่วน"
      // TODO: Implement specific assertions for TC-059
      await page.waitForLoadState('networkidle');
    });

    test('TC-060: Combined urgent summary count', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: System contains projects with statuses URGENT, VERY_URGENT, and SUPER_URGENT
      // Steps: 1. Navigate to All Projects Page 2. Inspect the "ด่วน" (Urgent) summary card count
      // Expected: The count correctly aggregates all projects with URGENT, VERY_URGENT, and SUPER_URGENT statuses together
      // TODO: Implement specific assertions for TC-060
      await page.waitForLoadState('networkidle');
    });

  });

  test.describe('Search & Filters', () => {
    test('TC-061: Quick search by receive no', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Search term matches an existing "เลขที่ลงรับ"
      // Steps: 1. Navigate to All Projects Page 2. Enter the receive number in the quick search box
      // Expected: The table filters and returns only projects matching the exact receive number
      await page.locator('input[placeholder="ค้นหาชื่อโครงการ..."]').fill('12345');
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
    });

    test('TC-062: Quick search by title', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Search term matches an existing project title
      // Steps: 1. Navigate to All Projects Page 2. Enter the project title in the quick search box
      // Expected: The table filters and returns projects matching the project title
      // TODO: Implement specific assertions for TC-062
      await page.waitForLoadState('networkidle');
    });

    test('TC-063: Quick search by assignee', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Search term matches an existing assignee name
      // Steps: 1. Navigate to All Projects Page 2. Enter the assignee's name in the quick search box
      // Expected: The table filters and returns projects assigned to the matching user
      // TODO: Implement specific assertions for TC-063
      await page.waitForLoadState('networkidle');
    });

    test('TC-064: Advanced title filter', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Search term for "ชื่อโครงการ"
      // Steps: 1. Navigate to All Projects Page 2. Enter project title and click apply
      // Expected: The backend request uses the title parameter and the table shows partial matches for the project title
      // TODO: Implement specific assertions for TC-064
      await page.waitForLoadState('networkidle');
    });

    test('TC-065: Date range filter', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Specific start and end dates
      // Steps: 1. Navigate to All Projects Page 2. Select a date range and click apply
      // Expected: The table filters correctly by the "created_at" date range
      // TODO: Implement specific assertions for TC-065
      await page.waitForLoadState('networkidle');
    });

    test('TC-066: Fiscal year filter uses Buddhist year', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Select fiscal year "2566", "2567", or "2568"
      // Steps: 1. Navigate to All Projects Page 2. Select a fiscal year and click apply
      // Expected: The frontend sends the Buddhist year value, and the backend filters the "เลขที่ลงรับ" prefix to match the Buddhist year
      // TODO: Implement specific assertions for TC-066
      await page.waitForLoadState('networkidle');
    });

    test('TC-067: Procurement type filter', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Select one or more procurement methods (e.g. e-bidding)
      // Steps: 1. Navigate to All Projects Page 2. Select specific procurement types and click apply
      // Expected: The table filters and displays only projects with the exact selected procurement types
      // TODO: Implement specific assertions for TC-067
      await page.waitForLoadState('networkidle');
    });

    test('TC-068: Procurement status filter options', async ({ page }) => {
      // Prerequisites: 1. User is authorized as Procurement Staff
      // Test Data: -
      // Steps: 1. Login as user `procurement1` with password `procurement1` (Role: Procurement1) 2. Navigate to All Projects Page 3. Expand the status filter options
      // Expected: The status options include: "ยังไม่ได้มอบหมาย", "รอการตอบรับ", "กำลังจัดซื้อ / กำลังบริหารสัญญา", "รออนุมัติยกเลิก", "ยกเลิก", "ปิดโครงการแล้ว", "การเงินส่งคืนแก้ไข"
      // TODO: Implement specific assertions for TC-068
      await page.waitForLoadState('networkidle');
    });

    test('TC-069: External status filter mapping', async ({ page }) => {
      // Prerequisites: 1. User is authorized as External Staff
      // Test Data: -
      // Steps: 1. Login as user `registration_staff` with password `registration_staff` (Role: Guest) 2. Navigate to All Projects Page 3. Apply status filters
      // Expected: "ยังไม่เริ่ม" maps to UNASSIGNED and WAITING_ACCEPT; "กำลังดำเนินการ" maps to IN_PROGRESS, WAITING_CANCEL, and REQUEST_EDIT; "ปิดโครงการ" maps to CLOSED; "ยกเลิก" maps to CANCELLED
      // TODO: Implement specific assertions for TC-069
      await page.waitForLoadState('networkidle');
    });

    test('TC-070: Urgent status filter', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Select urgency levels
      // Steps: 1. Navigate to All Projects Page 2. Open advanced filters 3. Select urgent status values and apply
      // Expected: The table accurately filters projects matching exact URGENT, VERY_URGENT, and SUPER_URGENT statuses
      // TODO: Implement specific assertions for TC-070
      await page.waitForLoadState('networkidle');
    });

    test('TC-071: Assignee filter', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Select a specific user
      // Steps: 1. Navigate to All Projects Page 2. Open advanced filters 3. Select an assignee from the filter and apply
      // Expected: The table returns projects where the selected user exists as either a procurement or contract assignee
      // TODO: Implement specific assertions for TC-071
      await page.waitForLoadState('networkidle');
    });

    test('TC-072: Department filter for procurement', async ({ page }) => {
      // Prerequisites: 1. User is authorized as Procurement Staff
      // Test Data: -
      // Steps: 1. Login as user `procurement1` with password `procurement1` (Role: Procurement1) 2. Navigate to All Projects Page 3. Open advanced filters
      // Expected: The Department filter is visible and allows filtering projects by selected departments
      // TODO: Implement specific assertions for TC-072
      await page.waitForLoadState('networkidle');
    });

    test('TC-073: External hides department filter', async ({ page }) => {
      // Prerequisites: 1. User is authorized as External Staff
      // Test Data: -
      // Steps: 1. Login as user `registration_staff` with password `registration_staff` (Role: Guest) 2. Navigate to All Projects Page 3. Open advanced filters
      // Expected: The Department filter is completely hidden, and any department query parameters are ignored/cleared
      // TODO: Implement specific assertions for TC-073
      await page.waitForLoadState('networkidle');
    });

    test('TC-074: Sort controls', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: -
      // Steps: 1. Navigate to All Projects Page 2. Click on a sortable column header (e.g., "วิธีการจัดหา")
      // Expected: The frontend sends the correct `sortBy` and `sortOrder` parameters, and the table updates accordingly
      // TODO: Implement specific assertions for TC-074
      await page.waitForLoadState('networkidle');
    });

    test('TC-075: Clear filters', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: -
      // Steps: 1. Navigate to All Projects Page 2. Apply any combination of filters 3. Click the "ล้างค่าตัวกรอง" button
      // Expected: The table view will return to the default state where you can see projects within latest 6 months prior and receive number is sorted from latest always
      await page.getByRole('button', { name: 'สถานะโครงการ' }).click();
      await page.getByRole('option', { name: 'รอการตอบรับ' }).click();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'ล้างตัวกรอง' }).click();
    });

  });

  test.describe('Status & Assignee Displays', () => {
    test('TC-076: View status labels', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Observe rows in the table matching statuses like "รอการตอบรับ", "ยังไม่ได้มอบหมาย", "รออนุมัติยกเลิก", etc.
      // Steps: 1. Navigate to All Projects Page 2. Observe the "สถานะ" column for different projects
      // Expected: The column correctly displays the Thai status labels (e.g., "ยังไม่ได้มอบหมาย", "รอการตอบรับ", "กำลังจัดซื้อ", "กำลังบริหารสัญญา", "รออนุมัติยกเลิก", "ยกเลิก", "ปิดโครงการแล้ว", "การเงินส่งคืนแก้ไข")
      // TODO: Implement specific assertions for TC-076
      await page.waitForLoadState('networkidle');
    });

    test('TC-077: Dynamic responsible name: procurement', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Project: "User Testing - Network monitoring sensors"
      // Steps: 1. Navigate to All Projects Page 2. Look at the "ผู้รับผิดชอบ" column for the project
      // Expected: The column displays the names of the procurement assignees
      // TODO: Implement specific assertions for TC-077
      await page.waitForLoadState('networkidle');
    });

    test('TC-078: Dynamic responsible name: contract', async ({ page }) => {
      // Prerequisites: 1. User is authorized and logged in
      // Test Data: Project: "User Testing - Security service contract"
      // Steps: 1. Navigate to All Projects Page 2. Look at the "ผู้รับผิดชอบ" column for the project
      // Expected: The column displays the names of the contract assignees
      // TODO: Implement specific assertions for TC-078
      await page.waitForLoadState('networkidle');
    });

  });

  test.describe('Add/Return Assignee Actions', () => {
    test('TC-079: Original assignee can add assignee', async ({ page }) => {
      // Prerequisites: 1. User is authorized as the original assignee of a project
      // Test Data: Project: "User Testing - Network monitoring sensors" (Status: IN_PROGRESS)
      // Steps: 1. Login as user `procurement1` with password `procurement1` (Role: Procurement1) 2. Navigate to All Projects Page 3. Click the three dots menu on the target project
      // Expected: The "เพิ่มผู้รับผิดชอบ" (Add Assignee) action is available in the menu
      await page.goto('/login');
      await login(page, 'procurement1');
      await page.goto('/app/projects');
      const row = page.locator('tbody tr').first();
      if (await row.isVisible()) {
        await row.locator('button[aria-haspopup="menu"]').click();
        await expect(page.getByRole('menuitem', { name: 'เพิ่มผู้รับผิดชอบ' }).or(page.getByRole('menuitem', { name: 'ขอยกเลิกโครงการ' }))).toBeVisible();
      }
    });

    test('TC-080: Procurement head can add assignee', async ({ page }) => {
      // Prerequisites: 1. User is authorized as the Procurement Head
      // Test Data: Project: "User Testing - Network monitoring sensors" (Status: IN_PROGRESS)
      // Steps: 1. Login as user `proc_head1` with password `proc_head1` (Role: Procurement Head1) 2. Navigate to All Projects Page 3. Click the three dots menu on the target project
      // Expected: The "เพิ่มผู้รับผิดชอบ" (Add Assignee) action is available in the menu
      // TODO: Implement specific assertions for TC-080
      await page.waitForLoadState('networkidle');
    });

    test('TC-081: Admin can add assignee', async ({ page }) => {
      // Prerequisites: 1. User is authorized as Admin
      // Test Data: Project: "User Testing - Network monitoring sensors" (Status: IN_PROGRESS)
      // Steps: 1. Login as user `super_admin` with password `super_admin` (Role: Super Admin) 2. Navigate to All Projects Page 3. Click the three dots menu on the target project
      // Expected: The "เพิ่มผู้รับผิดชอบ" (Add Assignee) action is available in the menu
      // TODO: Implement specific assertions for TC-081
      await page.waitForLoadState('networkidle');
    });

    test('TC-082: Add assignee same workgroup only', async ({ page }) => {
      // Prerequisites: 1. User is authorized as an eligible assignee (e.g., Original Assignee)
      // Test Data: -
      // Steps: 1. Navigate to All Projects Page 2. Click the three dots menu and select "เพิ่มผู้รับผิดชอบ" 3. Search for users in the dialog
      // Expected: Selectable users are strictly limited to the project's workgroup, and the backend rejects invalid users
      // TODO: Implement specific assertions for TC-082
      await page.waitForLoadState('networkidle');
    });

    test('TC-083: Add assignee only IN_PROGRESS', async ({ page }) => {
      // Prerequisites: 1. User is authorized as an eligible assignee
      // Test Data: Projects like "User Testing - New chairs for reading room", "User Testing - Completed tablet procurement"
      // Steps: 1. Navigate to All Projects Page 2. Click the three dots menu on non-IN_PROGRESS projects
      // Expected: The "เพิ่มผู้รับผิดชอบ" action is hidden or disabled for all statuses other than IN_PROGRESS
      // TODO: Implement specific assertions for TC-083
      await page.waitForLoadState('networkidle');
    });

    test('TC-084: Original assignee can return project', async ({ page }) => {
      // Prerequisites: 1. User is authorized as the Original Assignee
      // Test Data: Project: "User Testing - Network monitoring sensors"
      // Steps: 1. Login as user `procurement1` with password `procurement1` (Role: Procurement1) 2. Navigate to All Projects Page 3. Click the three dots menu and select the return action 4. Confirm the return
      // Expected: The project successfully returns to the pool, its status becomes UNASSIGNED, and all active assignees are cleared
      // TODO: Implement specific assertions for TC-084
      await page.waitForLoadState('networkidle');
    });

    test('TC-085: Non-original assignee/head cannot return', async ({ page }) => {
      // Prerequisites: 1. User is authorized as an added Assignee or the Workgroup Head
      // Test Data: Project: "User Testing - Network monitoring sensors"
      // Steps: 1. Login as user `procurement2` with password `procurement2` (Role: Procurement2) or Procurement Head 2. Navigate to All Projects Page 3. Click the three dots menu on the target project
      // Expected: The return action is hidden from the UI, and direct API calls are rejected
      // TODO: Implement specific assertions for TC-085
      await page.waitForLoadState('networkidle');
    });

    test('TC-086: Return hidden when not eligible', async ({ page }) => {
      // Prerequisites: 1. User is authorized as the Original Assignee
      // Test Data: Project: "User Testing - Accounting software renewal"
      // Steps: 1. Navigate to All Projects Page 2. Click the three dots menu on the target project
      // Expected: The return action is hidden or disabled from the UI, and direct API calls are rejected
      // TODO: Implement specific assertions for TC-086
      await page.waitForLoadState('networkidle');
    });

  });

  test.describe('Cancel Project Actions', () => {
    test('TC-087: Cancel disabled statuses', async ({ page }) => {
      // Prerequisites: 1. User is authorized
      // Test Data: Projects like "User Testing - Completed tablet procurement", "User Testing - Cancelled printer repair"
      // Steps: 1. Navigate to All Projects Page 2. Click the three dots menu on these projects
      // Expected: The cancel ("ขอยกเลิกโครงการ" / "ยกเลิกโครงการ") action is hidden or disabled, and direct API calls are rejected
      // TODO: Implement specific assertions for TC-087
      await page.waitForLoadState('networkidle');
    });

    test('TC-088: Cancel reason required', async ({ page }) => {
      // Prerequisites: 1. User is authorized
      // Test Data: Project: "User Testing - Data center UPS upgrade"
      // Steps: 1. Navigate to All Projects Page 2. Open the cancel dialog 3. Leave the "ระบุเหตุผลในการยกเลิก" text area empty or fill with whitespace
      // Expected: Confirmed button is disabled
      // TODO: Implement specific assertions for TC-088
      await page.waitForLoadState('networkidle');
    });

    test('TC-089: Staff cancel request', async ({ page }) => {
      // Prerequisites: 1. User is authorized as Procurement Staff
      // Test Data: Project: "User Testing - Data center UPS upgrade" with reason "Duplicate plan"
      // Steps: 1. Login as user `procurement1` with password `procurement1` (Role: Procurement1) 2. Navigate to All Projects Page 3. Open cancel dialog for a project 4. Enter a reason and submit
      // Expected: The cancellation request is submitted, and the project status changes to WAITING_CANCEL
      // TODO: Implement specific assertions for TC-089
      await page.waitForLoadState('networkidle');
    });

    test('TC-090: Head direct cancel', async ({ page }) => {
      // Prerequisites: 1. User is authorized as Procurement Head
      // Test Data: Project: "User Testing - Data center UPS upgrade" with reason "Duplicate plan"
      // Steps: 1. Login as user `proc_head1` with password `proc_head1` (Role: Procurement Head1) 2. Navigate to All Projects Page 3. Open cancel dialog for a project 4. Enter a reason and submit
      // Expected: The project is cancelled directly, its status becomes CANCELLED without requiring further approval
      // TODO: Implement specific assertions for TC-090
      await page.waitForLoadState('networkidle');
    });

    test('TC-091: Cancellation approval/rejection', async ({ page }) => {
      // Prerequisites: 1. User is authorized as Procurement Head
      // Test Data: Project: "User Testing - Air purifier order"
      // Steps: 1. Login as user `proc_head1` with password `proc_head1` (Role: Procurement Head1) 2. Navigate to All Projects Page 3. Approve or Reject the WAITING_CANCEL request
      // Expected: Approving changes the project status to CANCELLED; Rejecting restores the project to its previous valid status
      // TODO: Implement specific assertions for TC-091
      await page.waitForLoadState('networkidle');
    });

  });

  test.describe('Audit Logs & Edge Cases', () => {
    test('TC-092: Basic audit: assignee change', async ({ page }) => {
      // Prerequisites: 1. User is authorized
      // Test Data: -
      // Steps: 1. Perform the "เพิ่มผู้รับผิดชอบ" (Add Assignee) action on a project 2. Inspect the audit logs/history for the project
      // Expected: The audit log correctly records the actor, the old/new assignee states, the project, and the timestamp
      // TODO: Implement specific assertions for TC-092
      await page.waitForLoadState('networkidle');
    });

    test('TC-093: Basic audit: return', async ({ page }) => {
      // Prerequisites: 1. User is authorized
      // Test Data: -
      // Steps: 1. Perform a project return action 2. Inspect the audit logs/history for the project
      // Expected: The audit log correctly records the actor, the status and assignee change, the project, and the timestamp
      // TODO: Implement specific assertions for TC-093
      await page.waitForLoadState('networkidle');
    });

    test('TC-094: Basic audit: cancellation', async ({ page }) => {
      // Prerequisites: 1. User is authorized
      // Test Data: -
      // Steps: 1. Perform a cancellation request, approval, and/or rejection 2. Inspect the audit logs/history for the project
      // Expected: The cancellation history correctly records the requester, reason, and approver/result (where applicable)
      // TODO: Implement specific assertions for TC-094
      await page.waitForLoadState('networkidle');
    });

    test('TC-095: Loading and error states', async ({ page }) => {
      // Prerequisites: 1. User is accessing All Projects Page
      // Test Data: -
      // Steps: 1. Simulate network loading delay and API failure while fetching the project list or summary cards
      // Expected: A loading indicator appears during fetch, and a retryable error state/UI is displayed upon failure
      // TODO: Implement specific assertions for TC-095
      await page.waitForLoadState('networkidle');
    });

  });
});
