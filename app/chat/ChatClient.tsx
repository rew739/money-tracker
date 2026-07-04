"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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

interface DraftItem {
  tempId: number;
  type: "income" | "expense";
  amount: number;
  categoryId: string | null;
  accountId: string;
  note: string | null;
  date: string;
}

// ข้อความในแชท — ฝั่งผู้ใช้หรือฝั่ง AI
interface Message {
  id: string;
  role: "user" | "assistant";
  text?: string; // ข้อความสรุป
  saved?: boolean; // บันทึกสำเร็จแล้ว?
  draft?: DraftItem[]; // รอผู้ใช้ยืนยัน
  question?: string; // คำถามถามกลับ
  savedCount?: number; // จำนวนรายการที่บันทึก
  savedTotal?: number; // ยอดรวมที่บันทึก
  error?: boolean;
}

interface Props {
  categories: Category[];
  accounts: Account[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

const SUGGESTIONS = [
  "ข้าว 90 น้ำ 20 รถ 40",
  "เงินเดือน 35000",
  "วันนี้ 90",
  "เช่าบ้าน 8000",
];

export default function ChatClient({ categories, accounts }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "สวัสดีครับ 🌿 พิมพ์รายรับ-รายจ่ายได้เลย เช่น 'ข้าว 90 น้ำ 20 รถ 40' แล้วผมบันทึกให้",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const defaultAccount = accounts[0]?.id || "";

  // ดึงสถานะโหมด mock ครั้งแรก
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setMockMode(Boolean(d.mockMode)))
      .catch(() => {});
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ส่งข้อความ
  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();

      if (data.mockMode) setMockMode(true);

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data.message,
        draft: data.needsConfirm ? data.draft : undefined,
        question: data.needsConfirm ? data.question : undefined,
        saved: data.saved,
        savedCount: data.saved ? data.transactions.length : undefined,
        savedTotal: data.saved
          ? data.transactions.reduce(
              (s: number, t: any) => s + t.amount,
              0
            )
          : undefined,
        error: !data.understood,
      };
      setMessages((m) => [...m, aiMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "เกิดข้อผิดพลาดในการเชื่อมต่อ ลองอีกครั้งได้ไหม? 🙏",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ยืนยัน draft
  async function confirmDraft(
    messageId: string,
    items: DraftItem[]
  ) {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();

      if (data.saved) {
        // อัปเดตข้อความ: แปลง draft → บันทึกสำเร็จ
        setMessages((m) =>
          m.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  draft: undefined,
                  question: undefined,
                  saved: true,
                  savedCount: data.transactions.length,
                  savedTotal: data.transactions.reduce(
                    (s: number, t: any) => s + t.amount,
                    0
                  ),
                  text: data.message,
                }
              : msg
          )
        );
      } else {
        alert(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  // ยกเลิก draft
  function cancelDraft(messageId: string) {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              draft: undefined,
              question: undefined,
              text: "ยกเลิกแล้ว ✕",
            }
          : msg
      )
    );
  }

