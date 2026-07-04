import { GLM_API_KEY, GLM_CHAT_URL, GLM_MODEL, IS_MOCK_MODE } from "./config";

// ============================================================
// ฟังก์ชันหัวใจ: รับข้อความภาษาธรรมชาติ → แยกเป็นรายการธุรกรรม
// ============================================================

export interface CategoryInfo {
  id: string;
  name: string;
  type: string; // income | expense
}

export interface AccountInfo {
  id: string;
  name: string;
  type: string; // cash | bank | credit | ewallet
}

/** รายการที่สกัดได้ (ยังไม่บันทึก) */
export interface ExtractedTx {
  type: "income" | "expense";
  amount: number;
  categoryName?: string; // ชื่อหมวดที่ AI เดา (อาจไม่ตรง id)
  categoryId?: string; // map เข้ากับหมวดของผู้ใช้แล้ว
  accountId?: string; // map เข้ากับบัญชีของผู้ใช้แล้ว
  note?: string;
}

/** ผลลัพธ์จากการสกัด */
export interface ExtractResult {
  transactions: ExtractedTx[];
  ambiguous: boolean; // มีรายการกำกวม ต้องถามยืนยัน
  followUpQuestion?: string; // คำถามถามกลับ (ถ้า ambiguous)
  message: string; // ข้อความสรุปสั้น ๆ สำหรับผู้ใช้
}

// ------------------------------------------------------------
// โหมดทดลอง (mock): ใช้ regex ภาษาไทยแบบง่าย เลียนแบบผล GLM
// เพื่อให้ทดสอบ UX ได้ทันทีก่อนมี API key
// ------------------------------------------------------------
const CATEGORY_KEYWORDS: Record<string, string> = {
  // คำ → ชื่อหมวดหมู่เริ่มต้น
  ข้าว: "อาหาร",
  ก๋วยเตี๋ยว: "อาหาร",
  อาหาร: "อาหาร",
  ขนม: "อาหาร",
  กาแฟ: "อาหาร",
  น้ำ: "อาหาร",
  น้ำมัน: "เดินทาง",
  รถ: "เดินทาง",
  bts: "เดินทาง",
  mrt: "เดินทาง",
  แท็กซี่: "เดินทาง",
  ช้อป: "ช้อปปิ้ง",
  เสื้อผ้า: "ช้อปปิ้ง",
  ของใช้: "ช้อปปิ้ง",
  เช่า: "ที่อยู่อาศัย",
  ค่าเช่า: "ที่อยู่อาศัย",
  ไฟ: "บิลค่าใช้จ่าย",
  บิล: "บิลค่าใช้จ่าย",
  อินเทอร์เน็ต: "บิลค่าใช้จ่าย",
  เน็ต: "บิลค่าใช้จ่าย",
  ยา: "สุขภาพ",
  หนัง: "ความบันเทิง",
  netflix: "ความบันเทิง",
  เงินเดือน: "เงินเดือน",
  ฟรีแลนซ์: "รายได้เสริม",
  ของขวัญ: "ของขวัญ",
};

function matchCategory(word: string, categories: CategoryInfo[]): string | undefined {
  const lower = word.toLowerCase();
  // 1) ตรงกับ keyword map → หาชื่อหมวดในรายการผู้ใช้
  for (const [kw, catName] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(kw)) {
      const found = categories.find(
        (c) => c.name === catName || c.name.includes(catName)
      );
      if (found) return found.name;
    }
  }
  // 2) ตรงกับชื่อหมวดของผู้ใช้โดยตรง
  const direct = categories.find(
    (c) => c.name.includes(word) || word.includes(c.name)
  );
  if (direct) return direct.name;
  return undefined;
}

