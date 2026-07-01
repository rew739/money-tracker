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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">แดชบอร์ด</h1>
          <p className="text-ink-500 text-sm">สรุป {monthLabel}</p>
        </div>
        <Link href="/transactions" className="btn-primary inline-flex items-center px-5 py-2.5 text-sm">
          + เพิ่มรายการ
        </Link>
      </div>

      {/* บัตรสรุป 3 ใบ — pastel sage/earth + icon วงกลม */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* รายรับ */}
        <div className="card p-5 bg-gradient-to-br from-income-50 to-sage-50 border-income-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
              📈
            </div>
            <span className="text-sm text-ink-500">รายรับรวม</span>
          </div>
          <p className="text-2xl font-bold text-income-700">{formatCurrency(totalIncome)}</p>
        </div>
        {/* รายจ่าย */}
        <div className="card p-5 bg-gradient-to-br from-expense-50 to-cream-100 border-expense-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
              📉
            </div>
            <span className="text-sm text-ink-500">รายจ่ายรวม</span>
          </div>
          <p className="text-2xl font-bold text-expense-600">{formatCurrency(totalExpense)}</p>
        </div>
        {/* คงเหลือ */}
        <div className="card p-5 bg-gradient-to-br from-sage-50 to-cream-50 border-sage-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
              💰
            </div>
            <span className="text-sm text-ink-500">คงเหลือ</span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-sage-700" : "text-expense-600"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* กราฟย่อ + รายการล่าสุด */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* กราฟวงกลมย่อ */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="text-lg font-semibold text-ink-900 mb-4">รายจ่ายตามหมวดหมู่</h2>
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
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                      contentStyle={{
                        borderRadius: "1rem",
                        border: "1px solid #e6ede2",
                        background: "#ffffff",
                        boxShadow: "0 4px 16px rgba(79,111,94,0.08)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* สัญลักษณ์ */}
              <div className="flex flex-wrap gap-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                    <span className="text-ink-500">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-3xl mb-2 opacity-60">🍃</div>
              <p className="text-ink-400 text-sm">ยังไม่มีรายจ่ายในเดือนนี้</p>
            </div>
          )}
        </div>

        {/* รายการล่าสุด */}
        <div className="lg:col-span-3 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink-900">รายการล่าสุด</h2>
            <Link href="/transactions" className="text-sm text-sage-700 hover:underline">ดูทั้งหมด →</Link>
          </div>
          {transactions.length > 0 ? (
            <div className="divide-y divide-sage-50">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center text-lg flex-shrink-0">
                      {t.category?.icon || (t.type === "income" ? "💰" : "💸")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{t.note || t.category?.name || t.type}</p>
                      <p className="text-xs text-ink-400 truncate">
                        {t.category?.name} • {t.account?.name} •{" "}
                        {new Date(t.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ml-2 ${t.type === "income" ? "text-income-600" : "text-expense-600"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-3xl mb-2 opacity-60">🍃</div>
              <p className="text-ink-400 text-sm">ยังไม่มีรายการในเดือนนี้</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