  return (
    <div className="space-y-4">
      {/* หัวข้อ */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-sage-100 flex items-center justify-center text-xl">
          🤖
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink-900">แชทกับผู้ช่วยการเงิน</h1>
          <p className="text-ink-500 text-sm">
            พิมพ์ภาษาธรรมชาติ เราแยกหมวดและบันทึกให้
          </p>
        </div>
      </div>

      {/* Banner โหมดทดลอง */}
      {mockMode && (
        <div className="flex items-start gap-2 bg-gold-500/10 border border-gold-500/30 rounded-2xl p-3 text-sm text-ink-700">
          <span>🧪</span>
          <div>
            <strong>โหมดทดลอง:</strong> ยังไม่ได้เชื่อม GLM จริง (ใช้ระบบจำลอง)
            ใส่ <code className="bg-white px-1 rounded">GLM_API_KEY</code> ใน{" "}
            <code className="bg-white px-1 rounded">.env</code> เพื่อเปิดใช้งาน AI
            เต็มรูปแบบ ขอ key ฟรีที่ z.ai
          </div>
        </div>
      )}

      {/* กล่องแชท */}
      <div className="card p-4 sm:p-6 min-h-[400px] flex flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              categories={categories}
              accounts={accounts}
              defaultAccountId={defaultAccount}
              onConfirm={(items) => confirmDraft(msg.id, items)}
              onCancel={() => cancelDraft(msg.id)}
            />
          ))}

          {/* สถานะกำลังคิด */}
          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sm flex-shrink-0">
                🤖
              </div>
              <div className="bg-sage-50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* คำแนะนำด่วน */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-sage-100">
            <span className="text-xs text-ink-400 self-center">ลองพิมพ์:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="pill bg-sage-50 text-sage-700 hover:bg-sage-100 transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ช่องใส่ข้อความ */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 mt-4 pt-4 border-t border-sage-100"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์รายการ เช่น ข้าว 90 น้ำ 20 รถ 40"
            className="input flex-1"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
          >
            ส่ง
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ฟองข้อความ แยกผู้ใช้/AI + รองรับ draft ที่แก้ไขได้
// ============================================================
function MessageBubble({
  msg,
  categories,
  accounts,
  defaultAccountId,
  onConfirm,
  onCancel,
}: {
  msg: Message;
  categories: Category[];
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (items: DraftItem[]) => void;
  onCancel: () => void;
}) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-sage-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
          <p className="text-sm">{msg.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sm flex-shrink-0">
        🤖
      </div>
      <div className="max-w-[85%] space-y-3">
        {/* ข้อความสรุป */}
        {msg.text && (
          <div
            className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm ${
              msg.error
                ? "bg-expense-50 text-expense-700"
                : msg.saved
                ? "bg-income-50 text-income-700 border border-income-100"
                : "bg-sage-50 text-ink-900"
            }`}
          >
            <p>
              {msg.saved && "✅ "}
              {msg.text}
            </p>
            {msg.savedTotal !== undefined && msg.savedCount && (
              <p className="text-xs mt-1 opacity-80">
                {msg.savedCount} รายการ • รวม {formatCurrency(msg.savedTotal)}
              </p>
            )}
          </div>
        )}

        {/* ร่างที่รอยืนยัน */}
        {msg.draft && msg.draft.length > 0 && (
          <DraftEditor
            draft={msg.draft}
            categories={categories}
            accounts={accounts}
            defaultAccountId={defaultAccountId}
            question={msg.question}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ตัวแก้ไขร่าง — ผู้ใช้แก้ category/account ก่อนยืนยันได้
// ============================================================
function DraftEditor({
  draft,
  categories,
  accounts,
  defaultAccountId,
  question,
  onConfirm,
  onCancel,
}: {
  draft: DraftItem[];
  categories: Category[];
  accounts: Account[];
  defaultAccountId: string;
  question?: string;
  onConfirm: (items: DraftItem[]) => void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState<DraftItem[]>(() =>
    draft.map((d) => ({
      ...d,
      accountId: d.accountId || defaultAccountId,
    }))
  );

  function update(tempId: number, patch: Partial<DraftItem>) {
    setItems((arr) =>
      arr.map((it) => (it.tempId === tempId ? { ...it, ...patch } : it))
    );
  }

  function remove(tempId: number) {
    setItems((arr) => arr.filter((it) => it.tempId !== tempId));
  }

  const total = items.reduce((s, it) => s + it.amount, 0);

  return (
    <div className="bg-white border border-sage-200 rounded-2xl p-4 space-y-3 shadow-sm">
      {question && (
        <p className="text-sm text-ink-700 font-medium">❓ {question}</p>
      )}

      {/* รายการแต่ละรายการ */}
      <div className="space-y-2">
        {items.map((it) => {
          const sameTypeCats = categories.filter((c) => c.type === it.type);
          return (
            <div
              key={it.tempId}
              className="flex flex-wrap items-center gap-2 bg-sage-50/50 rounded-xl p-2"
            >
              <span className="text-xs font-medium text-ink-500 w-14">
                {it.type === "income" ? "รายรับ" : "รายจ่าย"}
              </span>
              <input
                type="number"
                value={it.amount}
                onChange={(e) =>
                  update(it.tempId, { amount: Number(e.target.value) })
                }
                className="input !w-24 !rounded-lg text-sm py-1"
                step="0.01"
                min="0.01"
              />
              <select
                value={it.categoryId || ""}
                onChange={(e) =>
                  update(it.tempId, {
                    categoryId: e.target.value || null,
                  })
                }
                className="input !w-auto !rounded-lg text-sm py-1 flex-1 min-w-[120px]"
              >
                <option value="">-- หมวดหมู่ --</option>
                {sameTypeCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
              <select
                value={it.accountId}
                onChange={(e) =>
                  update(it.tempId, { accountId: e.target.value })
                }
                className="input !w-auto !rounded-lg text-sm py-1"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(it.tempId)}
                className="p-1 text-ink-400 hover:text-expense-600 rounded-lg transition-colors"
                title="ลบรายการนี้"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* รวม + ปุ่ม */}
      {items.length > 0 ? (
        <div className="flex items-center justify-between pt-2 border-t border-sage-100">
          <span className="text-sm text-ink-500">
            รวม <strong className="text-ink-900">{formatCurrency(total)}</strong>{" "}
            • {items.length} รายการ
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost px-4 py-1.5 text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => onConfirm(items)}
              className="btn-primary px-5 py-1.5 text-sm"
            >
              ✓ ยืนยันบันทึก
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-400 text-center py-2">
          ลบครบแล้ว กดยกเลิกได้
        </p>
      )}
    </div>
  );
}
