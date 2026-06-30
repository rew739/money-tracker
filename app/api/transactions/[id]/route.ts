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

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      type: type || undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      date: date ? new Date(date) : undefined,
      categoryId: categoryId ?? undefined,
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
