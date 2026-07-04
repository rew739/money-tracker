// ============================================================
// GLM (Z.ai / BigModel) configuration
// API เข้ากันได้กับ OpenAI REST จึงใช้ fetch ธรรมดา ไม่ต้องเพิ่ม dependency
// docs: https://docs.z.ai/guides/llm/glm-4.7
// ============================================================

// Base URL ของ GLM (OpenAI-compatible)
// - สากล: https://api.z.ai/api/paas/v4
// - จีน:  https://open.bigmodel.cn/api/paas/v4
export const GLM_BASE_URL =
  process.env.GLM_BASE_URL || "https://api.z.ai/api/paas/v4";

// ชื่อโมเดล (default: glm-4.7-flash — ฟรี เร็ว เหมาะกับงานนี้)
export const GLM_MODEL = process.env.GLM_MODEL || "glm-4.7-flash";

// API key — ถ้าไม่มี จะเข้าสู่ "โหมดทดลอง" (mock) เพื่อให้ทดสอบ UI ได้ก่อน
export const GLM_API_KEY = process.env.GLM_API_KEY || "";

// flag สะดวก: อยู่ในโหมดทดลองหรือไม่
export const IS_MOCK_MODE = !GLM_API_KEY;

// Endpoint เต็มสำหรับ chat completions
export const GLM_CHAT_URL = `${GLM_BASE_URL}/chat/completions`;
