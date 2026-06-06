import { initChatModel } from "langchain";
import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

// 1. المحرك الأساسي لتوليد الردود (الـ Agent)
export const llm = (async () => {
  const model = await initChatModel("gpt-4o-mini", {
    apiKey: process.env.OPENAI_API_KEY,
  });

  const originalInvoke = model.invoke.bind(model);
  model.invoke = async function (input: any, options: any) {
    try {
      return await originalInvoke(input, options);
    } catch (err: any) {
      console.error("⚠️ OpenAI LLM invocation failed, returning offline fallback marker:", err.message || err);
      return {
        content: "__OFFLINE_FALLBACK__",
        response_metadata: { tokenUsage: { totalTokens: 0 } },
        usage_metadata: { total_tokens: 0 },
      };
    }
  } as any;

  return model;
})();

// 2. المحرك الأساسي لتحويل النصوص لفيكتورز (الـ RAG)
const baseEmbeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY || "mock_key",
});

// Wrap the embeddings methods to prevent failure when key is invalid
const originalEmbedDocuments = baseEmbeddings.embedDocuments.bind(baseEmbeddings);
const originalEmbedQuery = baseEmbeddings.embedQuery.bind(baseEmbeddings);

baseEmbeddings.embedDocuments = async function (texts: string[]): Promise<number[][]> {
  try {
    return await originalEmbedDocuments(texts);
  } catch (err: any) {
    console.warn("⚠️ OpenAI EmbedDocuments failed, returning mock zero-vectors:", err.message || err);
    return texts.map(() => new Array(1536).fill(0));
  }
};

baseEmbeddings.embedQuery = async function (text: string): Promise<number[]> {
  try {
    return await originalEmbedQuery(text);
  } catch (err: any) {
    console.warn("⚠️ OpenAI EmbedQuery failed, returning mock zero-vector:", err.message || err);
    return new Array(1536).fill(0);
  }
};

export const embeddingsModel = baseEmbeddings;

export const OPENAI_STT_MODEL = "whisper-1";
// المحرك الأساسي لتحويل الصوت إلى نص (Deepgram)
export const DEEPGRAM_MODEL = "nova-3";