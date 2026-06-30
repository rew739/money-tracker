"use client";

import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string | Date;
  note: string | null;
  category: { name: string; icon: string; color: string } | null;
  account: { name: string } | null;
}

interface Props {
  userName: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  monthLabel: string;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

export default function DashboardClient({
  transactions,
  totalIncome,
  totalExpense,
  balance,
  monthLabel,
}: Props) {
  // กราฟวงกลมย่อ: รายจ่ายตามหมวดหมู่
  const expenseByCat = new Map<string, { name: string; amount: number; color: string }>();
  for (const t of transactions.filter((t) => t.type === "expense" && t.category)) {
    const cat = t.category!;
    if (!expenseByCat.has(cat.name)) {
      expenseByCat.set(cat.name, { name: cat.name, amount: 0, color: cat.color });
    }
    expenseByCat.get(cat.name)!.amount += t.amount;
  }
  const pieData = Array.from(expenseByCat.values()).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* หัวข้อ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 แดชบอร์ด</h1>
          <p className="text-gray-500">สรุป {monthLabel}</p>
        </div>
        <Link
          href="/transactions"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + เพิ่มรายการ
        </Link>
      </div>

      {/* บัตรสรุป 3 ใบ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* รายรับ */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg">📈</div>
            <span className="text-sm text-gray-500">รายรับรวม</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        {/* รายจ่าย */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-lg">📉</div>
            <span className="text-sm text-gray-500">รายจ่ายรวม</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>
        {/* คงเหลือ */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${balance >= 0 ? "bg-indigo-100" : "bg-orange-100"}`}>
              💰
            </div>
            <span className="text-sm text-gray-500">คงเหลือ</span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-indigo-600" : "text-orange-600"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* กราฟย่อ + รายการล่าสุด */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* กราฟวงกลมย่อ */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">🍩 รายจ่ายตามหมวดหมู่</h2>
          {pieData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="amount"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* สัญลักษณ์ */}
              <div className="flex flex-wrap gap-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">ยังไม่มีรายจ่ายในเดือนนี้</p>
          )}
        </div>

        {/* รายการล่าสุด */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">📋 รายการล่าสุด</h2>
            <Link href="/transactions" className="text-sm text-indigo-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          {transactions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{t.category?.icon || (t.type === "income" ? "💰" : "💸")}</span>
                    <div>
                      <p className="text-sm font-medium">{t.note || t.category?.name || t.type}</p>
                      <p className="text-xs text-gray-400">
                        {t.category?.name} • {t.account?.name} •{" "}
                        {new Date(t.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">ยังไม่มีรายการในเดือนนี้</p>
          )}
        </div>
      </div>
    </div>
  );
}
