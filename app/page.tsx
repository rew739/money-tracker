import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { thaiToday, thaiMonthRange } from "@/lib/dates";
import Navbar from "./components/Navbar";
import DashboardClient from "./dashboard/DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // ดึงข้อมูลสรุปเดือนปัจจุบันตามเวลาไทย (server อาจรันเป็น UTC)
  const today = thaiToday();
  const { start, end } = thaiMonthRange(today.year, today.month);

  const { prisma } = await import("@/lib/prisma");
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: start, lt: end } },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
    take: 10,
  });

  const allMonthTx = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: start, lt: end } },
  });

  const totalIncome = allMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = allMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <>
      <Navbar userName={user.name} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardClient
          userName={user.name}
          transactions={transactions}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
          monthLabel={new Date(Date.UTC(today.year, today.month - 1, 1)).toLocaleDateString(
            "th-TH",
            { month: "long", year: "numeric", timeZone: "UTC" }
          )}
        />
      </main>
    </>
  );
}
