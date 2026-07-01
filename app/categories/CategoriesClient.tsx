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
  const [formColor, setFormColor] = useState("#6b8e7f");
  const [formIcon, setFormIcon] = useState("💰");

  // ไอคอน + สี ในโทน earth/sage (low saturation เพื่อความสบายตา)
  const icons = ["💰", "🍔", "🚗", "🛍️", "🏠", "🧾", "💊", "🎬", "📚", "💼", "💵", "🎁", "📦", "➕", "✈️", "🎮", "🐶", "👕", "🔌", "☕"];
  const colors = ["#c97b6b", "#c4a25f", "#a8a06b", "#7ba780", "#6b8e7f", "#5f8d8a", "#6f8caf", "#8a7caf", "#a87caf", "#af7c9b", "#9b7c6b", "#8a857c"];

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
      <div className="flex items-center gap-3 card p-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: cat.color + "25" }}
        >
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">{cat.name}</p>
          <p className="text-xs text-ink-400">
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
          <h1 className="text-2xl font-bold text-ink-900">หมวดหมู่</h1>
          <p className="text-ink-500 text-sm">จัดการหมวดหมู่รายรับและรายจ่าย</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary px-5 py-2 text-sm"
        >
          {showForm ? "✕ ปิด" : "+ เพิ่มหมวด"}
        </button>
      </div>

      {/* ฟอร์มเพิ่มหมวด */}
      {showForm && (
        <div className="card p-5">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input"
                  placeholder="เช่น ขนม, กาแฟ"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">ประเภท</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="input"
                >
                  <option value="expense">รายจ่าย</option>
                  <option value="income">รายรับ</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">ไอคอน</label>
              <div className="flex flex-wrap gap-2">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormIcon(icon)}
                    className={`w-10 h-10 rounded-full text-lg flex items-center justify-center border-2 transition-colors ${
                      formIcon === icon ? "border-sage-500 bg-sage-50" : "border-cream-300 hover:border-sage-300"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">สี (โทน earth/sage)</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      formColor === color ? "border-ink-700 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <button type="submit" className="btn-primary px-6 py-2 text-sm">
              ➕ สร้างหมวดหมู่
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-ink-400 text-center py-8">กำลังโหลด...</p>
      ) : (
        <>
          {/* หมวดรายจ่าย */}
          <div>
            <h2 className="text-lg font-semibold text-expense-600 mb-3">📉 หมวดรายจ่าย ({expenseCategories.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {expenseCategories.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} />
              ))}
            </div>
          </div>

          {/* หมวดรายรับ */}
          <div>
            <h2 className="text-lg font-semibold text-income-600 mb-3">📈 หมวดรายรับ ({incomeCategories.length})</h2>
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
