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
      <h1 className="text-2xl font-bold text-gray-900">⚙️ ตั้งค่า</h1>

      {/* ข้อมูลผู้ใช้ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">👤 ข้อมูลส่วนตัว</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24">ชื่อ:</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24">อีเมล:</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24">สกุลเงิน:</span>
            <span className="font-medium">{user.currency}</span>
          </div>
        </div>
      </div>

      {/* บัญชี/กระเป๋าเงิน */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">👛 บัญชี / กระเป๋าเงิน</h2>
        <div className="space-y-3 mb-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {acc.type === "cash" ? "💵" : acc.type === "bank" ? "🏦" : acc.type === "credit" ? "💳" : "📱"}
                </span>
                <div>
                  <p className="text-sm font-medium">{acc.name}</p>
                  <p className="text-xs text-gray-400">
                    {acc.type === "cash" ? "เงินสด" : acc.type === "bank" ? "ธนาคาร" : acc.type === "credit" ? "บัตรเครดิต" : "e-Wallet"}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-indigo-600">
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
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
          <select
            value={newAccountType}
            onChange={(e) => setNewAccountType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + เพิ่ม
          </button>
        </form>
      </div>

      {/* ออกจากระบบ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
        <h2 className="text-lg font-semibold text-red-600 mb-3">🚪 ออกจากระบบ</h2>
        <p className="text-sm text-gray-500 mb-4">การออกจากระบบจะล้าง session ปัจจุบัน</p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
