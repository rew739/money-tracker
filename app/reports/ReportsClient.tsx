"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from "recharts";

interface CategoryData {
  name: string;
  amount: number;
  color: string;
  icon: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface DailyData {
  date: string;
  income: number;
  expense: number;
}

interface ReportData {
  summary: { totalIncome: number; totalExpense: number; balance: number; savingsRate: number };
  expenseByCategory: CategoryData[];
  incomeByCategory: CategoryData[];
  monthlyComparison: MonthlyData[];
  dailyTrend: DailyData[];
  selectedMonth: string;
}

// โทนสี Sage Twilight — low saturation เพื่อความสบายตา
const COLOR = {
  income: "#7ba780",
  expense: "#c97b6b",
  balance: "#6b8e7f",
  grid: "#eef2ea",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

// Custom tooltip สไตล์ Sage Twilight (มุมมน นุ่ม)
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-sage-100 p-3 text-sm">
      <p className="font-medium text-ink-700 mb-1">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-ink-500">{item.name}:</span>
          <span className="font-semibold text-ink-900">{formatCurrency(item.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function ReportsClient() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");

  // คำนวณเดือนปัจจุบัน YYYY-MM
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const fetchReport = useCallback(async (month?: string) => {
    setLoading(true);
    try {
      const params = month ? `?month=${month}` : "";
      const res = await fetch(`/api/reports${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!month) setSelectedMonth(json.selectedMonth);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedMonth || currentMonth);
  }, [selectedMonth, currentMonth, fetchReport]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse opacity-70">🌿</div>
          <p className="text-ink-500">กำลังโหลดข้อมูลรายงาน...</p>
        </div>
      </div>
    );
  }

  const { summary, expenseByCategory, incomeByCategory, monthlyComparison, dailyTrend } = data;

  return (
    <div className="space-y-6">
      {/* หัวข้อ + เลือกเดือน */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">รายงานการเงิน</h1>
          <p className="text-ink-500 text-sm">วิเคราะห์รายรับ-รายจ่ายของคุณ</p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="input !w-auto !rounded-full text-sm py-1.5"
        />
      </div>

      {/* บัตรสรุป 4 ใบ — pastel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-gradient-to-br from-income-50 to-sage-50 border-income-100">
          <div className="text-sm text-income-700 font-medium mb-1">📈 รายรับรวม</div>
          <p className="text-2xl font-bold text-income-700">{formatCurrency(summary.totalIncome)}</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-expense-50 to-cream-100 border-expense-100">
          <div className="text-sm text-expense-700 font-medium mb-1">📉 รายจ่ายรวม</div>
          <p className="text-2xl font-bold text-expense-600">{formatCurrency(summary.totalExpense)}</p>
        </div>
        <div className={`card p-5 bg-gradient-to-br ${summary.balance >= 0 ? "from-sage-50 to-cream-50 border-sage-200" : "from-expense-50 to-cream-100 border-expense-100"}`}>
          <div className={`text-sm font-medium mb-1 ${summary.balance >= 0 ? "text-sage-700" : "text-expense-600"}`}>💰 คงเหลือ</div>
          <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-sage-700" : "text-expense-600"}`}>{formatCurrency(summary.balance)}</p>
        </div>
        <div className={`card p-5 bg-gradient-to-br ${summary.savingsRate >= 0 ? "from-cream-100 to-sage-50 border-sage-200" : "from-expense-50 to-cream-50 border-expense-100"}`}>
          <div className={`text-sm font-medium mb-1 ${summary.savingsRate >= 0 ? "text-sage-700" : "text-expense-600"}`}>🏦 อัตราการออม</div>
          <p className={`text-2xl font-bold ${summary.savingsRate >= 0 ? "text-sage-700" : "text-expense-600"}`}>
            {summary.savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* แถวที่ 1: กราฟวงกลมรายจ่าย + กราฟแท่งเปรียบเทียบรายเดือน */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* กราฟวงกลม — รายจ่ายตามหมวดหมู่ */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink-900">รายจ่ายตามหมวดหมู่</h2>
          <p className="text-sm text-ink-400 mb-4">สัดส่วนรายจ่ายแต่ละหมวดในเดือนนี้</p>
          {expenseByCategory.length > 0 ? (
            <div className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="amount"
                      stroke="none"
                    >
                      {expenseByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* รายละเอียดหมวด */}
              <div className="space-y-2">
                {expenseByCategory.map((cat) => {
                  const pct = summary.totalExpense > 0 ? (cat.amount / summary.totalExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-lg w-8 text-center">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="font-medium text-ink-700 truncate">{cat.name}</span>
                          <span className="text-ink-400 ml-2">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-sage-50 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">{formatCurrency(cat.amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-3xl mb-2 opacity-60">🍃</div>
              <p className="text-ink-400 text-sm">ไม่มีรายจ่ายในเดือนนี้</p>
            </div>
          )}
        </div>

        {/* กราฟแท่ง — เปรียบเทียบรายเดือน */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink-900">เปรียบเทียบ 6 เดือนล่าสุด</h2>
          <p className="text-sm text-ink-400 mb-4">รายรับ vs รายจ่ายแต่ละเดือน</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8a857c" }} />
                <YAxis tick={{ fontSize: 12, fill: "#8a857c" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f6f1" }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="income" name="รายรับ" fill={COLOR.income} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="รายจ่าย" fill={COLOR.expense} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* ตารางย่อย */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-400 border-b border-sage-100">
                  <th className="text-left py-2 font-medium">เดือน</th>
                  <th className="text-right py-2 font-medium">รายรับ</th>
                  <th className="text-right py-2 font-medium">รายจ่าย</th>
                  <th className="text-right py-2 font-medium">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {monthlyComparison.map((m) => (
                  <tr key={m.month} className="border-b border-sage-50">
                    <td className="py-2 text-ink-700">{m.month}</td>
                    <td className="py-2 text-right text-income-600">{formatCurrency(m.income)}</td>
                    <td className="py-2 text-right text-expense-600">{formatCurrency(m.expense)}</td>
                    <td className={`py-2 text-right font-medium ${m.balance >= 0 ? "text-sage-700" : "text-expense-600"}`}>
                      {formatCurrency(m.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* แถวที่ 2: แนวโน้มรายวัน + กราฟวงกลมรายรับ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* กราฟเส้น — แนวโน้มรายวัน 30 วัน */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-semibold text-ink-900">แนวโน้ม 30 วันล่าสุด</h2>
          <p className="text-sm text-ink-400 mb-4">รายรับและรายจ่ายแต่ละวัน</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR.income} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLOR.income} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR.expense} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLOR.expense} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a857c" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: "#8a857c" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Area type="monotone" dataKey="income" name="รายรับ" stroke={COLOR.income} fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="รายจ่าย" stroke={COLOR.expense} fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* กราฟวงกลม — แหล่งรายรับ */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink-900">แหล่งรายรับ</h2>
          <p className="text-sm text-ink-400 mb-4">สัดส่วนรายรับแต่ละหมวด</p>
          {incomeByCategory.length > 0 ? (
            <div className="space-y-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeByCategory}
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="amount"
                      stroke="none"
                    >
                      {incomeByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {incomeByCategory.map((cat) => {
                  const pct = summary.totalIncome > 0 ? (cat.amount / summary.totalIncome) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="text-ink-700">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-ink-900">{formatCurrency(cat.amount)}</span>
                        <span className="text-ink-400 ml-1">({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-3xl mb-2 opacity-60">🍃</div>
              <p className="text-ink-400 text-sm">ไม่มีรายรับในเดือนนี้</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
