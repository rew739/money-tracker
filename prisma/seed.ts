import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 เริ่ม seed ข้อมูล...");

  // ---------- หมวดหมู่เริ่มต้น (สำหรับผู้ใช้ใหม่ทุกคน) ----------
  const defaultCategories = [
    // รายรับ
    { name: "เงินเดือน", type: "income", color: "#10b981", icon: "💼", isDefault: true },
    { name: "รายได้เสริม", type: "income", color: "#22c55e", icon: "💵", isDefault: true },
    { name: "ของขวัญ", type: "income", color: "#7ba780", icon: "🎁", isDefault: true },
    { name: "อื่นๆ (รายรับ)", type: "income", color: "#8a857c", icon: "➕", isDefault: true },
    // รายจ่าย (โทน earth/sage หม่น เพื่อความสบายตา)
    { name: "อาหาร", type: "expense", color: "#c97b6b", icon: "🍔", isDefault: true },
    { name: "เดินทาง", type: "expense", color: "#c4a25f", icon: "🚗", isDefault: true },
    { name: "ช้อปปิ้ง", type: "expense", color: "#af7c9b", icon: "🛍️", isDefault: true },
    { name: "ที่อยู่อาศัย", type: "expense", color: "#6f8caf", icon: "🏠", isDefault: true },
    { name: "บิลค่าใช้จ่าย", type: "expense", color: "#5f8d8a", icon: "🧾", isDefault: true },
    { name: "สุขภาพ", type: "expense", color: "#a8a06b", icon: "💊", isDefault: true },
    { name: "ความบันเทิง", type: "expense", color: "#8a7caf", icon: "🎬", isDefault: true },
    { name: "การศึกษา", type: "expense", color: "#6b8e7f", icon: "📚", isDefault: true },
    { name: "อื่นๆ (รายจ่าย)", type: "expense", color: "#9b7c6b", icon: "📦", isDefault: true },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { id: `default-${cat.name}` },
      update: {},
      create: { ...cat, id: `default-${cat.name}` },
    });
  }
  console.log(`✅ สร้างหมวดหมู่เริ่มต้น ${defaultCategories.length} รายการ`);

  // ---------- บัญชีตัวอย่าง + ผู้ใช้ทดสอบ ----------
  const existing = await prisma.user.findUnique({ where: { email: "demo@example.com" } });
  if (existing) {
    console.log("ℹ️ ผู้ใช้ demo มีอยู่แล้ว ข้ามการสร้างข้อมูลตัวอย่าง");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "demo@example.com",
      name: "ผู้ใช้ทดลอง",
      passwordHash,
      currency: "THB",
    },
  });

  // กระเป๋าเงินตัวอย่าง
  const cash = await prisma.account.create({
    data: { userId: user.id, name: "เงินสด", type: "cash", initialBalance: 5000 },
  });
  const bank = await prisma.account.create({
    data: { userId: user.id, name: "บัญชีกสิกร", type: "bank", initialBalance: 50000 },
  });
  console.log("✅ สร้างบัญชีตัวอย่าง 2 บัญชี");

  // ดึงหมวดเริ่มต้นมาใช้สร้างรายการ
  const cats = await prisma.category.findMany({ where: { isDefault: true } });
  const catByName = (name: string) => cats.find((c) => c.name === name)!;

  // ---------- ข้อมูลธุรกรรมตัวอย่าง 6 เดือนล่าสุก ----------
  const now = new Date();
  const transactions: {
    type: string;
    amount: number;
    categoryId: string;
    accountId: string;
    note: string | null;
    monthsAgo: number;
    day: number;
  }[] = [];

  for (let m = 5; m >= 0; m--) {
    const month = m;
    // เงินเดือนเข้าต้นเดือน
    transactions.push({
      type: "income",
      amount: 35000 + (5 - m) * 500,
      categoryId: catByName("เงินเดือน").id,
      accountId: bank.id,
      note: "เงินเดือนประจำเดือน",
      monthsAgo: month,
      day: 2,
    });
    // รายได้เสริมบางเดือน
    if (m % 2 === 0) {
      transactions.push({
        type: "income",
        amount: 3000 + m * 200,
        categoryId: catByName("รายได้เสริม").id,
        accountId: cash.id,
        note: "งานฟรีแลนซ์",
        monthsAgo: month,
        day: 15,
      });
    }
    // รายจ่ายหมุนเวียน
    const expenses = [
      { cat: "อาหาร", amt: 4500 + m * 100, note: "ข้าวกับของกินทั่วไป" },
      { cat: "เดินทาง", amt: 1800 + m * 50, note: "ค่าน้ำมัน/ BTS" },
      { cat: "ช้อปปิ้ง", amt: 2200 + m * 80, note: "ของใช้ในบ้าน" },
      { cat: "ที่อยู่อาศัย", amt: 8000, note: "ค่าเช่าห้อง" },
      { cat: "บิลค่าใช้จ่าย", amt: 1500 + m * 30, note: "ไฟ/น้ำ/เน็ต" },
      { cat: "สุขภาพ", amt: 600, note: "อาหารเสริม" },
      { cat: "ความบันทิง", amt: 1200 + m * 40, note: "หนัง/สตรีมมิ่ง" },
    ];
    for (const e of expenses) {
      transactions.push({
        type: "expense",
        amount: e.amt,
        categoryId: catByName(e.cat).id,
        accountId: Math.random() > 0.5 ? cash.id : bank.id,
        note: e.note,
        monthsAgo: month,
        day: 5 + Math.floor(Math.random() * 20),
      });
    }
  }

  // สร้าง transactions ทั้งหมด
  for (const t of transactions) {
    const date = new Date(now.getFullYear(), now.getMonth() - t.monthsAgo, t.day);
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: t.type,
        amount: t.amount,
        categoryId: t.categoryId,
        accountId: t.accountId,
        note: t.note,
        date,
      },
    });
  }
  console.log(`✅ สร้างธุรกรรมตัวอย่าง ${transactions.length} รายการ`);
  console.log("🎉 seed เสร็จสิ้น!");
  console.log("📧 ล็อกอินด้วย: demo@example.com  |  🔑 รหัสผ่าน: demo1234");
}

main()
  .catch((e) => {
    console.error("❌ seed ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
