"use client";

import { useState, useEffect } from "react";
import { logoutAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
}

export default function SettingsClient({ user }: { user: User }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string; balance: number }[]>([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("cash");
  const [newAccountBalance, setNewAccountBalance] = useState("0");

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  }, []);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newAccountName,
        type: newAccountType,
        initialBalance: Number(newAccountBalance) || 0,
      }),
    });
    setNewAccountName("");
    setNewAccountBalance("0");
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  }

  async function handleLogout() {
    await logoutAction();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">ตั้งค่า</h1>

      {/* ข้อมูลผู้ใช้ */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">ข้อมูลส่วนตัว</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-500 w-24">ชื่อ:</span>
            <span className="font-medium text-ink-900">{user.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-500 w-24">อีเมล:</span>
            <span className="font-medium text-ink-900">{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-500 w-24">สกุลเงิน:</span>
            <span className="font-medium text-ink-900">{user.currency}</span>
          </div>
        </div>
      </div>

      {/* บัญชี/กระเป๋าเงิน */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">บัญชี / กระเป๋าเงิน</h2>
        <div className="space-y-3 mb-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between bg-sage-50 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
                  {acc.type === "cash" ? "💵" : acc.type === "bank" ? "🏦" : acc.type === "credit" ? "💳" : "📱"}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink-900">{acc.name}</p>
                  <p className="text-xs text-ink-400">
                    {acc.type === "cash" ? "เงินสด" : acc.type === "bank" ? "ธนาคาร" : acc.type === "credit" ? "บัตรเครดิต" : "e-Wallet"}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-sage-700">
                ฿{acc.balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>

        {/* เพิ่มบัญชีใหม่ */}
        <form onSubmit={handleAddAccount} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="ชื่อบัญชี"
            className="input text-sm"
            required
          />
          <select
            value={newAccountType}
            onChange={(e) => setNewAccountType(e.target.value)}
            className="input text-sm"
          >
            <option value="cash">💵 เงินสด</option>
            <option value="bank">🏦 ธนาคาร</option>
            <option value="credit">💳 บัตรเครดิต</option>
            <option value="ewallet">📱 e-Wallet</option>
          </select>
          <input
            type="number"
            value={newAccountBalance}
            onChange={(e) => setNewAccountBalance(e.target.value)}
            placeholder="ยอดเริ่มต้น"
            step="0.01"
            className="input text-sm"
          />
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            + เพิ่ม
          </button>
        </form>
      </div>

      {/* ออกจากระบบ — rose หม่น ไม่ใช่แดงจัด */}
      <div className="card p-6 border-expense-100">
        <h2 className="text-lg font-semibold text-expense-700 mb-3">🚪 ออกจากระบบ</h2>
        <p className="text-sm text-ink-500 mb-4">การออกจากระบบจะล้าง session ปัจจุบัน</p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-expense-500 text-white rounded-full text-sm font-medium hover:bg-expense-600 transition-colors"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
