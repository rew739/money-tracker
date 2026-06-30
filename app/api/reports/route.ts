import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/reports?month=YYYY-MM - ข้อมูลสำหรับกราฟและรายงาน
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");

  // คำนวณช่วงเดือน
  const now = new Date();
  const year = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam.split("-")[1]) : now.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  // ดึงธุรกรรมทั้งหมดในเดือนที่เลือก
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: start, lte: end },
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
  const monthlyComparison: { month: string; income: number; expense: number; balance: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(year, month - 1 - i, 1);
    const mEnd = new Date(year, month - i, 0, 23, 59, 59);
    const monthLabel = `${mStart.toLocaleDateString("th-TH", { month: "short" })} ${mStart.getFullYear() + 543}`;

    const mTx = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: mStart, lte: mEnd } },
    });

    const mIncome = mTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const mExpense = mTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    monthlyComparison.push({
      month: monthLabel,
      income: mIncome,
      expense: mExpense,
      balance: mIncome - mExpense,
    });
  }

  // แนวโน้มรายวัน (30 วันล่าสุด)
  const dailyTrend: { date: string; income: number; expense: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 23, 59, 59);
    const dayLabel = dayStart.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

    const dayTx = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: dayStart, lte: dayEnd } },
    });

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
