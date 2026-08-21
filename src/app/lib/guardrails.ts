/**
 * Guardrails Engine for Hindi SST-RAG System
 * Multi-layer validation: Input Safety, Domain Relevance, and Grounding/Hallucination Checks
 */

export interface GuardrailCheckResult {
  passed: boolean;
  stage: "PRE_INPUT_SAFETY" | "PRE_DOMAIN_RELEVANCE" | "POST_GROUNDING_CHECK";
  flag?: string;
  reason?: string;
  confidenceScore?: number;
}

export interface GuardrailAuditReport {
  isSafe: boolean;
  isDomainRelevant: boolean;
  isGrounded: boolean;
  finalDecision: "SERVE_ANSWER" | "REFUSE_OUT_OF_DOMAIN" | "REFUSE_UNSAFE" | "REFUSE_UNGROUNDED";
  refusalMessage?: string;
  checks: GuardrailCheckResult[];
}

export const STRICT_DATASET_REFUSAL =
  "यह जानकारी डेटासेट में उपलब्ध नहीं है। (This information is not present in the dataset.)";

// Known prompt injection patterns and adversarial triggers
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous\s+|prior\s+)?rules/i,
  /system\s+prompt\s+(reveal|show|print|leak)/i,
  /override\s+(system|developer)\s+mode/i,
  /(you\s+are\s+now\s+(in\s+)?|enter\s+|act\s+as\s+)(dan|developer|unfiltered|jailbreak)/i,
  /dan\s+unfiltered/i,
  /bypass\s+(safety|guardrail|filter)/i,
  /<script[\s\S]*?>/i,
  /javascript:/i,
];

/**
 * 1. Pre-Execution Guardrail: Input Safety & Prompt Injection Check
 */
export function checkInputSafety(query: string): GuardrailCheckResult {
  const normalized = query.trim();

  if (!normalized || normalized.length < 2) {
    return {
      passed: false,
      stage: "PRE_INPUT_SAFETY",
      flag: "EMPTY_OR_TOO_SHORT",
      reason: "Query is empty or insufficient.",
    };
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        passed: false,
        stage: "PRE_INPUT_SAFETY",
        flag: "PROMPT_INJECTION_ATTEMPT",
        reason: "Input triggered adversarial prompt injection guardrail.",
      };
    }
  }

  return {
    passed: true,
    stage: "PRE_INPUT_SAFETY",
  };
}

/**
 * 2. Pre-Execution Guardrail: Vector Space Domain Relevance Check
 */
export function checkDomainRelevance(
  topScore: number,
  matchesCount: number,
  threshold = 0.38
): GuardrailCheckResult {
  if (matchesCount === 0 || topScore < threshold) {
    return {
      passed: false,
      stage: "PRE_DOMAIN_RELEVANCE",
      flag: "OUT_OF_DOMAIN",
      reason: `Query similarity score (${(topScore * 100).toFixed(1)}%) is below domain threshold (${(threshold * 100).toFixed(1)}%).`,
      confidenceScore: topScore,
    };
  }

  return {
    passed: true,
    stage: "PRE_DOMAIN_RELEVANCE",
    confidenceScore: topScore,
  };
}

/**
 * 3. Post-Execution Guardrail: Grounding & Hallucination Verifier
 * Verifies that the generated answer is faithful to the retrieved passage and ground-truth metadata
 */
export function verifyGrounding(
  generatedAnswer: string,
  retrievedPassages: string[],
  groundTruthAnswer?: string | null
): GuardrailCheckResult {
  const answerLower = generatedAnswer.trim().toLowerCase();

  // If the model already refused because it's not in dataset, pass grounding
  if (
    answerLower.includes("डेटासेट में उपलब्ध नहीं है") ||
    answerLower.includes("not present in the dataset") ||
    answerLower.includes("not available in the dataset")
  ) {
    return {
      passed: true,
      stage: "POST_GROUNDING_CHECK",
      confidenceScore: 1.0,
      reason: "Model correctly issued strict domain refusal.",
    };
  }

  // Check token overlap with retrieved contexts
  const combinedContext = [
    ...(retrievedPassages || []),
    groundTruthAnswer || "",
  ].join(" ").toLowerCase();

  // Extract key words/tokens (>3 chars)
  const answerTokens = answerLower
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'–—]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (answerTokens.length === 0) {
    return {
      passed: true,
      stage: "POST_GROUNDING_CHECK",
      confidenceScore: 1.0,
    };
  }

  let matchedTokens = 0;
  for (const token of answerTokens) {
    if (combinedContext.includes(token)) {
      matchedTokens++;
    }
  }

  const overlapRatio = matchedTokens / answerTokens.length;

  // If overlap ratio is too low (< 0.25), flag possible hallucination
  if (overlapRatio < 0.25) {
    return {
      passed: false,
      stage: "POST_GROUNDING_CHECK",
      flag: "LOW_CONTEXT_GROUNDING",
      reason: `Answer overlap with retrieved context is only ${(overlapRatio * 100).toFixed(1)}%, failing hallucination guardrail.`,
      confidenceScore: overlapRatio,
    };
  }

  return {
    passed: true,
    stage: "POST_GROUNDING_CHECK",
    confidenceScore: Math.min(1.0, overlapRatio * 1.2),
  };
}
