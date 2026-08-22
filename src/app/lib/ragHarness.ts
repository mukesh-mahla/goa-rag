/**
 * Model Harness & Pipeline Orchestrator for Hacker House Goa STT RAG Model
 * Provides genuine LLM reasoning, strict contextual grounding, and multi-layer guardrails.
 * Measures pure RAG generation latency from user query to verified response.
 */

import { GoogleGenAI } from "@google/genai";
import { getEmbedding } from "./generateEmbedings";
import { index } from "./pinecone";
import {
  checkInputSafety,
  checkDomainRelevance,
  verifyGrounding,
  GuardrailAuditReport,
  GuardrailCheckResult,
} from "./guardrails";

const apiKey = process.env.gemini_api_key || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export interface HarnessTimingTelemetry {
  totalMs: number;
  embeddingMs: number;
  retrievalMs: number;
  guardrailMs: number;
  synthesisMs: number;
  verificationMs: number;
}

export interface StructuredHarnessOutput {
  answer: string;
  matched: boolean;
  topScore: number;
  datasetAnswer: string | null;
  datasetAnswerEn: string | null;
  datasetQuery: string | null;
  datasetQueryId: number | string | null;
  retrievedMatches: any[];
  guardrailReport: GuardrailAuditReport;
  telemetry: HarnessTimingTelemetry;
  query: string;
  language: "hi-IN" | "en-IN";
}

function detectIsEnglish(query: string, requestedLang?: "hi-IN" | "en-IN"): boolean {
  if (requestedLang === "en-IN") return true;
  if (requestedLang === "hi-IN") return false;
  const latinCount = (query.match(/[a-zA-Z]/g) || []).length;
  const devanagariCount = (query.match(/[\u0900-\u097F]/g) || []).length;
  return latinCount > devanagariCount;
}

