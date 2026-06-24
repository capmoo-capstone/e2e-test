const fs = require('fs');
const path = require('path');

const stringsToCheck = [
  "ไปที่หน้ากรอกฟอร์มส่งใบแจ้งหนี้/ใบส่งของ/ใบวางบิล", "วันที่ส่งมอบ", "เลขที่ลงรับ", "ชื่อโครงการ",
  "หน่วยงาน", "สถานะ", "งานยังไม่เริ่ม Step 1", "กำลังดำเนินการ", "รอแก้ไข", "การเงินส่งคืนแก้ไข",
  "ด่วน", "ด่วนที่สุด", "ด่วนพิเศษ", "ลองอีกครั้ง", "ไม่พบข้อมูล", "กลุ่มงาน", "ชื่อเจ้าหน้าที่",
  "จำนวนโครงการที่รับผิดชอบ", "ระยะเวลาการทำงานเฉลี่ย", "โครงการทั้งหมด", "รอการตอบรับ", "เสร็จสิ้น",
  "ยกเลิก", "วิธีจัดหา", "งานที่เพิ่มใหม่", "งานที่แล้วเสร็จ", "งานคงค้าง", "งานเร่งด่วน", "ผู้ค้า",
  "เลขที่ใบสั่งซื้อ/จ้าง", "คณะกรรมการตรวจรับ", "เจ้าหน้าที่บริหารสัญญา", "วันนี้", "เดือนนี้",
  "ปีงบประมาณ", "ยังไม่ได้มอบหมาย", "ยังไม่เริ่ม", "งบลงทุน", "แนวโน้มงาน", "งานล่าช้า", "จำนวนวันที่ล่าช้า",
  "วันที่ต้องส่งมอบ", "ใกล้ครบกำหนด", "เร่งด่วน", "เฝ้าระวัง", "ปกติ", "ช่วงจัดซื้อ/จัดจ้าง", "ช่วงบริหารสัญญา",
  "เพิ่มขึ้น", "ลดลง", "เท่าเดิม", "โครงการที่ใช้เวลานานที่สุด 5 อันดับ", "ขั้นตอนที่ใช้เวลามากที่สุด",
  "งานที่เสร็จตามกำหนด", "งบประมาณรวม", "งบประมาณที่ใช้ไป", "จำนวนแผนทั้งหมด", "ยังไม่ถูกใช้",
  "ดำเนินการเสร็จสิ้น", "ประเภทกิจกรรม", "ชื่อรายการ", "รายละเอียด", "ศูนย์ต้นทุน", "วงเงินงบประมาณ",
  "ยังไม่ได้ดำเนินการ", "ดำเนินการเรียบร้อย", "อ่านแล้ว", "ต้องดำเนินการ", "แจ้งเพื่อทราบ", "ทั้งหมด", "เลขที่สัญญา"
];

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const frontendSrcPath = path.join(__dirname, '../frontend/src');
const allFiles = getAllFiles(frontendSrcPath);

const foundStrings = new Set();

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  stringsToCheck.forEach(str => {
    if (content.includes(str)) {
      foundStrings.add(str);
    }
  });
});

const missingStrings = stringsToCheck.filter(str => !foundStrings.has(str));

console.log("Found Strings:", foundStrings.size);
console.log("Missing Strings:", missingStrings.length);
if (missingStrings.length > 0) {
  console.log("Here are the strings NOT found in frontend/src:");
  console.log(JSON.stringify(missingStrings, null, 2));
}
