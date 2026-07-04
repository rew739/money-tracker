import type { ExtractedTx } from "./extractTransactions";

// ============================================================
// ช่วย map ผลจาก AI (มี categoryName/accountId เป็น string) ให้เป็น
// ข้อมูลที่พร้อมบันทึกลง Prisma โดยตรวจสอบความถูกต้อง
// ============================================================

interface CategoryRow {
  id: string;
  name: string;
  type: string;
}

interface AccountRow {
  id: string;
  name: string;
  type: string;
}

/** หา categoryId จากชื่อหมวดที่ AI เดา (ยืดหยุ่น: ตรงเป๊ะ หรือ includes) */
export function resolveCategoryId(
  categoryName: string | undefined,
  type: "income" | "expense",
  categories: CategoryRow[]
): string | null {
  if (!categoryName) return null;
  const sameType = categories.filter((c) => c.type === type);

  // 1) ตรงเป๊ะ (case-insensitive)
  let found = sameType.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  // 2) includes
  if (!found) {
    found = sameType.find(
      (c) =>
        c.name.includes(categoryName) || categoryName.includes(c.name)
    );
  }
  return found?.id || null;
}

/** ตรวจ accountId ว่าเป็นของผู้ใช้จริง ถ้าไม่ใช่คืนบัญชีแรก */
export function resolveAccountId(
  accountId: string | undefined,
  accounts: AccountRow[]
): string | null {
  if (accountId && accounts.some((a) => a.id === accountId)) {
    return accountId;
  }
  return accounts[0]?.id || null;
}

/** ข้อมูลที่ผ่านการ resolve แล้ว พร้อมสร้าง transaction */
export interface ResolvedTx {
  type: "income" | "expense";
  amount: number;
  categoryId: string | null;
  accountId: string;
  note: string | null;
  date: Date;
}

/** map ทั้งรายการ + ใส่วันที่เดียวกัน (วันที่ผู้ใช้ระบุ หรือวันนี้) */
export function resolveAll(
  txs: ExtractedTx[],
  categories: CategoryRow[],
  accounts: AccountRow[],
  date: Date
): { resolved: ResolvedTx[]; unresolvedCategory: boolean } {
  let unresolvedCategory = false;
  const resolved: ResolvedTx[] = [];

  for (const t of txs) {
    if (!t.amount || t.amount <= 0) continue;
    const accountId = resolveAccountId(t.accountId, accounts);
    if (!accountId) continue; // ไม่มีบัญชีเลย → ข้าม

    const categoryId = resolveCategoryId(t.categoryName, t.type, categories);
    if (t.categoryName && !categoryId) unresolvedCategory = true;

    resolved.push({
      type: t.type,
      amount: t.amount,
      categoryId,
      accountId,
      note: t.note || null,
      date,
    });
  }

  return { resolved, unresolvedCategory };
}
