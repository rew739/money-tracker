import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { thaiMonthRange } from "@/lib/dates";

// GET /api/transactions - ดึงรายการธุรกรรม (รองรับ query กรอง)
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM
  const type = searchParams.get("type"); // income | expense
  const categoryId = searchParams.get("categoryId");

  const where: {
    userId: string;
    type?: string;
    categoryId?: string;
    date?: { gte: Date; lt: Date };
  } = { userId: user.id };

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;

  if (month) {
    const [year, m] = month.split("-").map(Number);
    // ขอบเขตเดือนตามเวลาไทย (server อาจเป็น UTC) และใช้ lt ต้นเดือนถัดไป
    // แทน lte 23:59:59 เพื่อไม่ให้หลุดช่วงเสี้ยววินาทีสุดท้ายของเดือน
    const { start, end } = thaiMonthRange(year, m);
    where.date = { gte: start, lt: end };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

// POST /api/transactions - สร้างรายการธุรกรรมใหม่
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, amount, date, categoryId, accountId, note } = body;

  if (!type || !amount || !date || !accountId) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }
  if (!["income", "expense", "transfer"].includes(type)) {
    return NextResponse.json({ error: "ประเภทไม่ถูกต้อง" }, { status: 400 });
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "จำนวนเงินต้องมากกว่า 0" }, { status: 400 });
  }

  // บัญชีต้องเป็นของผู้ใช้จริง — กันยิง API ใส่ accountId ของคนอื่น
  // ซึ่งจะทำให้ยอดคงเหลือบัญชีของเจ้าของเพี้ยน
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: user.id },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 400 });
  }

  // หมวดหมู่ (ถ้าระบุ) ต้องเป็นของผู้ใช้หรือหมวดเริ่มต้น และตรงประเภทรายการ
  let safeCategoryId: string | null = categoryId || null;
  if (safeCategoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: safeCategoryId,
        OR: [{ userId: user.id }, { userId: null, isDefault: true }],
        ...(type === "income" || type === "expense" ? { type } : {}),
      },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: "หมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type,
      amount: amountNum,
      date: new Date(date),
      categoryId: safeCategoryId,
      accountId,
      note: note || null,
    },
    include: { category: true, account: true },
  });

  return NextResponse.json(transaction, { status: 201 });
}
