import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/categories - ดึงหมวดหมู่ (เริ่มต้น + ที่สร้างเอง)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // หมวดเริ่มต้น (สำหรับทุกคน) + หมวดที่ผู้ใช้สร้างเอง
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { isDefault: true },
        { userId: user.id },
      ],
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

// POST /api/categories - สร้างหมวดหมู่ใหม่ (ส่วนตัว)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, type, color, icon } = body;

  if (!name || !type || !["income", "expense"].includes(type)) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      name,
      type,
      color: color || "#6366f1",
      icon: icon || "💰",
      isDefault: false,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
