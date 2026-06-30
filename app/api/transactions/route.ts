import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
    date?: { gte: Date; lte: Date };
  } = { userId: user.id };

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;

  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
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

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type,
      amount: Number(amount),
      date: new Date(date),
      categoryId: categoryId || null,
      accountId,
      note: note || null,
    },
    include: { category: true, account: true },
  });

  return NextResponse.json(transaction, { status: 201 });
}
