// ============================================================
// เวลาไทย (UTC+7)
// server อาจรันเป็น UTC (เช่น Vercel) การใช้ new Date(y, m, d) ตรงๆ
// จะได้ขอบเขตเดือน/วันตามเวลา server ไม่ใช่เวลาไทย
// จึงรวมตัวช่วยคำนวณขอบเขตโดยอิงเวลาไทยเสมอไว้ที่นี่
// ============================================================

const TH_OFFSET_MS = 7 * 60 * 60 * 1000;

/** ปี/เดือน(1-12)/วัน ปัจจุบันตามเวลาไทย ไม่ขึ้นกับ timezone ของ server */
export function thaiToday() {
  const t = new Date(Date.now() + TH_OFFSET_MS);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

/** ช่วงเวลา [start, end) ของเดือนตามเวลาไทย (month: 1-12, เกินขอบเขตได้ เช่น 0 หรือ 13) */
export function thaiMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1) - TH_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - TH_OFFSET_MS);
  return { start, end };
}

/** ช่วงเวลา [start, end) ของวันตามเวลาไทย (day เกินขอบเขตเดือนได้ เช่น 0 หรือ -5) */
export function thaiDayRange(year: number, month: number, day: number) {
  const start = new Date(Date.UTC(year, month - 1, day) - TH_OFFSET_MS);
  const end = new Date(Date.UTC(year, month - 1, day + 1) - TH_OFFSET_MS);
  return { start, end };
}

/** คีย์เดือนไทยของเวลาใดๆ (year*12 + monthIndex) สำหรับจัดกลุ่มในหน่วยความจำ */
export function thaiMonthKey(date: Date): number {
  const t = new Date(date.getTime() + TH_OFFSET_MS);
  return t.getUTCFullYear() * 12 + t.getUTCMonth();
}

/** คีย์วันไทยรูปแบบ YYYY-MM-DD ของเวลาใดๆ สำหรับจัดกลุ่มในหน่วยความจำ */
export function thaiDayKey(date: Date): string {
  const t = new Date(date.getTime() + TH_OFFSET_MS);
  return t.toISOString().slice(0, 10);
}
