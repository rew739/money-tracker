import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/app/components/Navbar";
import TransactionsClient from "./TransactionsClient";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // ดึงหมวดหมู่และบัญชีสำหรับ dropdown
  const { prisma } = await import("@/lib/prisma");
  const categories = await prisma.category.findMany({
    where: { OR: [{ isDefault: true }, { userId: user.id }] },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <Navbar userName={user.name} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TransactionsClient categories={categories} accounts={accounts} />
      </main>
    </>
  );
}