function mockExtract(
  text: string,
  categories: CategoryInfo[],
  accounts: AccountInfo[]
): ExtractResult {
  const defaultAccount = accounts[0]?.id;
  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

  // แยกข้อความด้วย จุลภาค / "และ" / บรรทัด
  const chunks = text
    .split(/[,，、]|\sและ\s|\n+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const txs: ExtractedTx[] = [];
  let ambiguous = false;

  for (const chunk of chunks) {
    // จับรูปแบบ "<คำ> <จำนวน>" หรือ "<จำนวน> <คำ>"
    // รองรับเลขไทยและอารบิก + ทศนิยม
    const matchA = chunk.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/); // ข้าว 90
    const matchB = chunk.match(/^(\d+(?:\.\d+)?)\s+(.+)$/); // 90 ข้าว
    const m = matchA || matchB;
    if (!m) continue;

    const word = matchA ? m[1] : m[2];
    const amount = parseFloat(matchA ? m[2] : m[1]);

    // ตัดสินใจประเภท: ถ้าคำเกี่ยวกับรายรับ → income, อื่นๆ → expense
    const isIncome = /เงินเดือน|รายได้|เงินเข้า|ฟรีแลนซ์|ของขวัญ/i.test(
      word
    );
    const catList = isIncome ? incomeCats : expenseCats;
    const matchedCat = matchCategory(word, catList);
    const type: "income" | "expense" = isIncome ? "income" : "expense";

    if (!matchedCat) ambiguous = true; // ไม่เจอหมวด → ถือว่ากำกวม

    txs.push({
      type,
      amount,
      categoryName: matchedCat,
      note: word,
      accountId: defaultAccount,
    });
  }

  // กรณีพิเศษ: ผู้ใช้พิมพ์แค่ตัวเลข (เช่น "วันนี้ 90") → กำกวม ต้องถาม
  if (txs.length === 0) {
    const onlyNumber = text.match(/(\d+(?:\.\d+)?)/);
    if (onlyNumber) {
      return {
        transactions: [
          {
            type: "expense",
            amount: parseFloat(onlyNumber[1]),
            note: text.trim(),
            accountId: defaultAccount,
          },
        ],
        ambiguous: true,
        followUpQuestion: `บันทึก ${onlyNumber[1]} บาทใช่ไหม? เป็นค่าอาหารหรือเปล่า? 🤔`,
        message: "ไม่แน่ใจหมวดหมู่ ช่วยยืนยันหน่อย",
      };
    }
  }

  if (txs.length === 0) {
    return {
      transactions: [],
      ambiguous: false,
      message: "ยังไม่เข้าใจ ลองพิมพ์ เช่น 'ข้าว 90 น้ำ 20 รถ 40'",
    };
  }

  const total = txs.reduce((s, t) => s + t.amount, 0);
  return {
    transactions: txs,
    ambiguous,
    followUpQuestion: ambiguous
      ? "บางรายการไม่แน่ใจหมวดหมู่ ยืนยันได้ไหม?"
      : undefined,
    message: `เข้าใจแล้ว! ${txs.length} รายการ รวม ฿${total.toLocaleString("th-TH")}`,
  };
}

// ------------------------------------------------------------
// โหมดจริง: เรียก GLM พร้อม prompt ภาษาไทย สั่งให้คืน JSON ตาม schema
// ------------------------------------------------------------
function buildSystemPrompt(categories: CategoryInfo[], accounts: AccountInfo[]) {
  const catList = categories
    .map((c) => `  - ${c.name} (${c.type})`)
    .join("\n");
  const accList = accounts
    .map((a) => `  - ${a.name} (${a.type})`)
    .join("\n");

  return `คุณคือ "ผู้ช่วยการเงิน" ของผู้ใช้คนไทย หน้าที่คือรับข้อความภาษาธรรมชาติแล้วแยกเป็นรายการรายรับ-รายจ่าย เพื่อบันทึกเข้าระบบ

หมวดหมู่ที่ผู้ใช้มี:
${catList}

บัญชี/กระเป๋าเงินของผู้ใช้:
${accList}

กฎ:
1. ทุกยอดต้องเป็นตัวเลข (ไม่มีคำนำหน้าเช่น บาท/฿)
2. "type" เป็น "expense" (รายจ่าย) หรือ "income" (รายรับ) เท่านั้น
3. "categoryName" ต้องตรงหรือใกล้เคียงกับหมวดในรายการด้านบน ถ้าไม่แน่ใจให้เว้นว่างแล้วตั้ง ambiguous = true
4. "accountId" ให้ใช้ id ของบัญชีที่เหมาะสม ถ้าผู้ใช้ไม่ระบุให้เลือกบัญชีแรก
5. ถ้าข้อมูลกำกวด (เช่น พิมพ์แค่ "วันนี้ 90") ให้ ambiguous = true และตั้ง followUpQuestion เป็นคำถามภาษาไทยสั้น ๆ

ตอบกลับเป็น JSON เท่านั้น ตามรูปแบบนี้ ห้ามมีข้อความอื่นนอกจาก JSON:
{
  "transactions": [
    { "type": "expense", "amount": 90, "categoryName": "อาหาร", "note": "ข้าว", "accountId": "<id>" }
  ],
  "ambiguous": false,
  "followUpQuestion": null,
  "message": "สรุปสั้น ๆ เป็นภาษาไทย"
}

สำคัญมาก:
- ห้ามวิเคราะห์เกินความจำเป็น อ่านข้อมูล → แยก → ตอบ JSON ทันที
- ห้ามเขียนคำอธิบาย reasoning ใดๆ ในคำตอบ
- คำตอบต้องเริ่มต้นด้วย { และจบด้วย } เท่านั้น`;
}

