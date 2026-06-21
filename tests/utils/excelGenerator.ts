import * as xlsx from 'xlsx';

export const LESSPAPER_HEADERS = [
  'เลขที่ใบขอซื้อขอจ้าง',
  'เลขที่รับจาก Less paper',
  'โครงการ',
  'รายละเอียด',
  'วิธีการจัดหา',
  'วันที่ส่งมอบ',
  'วงเงินงบประมาณ',
  'หน่วยงาน',
  'ฝ่าย',
  'ปีงบประมาณ',
];

export const FIORI_HEADERS = [
  'เลขที่ใบขอซื้อขอจ้าง',
  'โครงการ',
  'รายละเอียด',
  'วิธีการจัดหา',
  'วันที่ส่งมอบ',
  'วงเงินงบประมาณ',
  'หน่วยงาน',
  'ฝ่าย',
  'ปีงบประมาณ',
];

export function generateExcelBuffer(headers: string[], rows: Record<string, any>[], sheetName = 'LessPaper'): Buffer {
  const ws = xlsx.utils.json_to_sheet(rows, { header: headers });
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
