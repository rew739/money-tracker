import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// PUT /api/transactions/[id] - แก้ไขรายการ
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { type, amount, date, categoryId, accountId, note } = body;

  // ตรวจสอบว่ารายการเป็นของผู้ใช้คนนี้
  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }

  if (type && !["income", "expense", "transfer"].includes(type)) {
    return NextResponse.json({ error: "ประเภทไม่ถูกต้อง" }, { status: 400 });
  }

  if (amount !== undefined) {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "จำนวนเงินต้องมากกว่า 0" }, { status: 400 });
    }
  }

  // บัญชี (ถ้าเปลี่ยน) ต้องเป็นของผู้ใช้จริง
  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 400 });
    }
  }

  // หมวดหมู่: undefined = ไม่แก้, null = ล้างหมวด, string = ตรวจสิทธิ์+ประเภทก่อน
  const newType: string = type || existing.type;
  let categoryUpdate: string | null | undefined = undefined;
  if (categoryId === null) {
    categoryUpdate = null;
  } else if (typeof categoryId === "string" && categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId: user.id }, { userId: null, isDefault: true }],
        ...(newType === "income" || newType === "expense" ? { type: newType } : {}),
      },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: "หมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
    }
    categoryUpdate = categoryId;
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      type: type || undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      date: date ? new Date(date) : undefined,
      categoryId: categoryUpdate,
      accountId: accountId || undefined,
      note: note ?? undefined,
    },
    include: { category: true, account: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/transactions/[id] - ลบรายการ
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
