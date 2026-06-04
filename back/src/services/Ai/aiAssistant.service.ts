import dotenv from "dotenv";
// 👈 استدعاءات متطابقة مع ستايل يوسف في rag.js بالظبط
import { HumanMessage, SystemMessage } from "langchain";
import {
  MemorySaver,
  StateGraph,
  MessagesAnnotation,
} from "@langchain/langgraph";

// استدعاء ملف الـ Prompts والمحرك الأساسي
import { AI_ASSISTANT_PROMPTS } from "../Ai/prompts.ai";
import { llm, OPENAI_STT_MODEL, DEEPGRAM_MODEL } from "./core.ai.service";
import { logTokenUsage } from "../token.service";

dotenv.config(); // زي ما يوسف عامل بالظبط

// 1. تهيئة الذاكرة
const memory = new MemorySaver();

// 2. بناء مسار المحادثة (الـ Graph)
export const getAssistantGraph = async () => {
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      const resolvedLlm = await llm;
      const response = await resolvedLlm.invoke(state.messages);
      return { messages: [response] };
    })
    .addEdge("__start__", "agent");

  return workflow.compile({ checkpointer: memory });
};

// ==========================================
// 🚀 الدوال الأساسية (Endpoints Logic)
// ==========================================

export const answerWithContext = async (userId: string | undefined, threadId: string, question: string) => {
  const graph = await getAssistantGraph();
  const config = { configurable: { thread_id: threadId } };

  const state = await graph.invoke(
    { messages: [new HumanMessage(question)] },
    config,
  );

  const lastMessage: any = state.messages[state.messages.length - 1];
  const tokens = lastMessage?.response_metadata?.tokenUsage?.totalTokens 
    || lastMessage?.usage_metadata?.total_tokens 
    || Math.ceil((lastMessage?.content?.length || 0) / 4);
    
  if (tokens > 0 && userId) {
    await logTokenUsage(userId, 'appChatbot', tokens);
  }

  return lastMessage.content;
};

export const summarizeMessages = async (userId: string | undefined, messagesText: string, limit?: number | string, allMessagesIncluded?: boolean, hitMaxLimit?: boolean) => {
  const systemPrompt = new SystemMessage(AI_ASSISTANT_PROMPTS.SUMMARIZE_SYSTEM);
  const userPrompt = new HumanMessage(
    AI_ASSISTANT_PROMPTS.SUMMARIZE_USER(messagesText, limit, allMessagesIncluded, hitMaxLimit),
  );

  const resolvedLlm = await llm;
  const response: any = await resolvedLlm.invoke([systemPrompt, userPrompt]);
  
  const tokens = response?.response_metadata?.tokenUsage?.totalTokens 
    || response?.usage_metadata?.total_tokens 
    || Math.ceil((response?.content?.length || 0) / 4);

  if (tokens > 0 && userId) await logTokenUsage(userId, 'chatSummarization', tokens);

  return response.content;
};

export const generateSmartReplies = async (userId: string | undefined, messagesText: string) => {
  const systemPrompt = new SystemMessage(
    AI_ASSISTANT_PROMPTS.GENERATE_REPLY_SYSTEM,
  );
  const userPrompt = new HumanMessage(`Conversation Context:\n${messagesText}`);

  const resolvedLlm = await llm;
  const response: any = await resolvedLlm.invoke([systemPrompt, userPrompt]);

  const tokens = response?.response_metadata?.tokenUsage?.totalTokens 
    || response?.usage_metadata?.total_tokens 
    || Math.ceil((response?.content?.length || 0) / 4);

  if (tokens > 0 && userId) await logTokenUsage(userId, 'suggestedReplies', tokens);

  return response.content;
};

export const translateMessage = async (userId: string | undefined, text: string, targetLang: string) => {
  const systemPrompt = new SystemMessage(
    AI_ASSISTANT_PROMPTS.TRANSLATE_SYSTEM(targetLang),
  );
  const userPrompt = new HumanMessage(`Text to translate:\n${text}`);

  const resolvedLlm = await llm;
  const response: any = await resolvedLlm.invoke([systemPrompt, userPrompt]);

  const tokens = response?.response_metadata?.tokenUsage?.totalTokens 
    || response?.usage_metadata?.total_tokens 
    || Math.ceil((response?.content?.length || 0) / 4);

  if (tokens > 0 && userId) await logTokenUsage(userId, 'translation', tokens);

  return response.content;
};

// ==========================================
// 🚀 Speech-to-Text (OpenAI New Model)
// ==========================================
export const transcribeAudioOpenAI = async (
  userId: string | undefined,
  audioBuffer: Buffer,
  mimetype: string,
  originalName: string,
) => {
  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimetype });

    formData.append("file", blob, originalName || "audio.webm");
    formData.append("model", OPENAI_STT_MODEL); // 💡 استخدام الموديل الجديد
    formData.append("language", "ar");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ [OpenAI STT] Transcription failed:", errorData);
      throw new Error("Failed to transcribe audio using OpenAI.");
    }

    const data = await response.json();
    const transcriptText = data.text || "";
    
    const tokens = Math.ceil((transcriptText.length || 0) / 4);
    if (tokens > 0 && userId) await logTokenUsage(userId, 'voiceToText', tokens);

    return transcriptText;
  } catch (error) {
    console.error("❌ [OpenAI STT] Unexpected error:", error);
    throw new Error(
      "An unexpected error occurred during OpenAI audio processing.",
    );
  }
};

// ==========================================
// 🚀 Speech-to-Text (Deepgram AI)
// ==========================================
export const transcribeAudioDeepgram = async (
  userId: string | undefined,
  audioBuffer: Buffer,
  mimetype: string,
) => {
  try {
    const url = `https://api.deepgram.com/v1/listen?model=${DEEPGRAM_MODEL}&language=ar`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": mimetype,
      },
      body: new Uint8Array(audioBuffer),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ [Deepgram API] Transcription failed:", errorData);
      throw new Error("Failed to transcribe audio using Deepgram.");
    }

    const data = await response.json();
    const transcriptText = data.results?.channels[0]?.alternatives[0]?.transcript || "";
    
    const tokens = Math.ceil((transcriptText.length || 0) / 4);
    if (tokens > 0 && userId) await logTokenUsage(userId, 'voiceToText', tokens);

    return transcriptText;
  } catch (error) {
    console.error("❌ [Deepgram API] Unexpected error:", error);
    throw new Error(
      "An unexpected error occurred during Deepgram audio processing.",
    );
  }
};