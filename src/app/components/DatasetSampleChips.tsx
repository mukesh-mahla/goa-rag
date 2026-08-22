"use client";

import React from "react";
import { Sparkles } from "lucide-react";

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
    <div className="w-full flex flex-wrap items-center justify-center gap-2.5 pt-2">
      {samples.map((sample, idx) => (
        <button
          key={idx}
          type="button"
          disabled={disabled}
          onClick={() => onSelectQuery(sample.query)}
          className="group stitch-pill px-4 py-2 rounded-full text-xs text-neutral-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm max-w-full truncate"
          title={sample.query}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white transition-colors shrink-0" />
          <span className="truncate font-normal">
            {sample.label}
          </span>
        </button>
      ))}
    </div>
  );
}


