"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Database,
  CheckCircle2,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { RagMatch } from "@/app/api/rag/route";

interface PassageViewerProps {
  matches: RagMatch[];
  groundTruthAnswer?: string | null;
  groundTruthAnswerEn?: string | null;
  language?: "hi-IN" | "en-IN";
}

export default function PassageViewer({
  matches,
  groundTruthAnswer,
  groundTruthAnswerEn,
  language = "hi-IN",
}: PassageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if ((!matches || matches.length === 0) && !groundTruthAnswer) {
    return null;
  }

  const isEnglish = language === "en-IN";
  const displayGroundTruth = isEnglish ? groundTruthAnswerEn || groundTruthAnswer : groundTruthAnswer;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="pt-2">
      {/* Clean Subtle Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 text-xs text-neutral-400 hover:text-cyan-300 transition-colors py-1 cursor-pointer"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors" />
        <span className="border-b border-dotted border-white/20 pb-0.5">
          {isOpen
            ? isEnglish
              ? "Hide verified dataset sources"
              : "सत्यापित स्रोत छिपाएं"
            : isEnglish
            ? `View ${matches?.length || 0} retrieved dataset sources & ground truth`
            : `${matches?.length || 0} सत्यापित स्रोत और डेटासेट उत्तर देखें`}
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-2.5 p-3.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 space-y-3 text-xs shadow-inner">
          {/* Ground Truth Answer */}
          {displayGroundTruth && (
            <div className="space-y-1.5 border-b border-white/10 pb-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {isEnglish ? "Ground Truth Dataset Answer:" : "डेटासेट का मूल उत्तर:"}
                </span>
                <span className="text-neutral-500">100% GROUNDED</span>
              </div>
              <p className="text-neutral-200 bg-white/[0.03] p-3 rounded-xl border border-emerald-500/20 leading-relaxed font-sans text-xs">
                {displayGroundTruth}
              </p>
            </div>
          )}

          {/* Retrieved Context Passages */}
          {matches && matches.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span className="uppercase font-semibold">
                  {isEnglish ? "Retrieved Passages:" : "प्रासंगिक संदर्भ:"}
                </span>
                <span>Pinecone Index</span>
              </div>

              {matches.slice(0, 3).map((match, idx) => {
                const text = isEnglish && match.text_en ? match.text_en : match.text_hi || "";
                return (
                  <div
                    key={match.id || idx}
                    className="group relative p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-semibold">Source #{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-medium">
                          {((match.score || 0) * 100).toFixed(0)}% match
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(text, idx)}
                          className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy passage"
                        >
                          {copiedIdx === idx ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-neutral-300 leading-relaxed text-[11px] font-sans">
                      {text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

