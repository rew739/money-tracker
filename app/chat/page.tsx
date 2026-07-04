import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "../components/Navbar";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { prisma } = await import("@/lib/prisma");

  // ดึงหมวดหมู่ + บัญชีสำหรับ dropdown ในการยืนยัน draft
  const [categories, accounts] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ userId: user.id }, { userId: null, isDefault: true }] },
      select: { id: true, name: true, type: true, icon: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <>
      <Navbar userName={user.name} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ChatClient
          categories={categories.map((c) => ({
            ...c,
            icon: c.icon,
            color: c.color,
          }))}
          accounts={accounts}
        />
      </main>
    </>
  );
}
