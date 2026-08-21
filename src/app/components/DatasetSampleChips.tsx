"use client";

import React from "react";
import { Sparkles, CheckCircle2, ShieldAlert, Terminal } from "lucide-react";

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
    <div className="w-full">
      <div className="flex items-center justify-between gap-1.5 mb-2 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === "en-IN" ? "Sample Prompts (English)" : "त्वरित प्रश्न (हिंदी)"}</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {language === "en-IN" ? "Mode: English" : "मोड: हिन्दी"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {samples.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectQuery(sample.query)}
            className={`group text-left px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-2 ${
              sample.isMatched
                ? "bg-slate-900/90 hover:bg-cyan-950/40 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white"
                : "bg-slate-900/90 hover:bg-rose-950/40 border-slate-800 hover:border-rose-500/50 text-rose-300 hover:text-white"
            } hover:scale-[1.01] active:scale-[0.99]`}
          >
            {sample.isMatched ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-medium text-xs truncate max-w-[240px]">{sample.query}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                sample.isMatched
                  ? "bg-cyan-950 text-cyan-400 border border-cyan-800/60"
                  : "bg-rose-950 text-rose-400 border border-rose-800/60"
              }`}
            >
              {sample.tag}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
