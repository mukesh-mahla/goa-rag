"use client";

import React from "react";
import { CheckCircle2, ShieldAlert, CornerDownRight, Terminal } from "lucide-react";

interface DatasetSampleChipsProps {
  onSelectQuery: (query: string) => void;
  language?: "hi-IN" | "en-IN";
  disabled?: boolean;
}

export const SAMPLE_QUERIES_HI = [
  {
    query: "मैनहट्टन परियोजना की सफलता का तुरंत क्या प्रभाव पड़ा?",
    label: "मैनहट्टन परियोजना प्रभाव",
    isMatched: true,
    tag: "MSMARCO मैच",
  },
  {
    query: "विभिन्न प्रकार की सामाजिक सुरक्षा विकलांगता क्या हैं?",
    label: "सामाजिक सुरक्षा विकलांगता",
    isMatched: true,
    tag: "MSMARCO मैच",
  },
  {
    query: "कारों पर अमेरिकी ध्वज के स्टिकर का क्या अर्थ है?",
    label: "ध्वज स्टिकर अर्थ",
    isMatched: true,
    tag: "MSMARCO मैच",
  },
  {
    query: "पुनर्स्थापनात्मक न्याय का क्या अर्थ और उद्देश्य है?",
    label: "पुनर्स्थापनात्मक न्याय",
    isMatched: true,
    tag: "MSMARCO मैच",
  },
  {
    query: "मंगल ग्रह पर पहली मानव बस्ती कब बसाई जाएगी?",
    label: "मंगल ग्रह बस्ती (अस्वीकृति परीक्षण)",
    isMatched: false,
    tag: "डेटासेट से बाहर",
  },
];

export const SAMPLE_QUERIES_EN = [
  {
    query: "What was the immediate impact of the success of the Manhattan Project?",
    label: "Manhattan Project Impact",
    isMatched: true,
    tag: "MSMARCO Match",
  },
  {
    query: "What are the different types of Social Security disability?",
    label: "Social Security Disability",
    isMatched: true,
    tag: "MSMARCO Match",
  },
  {
    query: "What does the American flag sticker on cars mean?",
    label: "Flag Sticker Meaning",
    isMatched: true,
    tag: "MSMARCO Match",
  },
  {
    query: "What is the purpose of restorative justice?",
    label: "Restorative Justice",
    isMatched: true,
    tag: "MSMARCO Match",
  },
  {
    query: "When will the first human colony on Mars be built?",
    label: "Mars Colony (Rejection Test)",
    isMatched: false,
    tag: "Out of Dataset",
  },
];

export default function DatasetSampleChips({
  onSelectQuery,
  language = "hi-IN",
  disabled = false,
}: DatasetSampleChipsProps) {
  const samples = language === "en-IN" ? SAMPLE_QUERIES_EN : SAMPLE_QUERIES_HI;

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
            {language === "en-IN" ? "Sample Prompts (English)" : "त्वरित प्रश्न (हिंदी)"}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <span>{language === "en-IN" ? "Mode: English" : "मोड: हिन्दी"}</span>
        </div>
      </div>

      {/* Grid of Specimen Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {samples.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectQuery(sample.query)}
            className="group relative text-left p-4 rounded-xl bg-[#0f1422]/90 hover:bg-[#151c30] border border-slate-800/80 hover:border-purple-500/50 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-purple-500/10"
          >
            {/* Top Metadata Row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {sample.isMatched ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className="font-medium text-xs text-slate-200 group-hover:text-white">
                  {sample.label}
                </span>
              </div>

              <span
                className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${
                  sample.isMatched
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
                    : "bg-rose-950/60 text-rose-300 border-rose-800/50"
                }`}
              >
                {sample.tag}
              </span>
            </div>

            {/* Specimen Query Text */}
            <p className="text-xs text-slate-300 group-hover:text-slate-100 font-normal leading-relaxed line-clamp-2 pr-4">
              &ldquo;{sample.query}&rdquo;
            </p>

            {/* Bottom Prompt Action Hint */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-purple-300">
              <span className="flex items-center gap-1.5">
                <CornerDownRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                <span>{language === "en-IN" ? "Test Query" : "प्रश्न पूछें"}</span>
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-400 font-medium">
                Execute &rarr;
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


