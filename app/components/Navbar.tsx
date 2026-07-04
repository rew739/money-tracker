"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "แดชบอร์ด", icon: "📊" },
  { href: "/chat", label: "แชท", icon: "💬" },
  { href: "/transactions", label: "รายการ", icon: "💸" },
  { href: "/reports", label: "รายงาน", icon: "📈" },
  { href: "/categories", label: "หมวดหมู่", icon: "🏷️" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
];

export default function Navbar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logoutAction();
  }

  return (
    <nav className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-sage-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-sage-700">
            <span className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center text-base">
              🌿
            </span>
            <span>Money Tracker</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-sage-100 text-sage-700"
                    : "text-ink-500 hover:text-sage-700 hover:bg-sage-50"
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-50">
              <span className="w-7 h-7 rounded-full bg-sage-200 text-sage-700 flex items-center justify-center text-xs font-semibold">
                {userName.charAt(0)}
              </span>
              <span className="text-sm text-ink-700 max-w-[120px] truncate">
                {userName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-3.5 py-1.5 text-sm rounded-full bg-expense-50 text-expense-600 hover:bg-expense-100 transition-colors disabled:opacity-50"
            >
              {loading ? "กำลังออก..." : "ออกจากระบบ"}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden pb-3 flex flex-wrap gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                pathname === link.href
                  ? "bg-sage-100 text-sage-700"
                  : "text-ink-500 bg-white/50 hover:bg-sage-50"
              }`}
            >
              <span className="mr-1">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