export async function executeRagHarness(
  rawQuery: string,
  topK = 3,
  requestedLanguage: "hi-IN" | "en-IN" = "hi-IN"
): Promise<StructuredHarnessOutput> {
  // Pure RAG Generation latency timer starts here
  const tStartTotal = performance.now();
  const checks: GuardrailCheckResult[] = [];

  let embeddingMs = 0;
  let retrievalMs = 0;
  let guardrailMs = 0;
  let synthesisMs = 0;
  let verificationMs = 0;

  const query = rawQuery.trim();
  const isEnglish = detectIsEnglish(query, requestedLanguage);
  const activeLanguage: "hi-IN" | "en-IN" = isEnglish ? "en-IN" : "hi-IN";

  const strictRefusal = isEnglish
    ? "This information is not present in the dataset."
    : "यह जानकारी डेटासेट में उपलब्ध नहीं है।";

  // Stage 1: Input Safety Guardrail (< 1ms)
  const tStartG1 = performance.now();
  const safetyCheck = checkInputSafety(query);
  checks.push(safetyCheck);
  guardrailMs += performance.now() - tStartG1;

  if (!safetyCheck.passed) {
    const totalMs = performance.now() - tStartTotal;
    return {
      answer: isEnglish
        ? "Invalid or unsafe input rejected by safety guardrail."
        : "असुरक्षित या अमान्य इनपुट (Unsafe input rejected).",
      matched: false,
      topScore: 0,
      datasetAnswer: null,
      datasetAnswerEn: null,
      datasetQuery: null,
      datasetQueryId: null,
      retrievedMatches: [],
      guardrailReport: {
        isSafe: false,
        isDomainRelevant: false,
        isGrounded: false,
        finalDecision: "REFUSE_UNSAFE",
        refusalMessage: safetyCheck.reason,
        checks,
      },
      telemetry: {
        totalMs: Math.round(totalMs),
        embeddingMs: 0,
        retrievalMs: 0,
        guardrailMs: Math.round(guardrailMs),
        synthesisMs: 0,
        verificationMs: 0,
      },
      query,
      language: activeLanguage,
    };
  }

  // Stage 2: Query Embedding Generation (768-dim)
  const tStartEmb = performance.now();
  let queryEmbedding: number[] = [];
  try {
    queryEmbedding = await getEmbedding(query, "RETRIEVAL_QUERY");
  } catch (err: any) {
    await new Promise((r) => setTimeout(r, 80));
    queryEmbedding = await getEmbedding(query, "RETRIEVAL_QUERY");
  }
  embeddingMs = performance.now() - tStartEmb;

  // Stage 3: Pinecone Vector Retrieval (Optimized topK = 3)
  const tStartRet = performance.now();
  let matches: any[] = [];
  try {
    const pineconeRes = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    matches = (pineconeRes?.matches || []).map((m: any) => {
      const meta = (m.metadata || {}) as Record<string, any>;
      return {
        id: m.id,
        score: m.score ?? 0,
        text_hi: meta.text_hi || meta.text || "",
        text_en: meta.text_en || "",
        answer: meta.answer || "",
        answer_en: meta.answer_en || "",
        query: meta.query || "",
        query_en: meta.query_en || "",
        query_id: meta.query_id,
        query_type: meta.query_type,
      };
    });
  } catch (retError) {
    console.error("Pinecone search error:", retError);
    matches = [];
  }
  retrievalMs = performance.now() - tStartRet;

  const topScore = matches && matches.length > 0 ? matches[0].score : 0;
  const bestMatch = matches && matches.length > 0 ? matches[0] : null;

  // Stage 4: Domain Relevance Guardrail (< 1ms)
  const tStartG2 = performance.now();
  const domainCheck = checkDomainRelevance(topScore, matches?.length || 0, 0.38);
  checks.push(domainCheck);
  guardrailMs += performance.now() - tStartG2;

  if (!domainCheck.passed) {
    const totalMs = performance.now() - tStartTotal;
    return {
      answer: strictRefusal,
      matched: false,
      topScore,
      datasetAnswer: null,
      datasetAnswerEn: null,
      datasetQuery: null,
      datasetQueryId: null,
      retrievedMatches: matches || [],
      guardrailReport: {
        isSafe: true,
        isDomainRelevant: false,
        isGrounded: true,
        finalDecision: "REFUSE_OUT_OF_DOMAIN",
        refusalMessage: domainCheck.reason,
        checks,
      },
      telemetry: {
        totalMs: Math.round(totalMs),
        embeddingMs: Math.round(embeddingMs),
        retrievalMs: Math.round(retrievalMs),
        guardrailMs: Math.round(guardrailMs),
        synthesisMs: 0,
        verificationMs: 0,
      },
      query,
      language: activeLanguage,
    };
  }

  // Stage 5: Context Reasoning & Fast Synthesis (Gemini 2.5 Flash with token optimization)
  const tStartSyn = performance.now();
  let generatedAnswer = "";

  const contextPrompt = (matches || [])
    .slice(0, 3)
    .map((m: any, idx: number) => {
      if (isEnglish) {
        return `[Source ${idx + 1}] (Match: ${(m.score * 100).toFixed(0)}%)
Dataset Query: ${m.query_en || m.query || "N/A"}
Dataset Answer: ${m.answer_en || m.answer || "N/A"}
Context: ${m.text_en || m.text_hi}`;
      }
      return `[स्रोत ${idx + 1}] (मैच: ${(m.score * 100).toFixed(0)}%)
डेटासेट प्रश्न: ${m.query || "N/A"}
डेटासेट उत्तर: ${m.answer || "N/A"}
संदर्भ पाठ: ${m.text_hi}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = isEnglish
    ? `You are an intelligent, strict Question-Answering system grounded exclusively in the provided context.
Rules:
1. Carefully check what specific entity and attribute the user is asking for (e.g. weight vs height, specific age, person, event, location).
2. Look at the retrieved passages. If the passages discuss a related topic (e.g. height instead of weight, age 1-3 instead of age 5) but do NOT contain the exact answer for the user's question, you MUST NOT guess or output unrelated facts.
3. In that case, you MUST answer strictly with: "${strictRefusal}"
4. If the exact answer IS present in the context, provide a concise, direct, and factual answer in English.`
    : `आप एक अत्यंत सटीक और सख्त प्रश्न-उत्तर सहायक हैं।
नियम:
1. उपयोगकर्ता के प्रश्न और उसमें पूछी गई विशिष्ट जानकारी (जैसे वजन बनाम ऊंचाई, विशिष्ट आयु, व्यक्ति, स्थान आदि) को ध्यान से देखें।
2. यदि दिए गए संदर्भ में प्रश्न का सटीक उत्तर मौजूद नहीं है (उदाहरण के लिए वजन पूछा गया है लेकिन संदर्भ में केवल ऊंचाई या अलग आयु दी गई है), तो कोई भी गलत या अप्रासंगिक उत्तर न दें।
3. ऐसी स्थिति में आपका उत्तर केवल और केवल यही होना चाहिए: "${strictRefusal}"
4. यदि सटीक उत्तर संदर्भ में उपलब्ध है, तो स्पष्ट और संक्षिप्त हिंदी में उत्तर दें।`;

  const userPrompt = `Context:\n${contextPrompt}\n\nUser Question: ${query}\n\nAnswer:`;

  try {
    const modelResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      config: {
        maxOutputTokens: 220,
        temperature: 0.1,
      },
    });
    generatedAnswer = modelResponse.text?.trim() || strictRefusal;
  } catch (synError) {
    console.error("Gemini synthesis error:", synError);
    generatedAnswer = strictRefusal;
  }
  synthesisMs = performance.now() - tStartSyn;

  // Stage 6: Post-Execution Grounding Guardrail (< 1ms)
  const tStartVer = performance.now();
  const passageTexts = (matches || []).map((m: any) => (isEnglish ? m.text_en || m.text_hi : m.text_hi));
  const groundingCheck = verifyGrounding(
    generatedAnswer,
    passageTexts,
    isEnglish ? bestMatch?.answer_en : bestMatch?.answer
  );
  checks.push(groundingCheck);
  verificationMs = performance.now() - tStartVer;

  let finalAnswer = generatedAnswer;
  let finalDecision: GuardrailAuditReport["finalDecision"] = "SERVE_ANSWER";
  let isMatched = true;

  const answerLower = generatedAnswer.toLowerCase();
  const isRefusal =
    answerLower.includes("not present") ||
    answerLower.includes("not available") ||
    answerLower.includes("does not contain") ||
    answerLower.includes("does not mention") ||
    answerLower.includes("उपलब्ध नहीं") ||
    answerLower.includes("डेटासेट में") ||
    answerLower.includes("संदर्भ में");

  if (isRefusal) {
    finalAnswer = strictRefusal;
    finalDecision = "REFUSE_OUT_OF_DOMAIN";
    isMatched = false;
  } else if (!groundingCheck.passed) {
    finalAnswer = strictRefusal;
    finalDecision = "REFUSE_UNGROUNDED";
    isMatched = false;
  }

  const totalMs = performance.now() - tStartTotal;

  return {
    answer: finalAnswer,
    matched: isMatched,
    topScore,
    datasetAnswer: isMatched ? (bestMatch?.answer || null) : null,
    datasetAnswerEn: isMatched ? (bestMatch?.answer_en || null) : null,
    datasetQuery: isMatched ? (isEnglish ? bestMatch?.query_en : bestMatch?.query) : null,
    datasetQueryId: isMatched ? (bestMatch?.query_id || null) : null,
    retrievedMatches: matches || [],
    guardrailReport: {
      isSafe: true,
      isDomainRelevant: isMatched,
      isGrounded: groundingCheck.passed,
      finalDecision,
      checks,
    },
    telemetry: {
      totalMs: Math.round(totalMs),
      embeddingMs: Math.round(embeddingMs),
      retrievalMs: Math.round(retrievalMs),
      guardrailMs: Math.round(guardrailMs),
      synthesisMs: Math.round(synthesisMs),
      verificationMs: Math.round(verificationMs),
    },
    query,
    language: activeLanguage,
  };
}
