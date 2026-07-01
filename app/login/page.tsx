"use client";

import { useActionState } from "react";
import { loginAction, AuthState } from "@/app/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(loginAction, undefined);

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

        {/* Card */}
        <div className="card p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink-900">เข้าสู่ระบบ</h2>
            <p className="text-ink-500 text-sm mt-1">บันทึกรายรับ-รายจ่ายของคุณ</p>
          </div>

          {/* Demo hint */}
          <div className="mb-6 flex items-start gap-2 bg-sage-50 border border-sage-100 rounded-2xl p-3 text-sm text-sage-700">
            <span>🎯</span>
            <span>
              <strong>ทดลองใช้:</strong> demo@example.com / demo1234
            </span>
          </div>

          {/* Error */}
          {state?.error && (
            <div className="mb-4 bg-expense-50 border border-expense-100 text-expense-700 rounded-2xl px-4 py-3 text-sm">
              {state.error}
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="space-y-4">
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
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-ink-500 mt-6">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="text-sage-700 font-medium hover:underline">
              สมัครใหม่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
