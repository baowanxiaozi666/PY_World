import { GoogleGenAI, Content } from "@google/genai";
import { SYSTEM_INSTRUCTION_MASCOT } from "../constants";

// 在浏览器环境下没有 Node 的 process 对象，这里做兼容处理：
// - 推荐：在 .env 文件中配置 VITE_GEMINI_API_KEY=你的key
// - 如果找不到 key，就走本地“假回复”，但不会让整个页面崩溃
const apiKey =
  // Vite 环境变量（推荐）
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  // 兼容未来在 Node 环境下复用同一服务
  (typeof process !== "undefined" ? (process as any).env?.API_KEY : undefined);

// 只有拿到 key 时才初始化客户端
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateMascotResponse = async (
  userMessage: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  // 没有配置 API Key 时前端优雅降级，避免抛错阻塞 React 渲染
  if (!ai) {
    console.warn(
      "[MascotChat] 没有找到 Gemini API Key（VITE_GEMINI_API_KEY / process.env.API_KEY），使用本地模拟回复。"
    );
    return "Ehehe~ 我现在是离线模式，没有接上真正的 AI 服务，但还是可以陪你聊聊喔！(⁄⁄•⁄ω⁄•⁄⁄)✨";
  }

  try {
    // 使用完整历史作为上下文
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history as Content[],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_MASCOT,
        temperature: 1.3, // 高温度让角色更“元气”
      },
    });

    return response.text || "Sakura-chan is daydreaming... (Empty response) 🌸";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "My connection to the digital world is a bit glitchy right now! (Network Error) 😖";
  }
};