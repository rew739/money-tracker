"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis,
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

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

// Custom tooltip สวยๆ
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-gray-600">{item.name}:</span>
          <span className="font-semibold">{formatCurrency(item.value)}</span>
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
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-gray-500">กำลังโหลดข้อมูลรายงาน...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">📈 รายงานการเงิน</h1>
          <p className="text-gray-500">วิเคราะห์รายรับ-รายจ่ายของคุณ</p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* บัตรสรุป 4 ใบ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
          <div className="text-sm text-green-600 font-medium mb-1">📈 รายรับรวม</div>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalIncome)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-5 border border-red-200">
          <div className="text-sm text-red-600 font-medium mb-1">📉 รายจ่ายรวม</div>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalExpense)}</p>
        </div>
        <div className={`bg-gradient-to-br ${summary.balance >= 0 ? "from-indigo-50 to-indigo-100 border-indigo-200" : "from-orange-50 to-orange-100 border-orange-200"} rounded-2xl p-5 border`}>
          <div className={`text-sm font-medium mb-1 ${summary.balance >= 0 ? "text-indigo-600" : "text-orange-600"}`}>💰 คงเหลือ</div>
          <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-indigo-700" : "text-orange-700"}`}>{formatCurrency(summary.balance)}</p>
        </div>
        <div className={`bg-gradient-to-br ${summary.savingsRate >= 0 ? "from-purple-50 to-purple-100 border-purple-200" : "from-rose-50 to-rose-100 border-rose-200"} rounded-2xl p-5 border`}>
          <div className={`text-sm font-medium mb-1 ${summary.savingsRate >= 0 ? "text-purple-600" : "text-rose-600"}`}>🏦 อัตราการออม</div>
          <p className={`text-2xl font-bold ${summary.savingsRate >= 0 ? "text-purple-700" : "text-rose-700"}`}>
            {summary.savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* แถวที่ 1: กราฟวงกลมรายจ่าย + กราฟแท่งเปรียบเทียบรายเดือน */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* กราฟวงกลม — รายจ่ายตามหมวดหมู่ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-1">🍩 รายจ่ายตามหมวดหมู่</h2>
          <p className="text-sm text-gray-400 mb-4">สัดส่วนรายจ่ายแต่ละหมวดในเดือนนี้</p>
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
                          <span className="font-medium text-gray-700 truncate">{cat.name}</span>
                          <span className="text-gray-500 ml-2">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(cat.amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">ไม่มีรายจ่ายในเดือนนี้</p>
          )}
        </div>

        {/* กราฟแท่ง — เปรียบเทียบรายเดือน */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-1">📊 เปรียบเทียบ 6 เดือนล่าสุด</h2>
          <p className="text-sm text-gray-400 mb-4">รายรับ vs รายจ่ายแต่ละเดือน</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="income" name="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* ตารางย่อย */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left py-2 font-medium">เดือน</th>
                  <th className="text-right py-2 font-medium">รายรับ</th>
                  <th className="text-right py-2 font-medium">รายจ่าย</th>
                  <th className="text-right py-2 font-medium">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {monthlyComparison.map((m) => (
                  <tr key={m.month} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{m.month}</td>
                    <td className="py-2 text-right text-green-600">{formatCurrency(m.income)}</td>
                    <td className="py-2 text-right text-red-600">{formatCurrency(m.expense)}</td>
                    <td className={`py-2 text-right font-medium ${m.balance >= 0 ? "text-indigo-600" : "text-orange-600"}`}>
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
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-1">📈 แนวโน้ม 30 วันล่าสุด</h2>
          <p className="text-sm text-gray-400 mb-4">รายรับและรายจ่ายแต่ละวัน</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Area type="monotone" dataKey="income" name="รายรับ" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="รายจ่าย" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* กราฟวงกลม — แหล่งรายรับ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-1">💰 แหล่งรายรับ</h2>
          <p className="text-sm text-gray-400 mb-4">สัดส่วนรายรับแต่ละหมวด</p>
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
                        <span className="text-gray-700">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-gray-900">{formatCurrency(cat.amount)}</span>
                        <span className="text-gray-400 ml-1">({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">ไม่มีรายรับในเดือนนี้</p>
          )}
        </div>
      </div>
    </div>
  );
}
