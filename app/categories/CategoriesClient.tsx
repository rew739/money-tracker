"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export default function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("expense");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formIcon, setFormIcon] = useState("💰");

  const icons = ["💰", "🍔", "🚗", "🛍️", "🏠", "🧾", "💊", "🎬", "📚", "💼", "💵", "🎁", "📦", "➕", "✈️", "🎮", "🐶", "💊", "👕", "🔌"];
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#64748b"];

  async function fetchCategories() {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName, type: formType, color: formColor, icon: formIcon }),
    });
    setFormName("");
    setShowForm(false);
    fetchCategories();
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  function CategoryCard({ cat }: { cat: Category }) {
    return (
      <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: cat.color + "20" }}
        >
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{cat.name}</p>
          <p className="text-xs text-gray-400">
            {cat.type === "income" ? "รายรับ" : "รายจ่าย"} {cat.isDefault ? "• ค่าเริ่มต้น" : "• สร้างเอง"}
          </p>
        </div>
        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏷️ หมวดหมู่</h1>
          <p className="text-gray-500 text-sm">จัดการหมวดหมู่รายรับและรายจ่าย</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {showForm ? "✕ ปิด" : "+ เพิ่มหมวด"}
        </button>
      </div>

      {/* ฟอร์มเพิ่มหมวด */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="เช่น ขนม, กาแฟ"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="expense">รายจ่าย</option>
                  <option value="income">รายรับ</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ไอคอน</label>
              <div className="flex flex-wrap gap-2">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormIcon(icon)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border-2 transition-colors ${
                      formIcon === icon ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">สี</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      formColor === color ? "border-gray-900 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              ➕ สร้างหมวดหมู่
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-8">กำลังโหลด...</p>
      ) : (
        <>
          {/* หมวดรายจ่าย */}
          <div>
            <h2 className="text-lg font-semibold text-red-600 mb-3">📉 หมวดรายจ่าย ({expenseCategories.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {expenseCategories.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} />
              ))}
            </div>
          </div>

          {/* หมวดรายรับ */}
          <div>
            <h2 className="text-lg font-semibold text-green-600 mb-3">📈 หมวดรายรับ ({incomeCategories.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {incomeCategories.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