function tryParseJson(text: string): any | null {
  // ลอง parse ตรง ๆ ก่อน
  try {
    return JSON.parse(text);
  } catch {
    // ถ้าพัง ลองหา block JSON ในข้อความ (GLM อาจห่อด้วย \`\`\`json)
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        /* ignore */
      }
    }
    // ลองหา { ... } ก้อนแรก
    const braces = text.match(/\{[\s\S]*\}/);
    if (braces) {
      try {
        return JSON.parse(braces[0]);
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

async function glmExtract(
  text: string,
  categories: CategoryInfo[],
  accounts: AccountInfo[]
): Promise<ExtractResult> {
  const systemPrompt = buildSystemPrompt(categories, accounts);

  const res = await fetch(GLM_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: GLM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2, // ต่ำ เพื่อความสม่ำเสมอของ JSON
      max_tokens: 4000, // reasoning model ใช้ tokens เยอะกว่าปกติ
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    
    // ถ้าเป็นปัญหาจากฝั่งไคลเอนต์ (400, 401, 403, 404) เช่น Model ไม่ถูกต้อง หรือ API Key ผิด
    // ให้พ่น error ออกไปให้ระบบรับรู้ แทนที่จะ fallback เงียบๆ
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      throw new Error(`GLM API Error ${res.status}: ${errText.slice(0, 150)}`);
    }

    // GLM เกิดข้อผิดพลาด (เช่น 429 rate limit / 503 overloaded)
    // → ทำงานต่อด้วย mock เพื่อให้ผู้ใช้ยังใช้งานได้ แทนที่จะ throw
    console.warn(
      `[GLM] API error ${res.status}, falling back to mock:`,
      errText.slice(0, 150)
    );
    return mockExtract(text, categories, accounts);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message || {};

  // GLM-4.7-flash เป็น reasoning model: คำตอบอยู่ใน "content"
  // บางครั้ง content ว่าง → ลอง reasoning_content (เผื่อใส่ JSON ไว้ในนั้น)
  let content: string =
    (message.content as string) || "";

  let parsed = tryParseJson(content);

  // fallback: ถ้า content ว่าง หรือ parse ไม่ได้ → ลอง reasoning_content
  if (!parsed || !Array.isArray(parsed.transactions)) {
    const reasoning = (message.reasoning_content as string) || "";
    parsed = tryParseJson(reasoning);
  }

  // fallback สุดท้าย: ถ้า GLM ตอบไม่ได้ → ใช้ mock regex แทน
  if (!parsed || !Array.isArray(parsed.transactions)) {
    console.warn("[GLM] Parse failed, falling back to mock extract");
    return mockExtract(text, categories, accounts);
  }

  // normalize ผลลัพธ์ — รองรับชื่อฟิลด์หลายแบบที่ GLM อาจใช้
  // (categoryName/category/categoryName_th, accountId/account, note/desc)
  const txs: ExtractedTx[] = parsed.transactions.map((t: any) => ({
    type: t.type === "income" ? "income" : "expense",
    amount: Number(t.amount) || 0,
    categoryName:
      t.categoryName || t.category || t.categoryName_th || undefined,
    accountId: t.accountId || t.account || accounts[0]?.id,
    note: t.note || t.desc || t.description || undefined,
  }));

  return {
    transactions: txs,
    ambiguous: Boolean(parsed.ambiguous),
    followUpQuestion: parsed.followUpQuestion || undefined,
    message:
      parsed.message ||
      `เข้าใจแล้ว! ${txs.length} รายการ`,
  };
}

// ------------------------------------------------------------
// entry point หลัก: เลือก mock หรือ GLM ตาม IS_MOCK_MODE
// ------------------------------------------------------------
export async function extractTransactions(
  text: string,
  categories: CategoryInfo[],
  accounts: AccountInfo[]
): Promise<ExtractResult> {
  if (IS_MOCK_MODE) {
    // จำลอง latency นิดหน่อย
    await new Promise((r) => setTimeout(r, 300));
    return mockExtract(text, categories, accounts);
  }
  return glmExtract(text, categories, accounts);
}
