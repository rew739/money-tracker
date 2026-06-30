"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
} from "@/lib/auth";

// ตรวจสอบรูปแบบอีเมลแบบง่าย
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type AuthState = { error?: string } | undefined;

// ---------- สมัครสมาชิก ----------
export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!name || !email || !password) {
    return { error: "กรุณากรอกข้อมูลให้ครบ" };
  }
  if (!isValidEmail(email)) {
    return { error: "รูปแบบอีเมลไม่ถูกต้อง" };
  }
  if (password.length < 6) {
    return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "อีเมลนี้ถูกใช้งานแล้ว" };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  // สร้างกระเป๋าเงินเริ่มต้นให้ผู้ใช้ใหม่
  await prisma.account.create({
    data: { userId: user.id, name: "เงินสด", type: "cash", initialBalance: 0 },
  });

  const token = signToken({ userId: user.id, email: user.email });
  await setAuthCookie(token);
  redirect("/");
}

// ---------- เข้าสู่ระบบ ----------
export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  const token = signToken({ userId: user.id, email: user.email });
  await setAuthCookie(token);
  redirect("/");
}

// ---------- ออกจากระบบ ----------
export async function logoutAction() {
  await clearAuthCookie();
  redirect("/login");
}
