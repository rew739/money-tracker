import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ============================================================
// POST /api/chat/confirm
// รับ draft ที่ผู้ใช้ยืนยัน (อาจแก้ category/account แล้ว) แล้วบันทึกจริง
// ============================================================

interface DraftItem {
  type: "income" | "expense";
  amount: number;
  categoryId?: string | null;
  accountId: string;
  note?: string | null;
  date?: string;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const items: DraftItem[] = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "ไม่มีรายการให้บันทึก" }, { status: 400 });
  }

  // ตรวจสอบว่า accountId ทั้งหมดเป็นของผู้ใช้จริง
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const validAccountIds = new Set(accounts.map((a) => a.id));

  // ตรวจสอบว่า categoryId ทั้งหมดเป็นของผู้ใช้จริง
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const validCategoryIds = new Set(categories.map((c) => c.id));

  // กรองเฉพาะรายการที่ถูกต้อง
  const valid: {
    type: string;
    amount: number;
    categoryId: string | null;
    accountId: string;
    note: string | null;
    date: Date;
  }[] = [];

  for (const item of items) {
    if (!item.amount || item.amount <= 0) continue;
    if (!item.accountId || !validAccountIds.has(item.accountId)) continue;
    
    // ตรวจสอบความถูกต้องของ categoryId
    const safeCategoryId = (item.categoryId && validCategoryIds.has(item.categoryId)) 
      ? item.categoryId 
      : null;

    valid.push({
      type: item.type === "income" ? "income" : "expense",
      amount: Number(item.amount),
      categoryId: safeCategoryId,
      accountId: item.accountId,
      note: item.note || null,
      date: item.date ? new Date(item.date) : new Date(),
    });
  }

  if (valid.length === 0) {
    return NextResponse.json({
      error: "รายการไม่ถูกต้อง กรุณาตรวจสอบบัญชี/ยอด",
    }, { status: 400 });
  }

  // บันทึกทีเดียวใน transaction
  const created = await prisma.$transaction(
    valid.map((t) =>
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: t.type,
          amount: t.amount,
          categoryId: t.categoryId,
          accountId: t.accountId,
          note: t.note,
          date: t.date,
        },
        include: { category: true, account: true },
      })
    )
  );

  const total = created.reduce((s, t) => s + t.amount, 0);
  return NextResponse.json({
    saved: true,
    transactions: created,
    message: `✅ บันทึก ${created.length} รายการ รวม ฿${total.toLocaleString(
      "th-TH"
    )}`,
  });
}
