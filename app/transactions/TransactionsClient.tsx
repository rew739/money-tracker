"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  note: string | null;
  categoryId: string | null;
  accountId: string;
  category: Category | null;
  account: Account | null;
}

interface Props {
  categories: Category[];
  accounts: Account[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

export default function TransactionsClient({ categories: initialCategories, accounts: initialAccounts }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ดึงข้อมูลรายการ
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterMonth) params.set("month", filterMonth);
      const res = await fetch(`/api/transactions?${params}`);
      if (res.ok) setTransactions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filterType, filterMonth]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // เพิ่ม/แก้ไขรายการ
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      type: data.get("type"),
      amount: data.get("amount"),
      date: data.get("date"),
      categoryId: data.get("categoryId") || null,
      accountId: data.get("accountId"),
      note: data.get("note") || null,
    };

    try {
      if (editing) {
        await fetch(`/api/transactions/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      form.reset();
      setEditing(null);
      fetchTransactions();
    } catch (err) {
      alert("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    }
  }

  // ลบรายการ
  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบรายการนี้?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchTransactions();
  }

  // เริ่มแก้ไข
  function startEdit(t: Transaction) {
    setEditing(t);
    const form = formRef.current;
    if (form) {
      (form.elements.namedItem("type") as HTMLSelectElement).value = t.type;
      (form.elements.namedItem("amount") as HTMLInputElement).value = String(t.amount);
      (form.elements.namedItem("date") as HTMLInputElement).value = new Date(t.date).toISOString().split("T")[0];
      (form.elements.namedItem("categoryId") as HTMLSelectElement).value = t.categoryId || "";
      (form.elements.namedItem("accountId") as HTMLSelectElement).value = t.accountId;
      (form.elements.namedItem("note") as HTMLInputElement).value = t.note || "";
    }
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // ยกเลิกแก้ไข
  function cancelEdit() {
    setEditing(null);
    formRef.current?.reset();
  }

  const filteredCategories = initialCategories.filter(
    (c) => !formRef.current || (formRef.current.querySelector("[name=type]") as HTMLSelectElement)?.value !== "expense" ? true : c.type === "expense"
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">รายการรายรับ-รายจ่าย</h1>

      {/* ฟอร์มเพิ่ม/แก้ไข */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">
          {editing ? "✏️ แก้ไขรายการ" : "➕ เพิ่มรายการใหม่"}
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ประเภท */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">ประเภท</label>
            <select name="type" className="input" required>
              <option value="expense">รายจ่าย</option>
              <option value="income">รายรับ</option>
            </select>
          </div>
          {/* จำนวนเงิน */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">จำนวนเงิน (฿)</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              className="input"
              placeholder="0.00"
              required
            />
          </div>
          {/* วันที่ */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">วันที่</label>
            <input
              type="date"
              name="date"
              defaultValue={today}
              max={today}
              className="input"
              required
            />
          </div>
          {/* หมวดหมู่ */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">หมวดหมู่</label>
            <select name="categoryId" className="input">
              <option value="">-- เลือกหมวดหมู่ --</option>
              {initialCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          {/* บัญชี */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">บัญชี/กระเป๋า</label>
            <select name="accountId" className="input" required>
              {initialAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type === "cash" ? "💵" : a.type === "bank" ? "🏦" : a.type === "credit" ? "💳" : "📱"} {a.name}
                </option>
              ))}
            </select>
          </div>
          {/* หมายเหตุ */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">หมายเหตุ (optional)</label>
            <input
              type="text"
              name="note"
              className="input"
              placeholder="รายละเอียด..."
            />
          </div>
          {/* ปุ่ม */}
          <div className="flex gap-2 items-end">
            <button type="submit" className="btn-primary flex-1 px-4 py-2 text-sm">
              {editing ? "💾 บันทึกการแก้ไข" : "➕ เพิ่มรายการ"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="btn-ghost px-4 py-2 text-sm"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ตัวกรอง */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input !w-auto !rounded-full text-sm py-1.5"
        >
          <option value="all">ทั้งหมด</option>
          <option value="income">รายรับ</option>
          <option value="expense">รายจ่าย</option>
        </select>
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="input !w-auto !rounded-full text-sm py-1.5"
        />
        {(filterType !== "all" || filterMonth) && (
          <button
            onClick={() => { setFilterType("all"); setFilterMonth(""); }}
            className="text-sm text-sage-700 hover:underline"
          >
            ล้างตัวกรอง
          </button>
        )}
        <span className="text-sm text-ink-500">
          {transactions.length} รายการ
        </span>
      </div>

      {/* รายการธุรกรรม */}
      <div className="card divide-y divide-sage-50 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-ink-400">กำลังโหลด...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2 opacity-60">🍃</div>
            <p className="text-ink-400">ไม่มีรายการ</p>
          </div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-4 hover:bg-sage-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center text-lg flex-shrink-0">
                  {t.category?.icon || (t.type === "income" ? "💰" : "💸")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{t.note || t.category?.name || t.type}</p>
                  <p className="text-xs text-ink-400">
                    {t.category?.name} • {t.account?.name} •{" "}
                    {new Date(t.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <span className={`text-sm font-semibold ${t.type === "income" ? "text-income-600" : "text-expense-600"}`}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(t)}
                    className="p-1.5 text-ink-400 hover:text-sage-700 hover:bg-sage-50 rounded-lg transition-colors"
                    title="แก้ไข"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-ink-400 hover:text-expense-600 hover:bg-expense-50 rounded-lg transition-colors"
                    title="ลบ"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
