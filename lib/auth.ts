import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";
const COOKIE_NAME = "token";

export interface JWTPayload {
  userId: string;
  email: string;
}

// เข้ารหัสรหัสผ่าน
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ตรวจสอบรหัสผ่าน
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// สร้าง JWT token
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// ยืนยัน JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ตั้งค่า cookie (เรียกใน Server Action หรือ Route Handler)
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 วัน
    path: "/",
  });
}

// ลบ cookie (logout)
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ดึงผู้ใช้ปัจจุบันจาก cookie (สำหรับ Server Components / Route Handlers)
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, currency: true },
  });
  return user;
}

// ดึง userId ปัจจุบัน (ใช้ใน API เพื่อตรวจสอบสิทธิ์)
export async function requireAuth(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user.id;
}
