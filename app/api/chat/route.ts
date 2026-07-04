import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { extractTransactions, type ExtractedTx } from "@/lib/llm/extractTransactions";
import { resolveAll } from "@/lib/llm/resolve";
import { IS_MOCK_MODE } from "@/lib/llm/config";

// ============================================================
// POST /api/chat
// รับข้อความภาษาธรรมชาติ → AI แยกเป็นรายการ →
//   (a) ถ้าชัดเจน → บันทึกเลย
//   (b) ถ้ากำกวม → ส่ง draft กลับให้ผู้ใช้ยืนยัน
// ============================================================

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const text: string = (body.text || "").toString().trim();
  if (!text) {
    return NextResponse.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
  }

  // ดึงหมวดหมู่ + บัญชีของผู้ใช้ (รวมหมวดเริ่มต้น userId = null)
  const [categories, accounts] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ userId: user.id }, { userId: null, isDefault: true }] },
      select: { id: true, name: true, type: true },
    }),
    prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (accounts.length === 0) {
    return NextResponse.json({
      understood: true,
      message: "คุณยังไม่มีบัญชี/กระเป๋าเงิน ไปสร้างก่อนที่หน้าตั้งค่านะ 🙏",
      transactions: [],
    });
  }

  // วันที่ที่ผู้ใช้ระบุ (optional) ถ้าไม่ระบุใช้วันนี้
  const date = body.date ? new Date(body.date) : new Date();

  // เรียก AI สกัดรายการ
  let result;
  try {
    result = await extractTransactions(text, categories, accounts);
  } catch (err) {
    console.error("Chat extract error:", err);
    return NextResponse.json({
      understood: false,
      message:
        "ขอโทษครับ เกิดข้อผิดพลาดในการเชื่อม GLM ลองอีกครั้งได้ไหม? 🙏",
      transactions: [],
    });
  }

  if (result.transactions.length === 0) {
    // กรณี AI ถามกลับโดยไม่มีรายการเลย (เช่น "วันนี้ 90")
    // → ส่งคำถามกลับให้ผู้ใช้ตอบ ไม่ใช่ "บันทึกไม่ได้"
    if (result.ambiguous && result.followUpQuestion) {
      return NextResponse.json({
        understood: true,
        needsConfirm: false,
        question: result.followUpQuestion,
        message: result.followUpQuestion,
        transactions: [],
        mockMode: IS_MOCK_MODE || Boolean(result.usedMock),
      });
    }
    return NextResponse.json({
      understood: true,
      message: result.message,
      transactions: [],
      mockMode: IS_MOCK_MODE || Boolean(result.usedMock),
    });
  }

  // resolve category/account
  const { resolved, unresolvedCategory } = resolveAll(
    result.transactions,
    categories,
    accounts,
    date
  );

  if (resolved.length === 0) {
    return NextResponse.json({
      understood: true,
      message: "อ่านไม่เข้าใจ ลองพิมพ์ใหม่อีกครั้งได้ไหม? 🙏",
      transactions: [],
      mockMode: IS_MOCK_MODE || Boolean(result.usedMock),
    });
  }

  // กรณีกำกวม (ambiguous หรือมีหมวดที่ map ไม่ได้) → ส่ง draft ให้ยืนยัน
  const needsConfirm = result.ambiguous || unresolvedCategory;
  if (needsConfirm) {
    const draftForClient = resolved.map((t, i) => ({
      tempId: i,
      type: t.type,
      amount: t.amount,
      categoryId: t.categoryId, // อาจเป็น null
      accountId: t.accountId,
      note: t.note,
      date: t.date.toISOString(),
    }));
    return NextResponse.json({
      understood: true,
      needsConfirm: true,
      draft: draftForClient,
      question: result.followUpQuestion || "บางรายการไม่แน่ใจหมวดหมู่ ยืนยันได้ไหม?",
      message: result.message,
      mockMode: IS_MOCK_MODE || Boolean(result.usedMock),
    });
  }

  // กรณีชัดเจน → บันทึกทันที
  const created = await prisma.$transaction(
    resolved.map((t) =>
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
    understood: true,
    saved: true,
    transactions: created,
    message: `✅ บันทึก ${created.length} รายการ รวม ฿${total.toLocaleString(
      "th-TH"
    )}`,
    mockMode: IS_MOCK_MODE || Boolean(result.usedMock),
  });
}

// GET แค่บอกสถานะโหมด (สำหรับ UI แสดง banner)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ mockMode: IS_MOCK_MODE });
}
