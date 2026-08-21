"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Database,
  Search,
  CheckCircle2,
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

  if ((!matches || matches.length === 0) && !groundTruthAnswer) {
    return null;
  }

  const isEnglish = language === "en-IN";
  const displayGroundTruth = isEnglish ? groundTruthAnswerEn || groundTruthAnswer : groundTruthAnswer;

  return (
    <div className="pt-2">
      {/* Clean Subtle Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium py-1"
      >
        <Search className="w-3.5 h-3.5 text-cyan-400" />
        <span>
          {isOpen
            ? isEnglish
              ? "Hide verified dataset sources"
              : "सत्यापित स्रोत छिपाएं"
            : isEnglish
            ? `View ${matches?.length || 0} retrieved dataset sources & ground truth`
            : `${matches?.length || 0} सत्यापित स्रोत और डेटासेट उत्तर देखें`}
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3 text-xs animate-fade-in">
          {/* Ground Truth Answer */}
          {displayGroundTruth && (
            <div className="space-y-1">
              <span className="font-mono font-bold text-[11px] text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {isEnglish ? "Ground Truth Dataset Answer:" : "डेटासेट का मूल उत्तर:"}
              </span>
              <p className="text-slate-200 bg-slate-900/90 p-2.5 rounded-lg border border-emerald-950 leading-relaxed">
                {displayGroundTruth}
              </p>
            </div>
          )}

          {/* Retrieved Context Passages */}
          {matches && matches.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="font-mono font-bold text-[11px] text-slate-400 uppercase tracking-wider block">
                {isEnglish ? "Retrieved Passages:" : "प्रासंगिक संदर्भ:"}
              </span>

              {matches.slice(0, 3).map((match, idx) => (
                <div
                  key={match.id || idx}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Source #{idx + 1}</span>
                    <span className="text-cyan-400 font-bold">
                      {((match.score || 0) * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {isEnglish && match.text_en ? match.text_en : match.text_hi}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
