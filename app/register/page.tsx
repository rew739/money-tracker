"use client";

import { useActionState } from "react";
import { registerAction, AuthState } from "@/app/actions/auth";
import Link from "next/link";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(registerAction, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 via-sage-50 to-cream-200 p-4">
      <div className="w-full max-w-md">
        {/* โลโก้ด้านบน */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-sage-100 items-center justify-center text-2xl mb-3">
            🌿
          </div>
          <h1 className="text-xl font-bold text-sage-700">Money Tracker</h1>
        </div>

        <div className="card p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink-900">สมัครสมาชิก</h2>
            <p className="text-ink-500 text-sm mt-1">เริ่มต้นบันทึกค่าใช้จ่ายของคุณ</p>
          </div>

          {state?.error && (
            <div className="mb-4 bg-expense-50 border border-expense-100 text-expense-700 rounded-2xl px-4 py-3 text-sm">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">ชื่อที่แสดง</label>
              <input
                type="text"
                name="name"
                className="input"
                placeholder="คุณชื่ออะไร"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">อีเมล</label>
              <input
                type="email"
                name="email"
                className="input"
                placeholder="example@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">รหัสผ่าน</label>
              <input
                type="password"
                name="password"
                className="input"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" className="text-sage-700 font-medium hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
