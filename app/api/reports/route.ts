import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  thaiToday,
  thaiMonthRange,
  thaiDayRange,
  thaiMonthKey,
  thaiDayKey,
} from "@/lib/dates";

// GET /api/reports?month=YYYY-MM - ข้อมูลสำหรับกราฟและรายงาน
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");

  // คำนวณช่วงเดือนตามเวลาไทย (server อาจรันเป็น UTC)
  const today = thaiToday();
  const year = monthParam ? parseInt(monthParam.split("-")[0]) : today.year;
  const month = monthParam ? parseInt(monthParam.split("-")[1]) : today.month;
  const { start, end } = thaiMonthRange(year, month);

  // ดึงธุรกรรมทั้งหมดในเดือนที่เลือก
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: start, lt: end },
    },
    include: { category: true },
  });

  // สรุปรายรับ / รายจ่าย
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  // รายจ่ายตามหมวดหมู่ (สำหรับกราฟวงกลม)
  const expenseByCategory: { name: string; amount: number; color: string; icon: string }[] = [];
  const categoryMap = new Map<string, { name: string; amount: number; color: string; icon: string }>();

  for (const t of transactions.filter((t) => t.type === "expense" && t.category)) {
    const cat = t.category!;
    const key = cat.id;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { name: cat.name, amount: 0, color: cat.color, icon: cat.icon });
    }
    categoryMap.get(key)!.amount += t.amount;
  }
  for (const v of categoryMap.values()) {
    expenseByCategory.push(v);
  }
  expenseByCategory.sort((a, b) => b.amount - a.amount);

  // รายรับตามหมวดหมู่
  const incomeByCategory: { name: string; amount: number; color: string; icon: string }[] = [];
  const incomeMap = new Map<string, { name: string; amount: number; color: string; icon: string }>();

  for (const t of transactions.filter((t) => t.type === "income" && t.category)) {
    const cat = t.category!;
    const key = cat.id;
    if (!incomeMap.has(key)) {
      incomeMap.set(key, { name: cat.name, amount: 0, color: cat.color, icon: cat.icon });
    }
    incomeMap.get(key)!.amount += t.amount;
  }
  for (const v of incomeMap.values()) {
    incomeByCategory.push(v);
  }

  // เปรียบเทียบ 6 เดือนล่าสุด (สำหรับกราฟแท่ง)
  // ดึงครั้งเดียวทั้งช่วงแล้วจัดกลุ่มในหน่วยความจำ (เดิมยิง 6 query ใน loop)
  const sixMonthsStart = thaiMonthRange(year, month - 5).start;
  const compTx = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: sixMonthsStart, lt: end } },
    select: { type: true, amount: true, date: true },
  });

  const monthlyComparison: { month: string; income: number; expense: number; balance: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    // ตัวแทนเดือน (ใช้ UTC ล้วน เพื่อให้ label ไม่ขึ้นกับ timezone ของ server)
    const mDate = new Date(Date.UTC(year, month - 1 - i, 1));
    const mKey = mDate.getUTCFullYear() * 12 + mDate.getUTCMonth();
    const monthLabel = `${mDate.toLocaleDateString("th-TH", {
      month: "short",
      timeZone: "UTC",
    })} ${mDate.getUTCFullYear() + 543}`;

    const mTx = compTx.filter((t) => thaiMonthKey(t.date) === mKey);
    const mIncome = mTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const mExpense = mTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    monthlyComparison.push({
      month: monthLabel,
      income: mIncome,
      expense: mExpense,
      balance: mIncome - mExpense,
    });
  }

  // แนวโน้มรายวัน 30 วัน — อิงเดือนที่เลือก (เดิมอิงวันนี้เสมอ และยิง 30 query ใน loop)
  // เดือนปัจจุบัน: นับถอยหลังจากวันนี้ / เดือนอื่น: นับถอยหลังจากวันสุดท้ายของเดือนนั้น
  const isCurrentMonth = year === today.year && month === today.month;
  const anchorDay = isCurrentMonth
    ? { year: today.year, month: today.month, day: today.day }
    : { year, month, day: new Date(Date.UTC(year, month, 0)).getUTCDate() };

  const trendStart = thaiDayRange(anchorDay.year, anchorDay.month, anchorDay.day - 29).start;
  const trendEnd = thaiDayRange(anchorDay.year, anchorDay.month, anchorDay.day).end;
  const trendTx = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: trendStart, lt: trendEnd } },
    select: { type: true, amount: true, date: true },
  });

  const dailyTrend: { date: string; income: number; expense: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayDate = new Date(Date.UTC(anchorDay.year, anchorDay.month - 1, anchorDay.day - i));
    const dayKey = dayDate.toISOString().slice(0, 10);
    const dayLabel = dayDate.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

    const dayTx = trendTx.filter((t) => thaiDayKey(t.date) === dayKey);
    dailyTrend.push({
      date: dayLabel,
      income: dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    });
  }

  return NextResponse.json({
    summary: { totalIncome, totalExpense, balance, savingsRate },
    expenseByCategory,
    incomeByCategory,
    monthlyComparison,
    dailyTrend,
    selectedMonth: `${year}-${String(month).padStart(2, "0")}`,
  });
}
