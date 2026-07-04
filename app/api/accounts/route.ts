import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/accounts - ดึงบัญชีทั้งหมดของผู้ใช้
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  // คำนวณยอดคงเหลือทุกบัญชีด้วย query เดียว (เดิมยิง 2 query ต่อบัญชี)
  // กรอง userId ด้วย กันรายการของ user อื่นที่ชี้บัญชีเรามาปนในยอด
  const sums = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { userId: user.id, type: { in: ["income", "expense"] } },
    _sum: { amount: true },
  });

  const accountsWithBalance = accounts.map((acc) => {
    const totalIncome =
      sums.find((s) => s.accountId === acc.id && s.type === "income")?._sum
        .amount || 0;
    const totalExpense =
      sums.find((s) => s.accountId === acc.id && s.type === "expense")?._sum
        .amount || 0;
    return {
      ...acc,
      balance: acc.initialBalance + totalIncome - totalExpense,
    };
  });

  return NextResponse.json(accountsWithBalance);
}

// POST /api/accounts - สร้างบัญชีใหม่
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, type, initialBalance } = body;

  if (!name) {
    return NextResponse.json({ error: "กรุณาระบุชื่อบัญชี" }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name,
      type: type || "cash",
      initialBalance: Number(initialBalance || 0),
    },
  });

  return NextResponse.json(account, { status: 201 });
}
