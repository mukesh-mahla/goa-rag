import { NextRequest, NextResponse } from "next/server";
import { executeRagHarness } from "@/app/lib/ragHarness";

export const dynamic = "force-dynamic";

export interface RagMatch {
  id: string;
  score: number;
  text_hi: string;
  text_en?: string;
  answer?: string;
  answer_en?: string;
  query?: string;
  query_en?: string;
  query_id?: number | string;
  query_type?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query?.trim();
    const language = (body.language as "hi-IN" | "en-IN") || "hi-IN";
    const allowFallbackLLM = Boolean(body.allowFallbackLLM);

    if (!query) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    const topK = body.topK ? Math.min(Math.max(Number(body.topK), 1), 10) : 3;

    // Run query through structured Model Harness with multi-layer guardrails
    const result = await executeRagHarness(query, topK, language, allowFallbackLLM);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("RAG Harness Route Error:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred during RAG execution.",
      },
      { status: 500 }
    );
  }
}
