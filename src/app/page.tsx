"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ArrowUp,
  Plus,
  ChevronDown,
  Trash2,
  Loader2,
  Activity,
} from "lucide-react";
import AudioNavigator from "./components/AudioNavigator";
import VoiceRecorder from "./components/VoiceRecorder";
import DatasetSampleChips from "./components/DatasetSampleChips";
import PassageViewer from "./components/PassageViewer";
import HarnessTelemetryModal from "./components/HarnessTelemetryModal";
import { RagMatch } from "./api/rag/route";
import { HarnessTimingTelemetry } from "./lib/ragHarness";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isVoice?: boolean;
  matched?: boolean;
  topScore?: number;
  datasetAnswer?: string | null;
  datasetAnswerEn?: string | null;
  retrievedMatches?: RagMatch[];
  telemetry?: HarnessTimingTelemetry;
  language?: "hi-IN" | "en-IN";
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<"hi-IN" | "en-IN">("en-IN");
  const [selectedSource, setSelectedSource] = useState("Pinecone MS-MARCO");
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string, fromVoice = false) => {
    const text = (queryText || inputQuery).trim();
    if (!text || isLoading) return;

    const userMessageId = Date.now().toString();
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isVoice: fromVoice,
        language: selectedLanguage,
      },
    ];

    setMessages(newMessages);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, topK: 5, language: selectedLanguage }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to process query.");
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        matched: data.matched,
        topScore: data.topScore,
        datasetAnswer: data.datasetAnswer,
        datasetAnswerEn: data.datasetAnswerEn,
        retrievedMatches: data.retrievedMatches,
        telemetry: data.telemetry,
        language: data.language || selectedLanguage,
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (err: unknown) {
      console.error("Chat Error:", err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          selectedLanguage === "en-IN"
            ? "Error processing query. Please try again."
            : "प्रश्न संसाधित करने में त्रुटि हुई। कृपया पुनः प्रयास करें।",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        matched: false,
        topScore: 0,
        language: selectedLanguage,
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    if (transcript && transcript.trim()) {
      handleSendMessage(transcript, true);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen relative isolate bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* Liquid Metal Background Effect */}
      <div
        data-aifx="liquid-metal"
        data-aifx-mouse="0.1"
        className="absolute inset-0 -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Navbar: Minimalist Google Stitch Style */}
      <header className="relative z-20 max-w-6xl w-full mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
        {/* Brand Logo with Outline BETA Pill */}
        <div className="flex items-center gap-2.5">
          <span className="text-xl font-bold tracking-tight text-white">SST-RAG</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/20 text-neutral-300">
            BETA
          </span>
        </div>

        {/* Right Actions: Latency Benchmark & Clear Chat */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTelemetryModalOpen(true)}
            className="px-5 py-2 rounded-full bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Try now</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 rounded-full bg-white/5 hover:bg-rose-950/50 text-neutral-400 hover:text-rose-300 border border-white/10 transition-colors text-xs cursor-pointer"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Content Section */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-center space-y-8 sm:space-y-10">
        {/* Hero Title & Subtitle */}
        <div className="text-center space-y-3.5 pt-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            {selectedLanguage === "en-IN" ? (
              <>
                Design at the
                <br />
                speed of AI
              </>
            ) : (
              <>
                ध्वनि-से-पाठ तकनीक,
                <br />
                एआई की गति से
              </>
            )}
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto font-normal leading-relaxed">
            {selectedLanguage === "en-IN"
              ? "Transform spoken and text queries into verified, sub-200ms answers from your knowledge base."
              : "अपनी आवाज़ या टेक्स्ट से तुरंत सत्यापित उत्तर प्राप्त करें।"}
          </p>
        </div>

        {/* Signature Stitch Frosted Glass Prompt Capsule */}
        <div className="w-full space-y-3">
          <div className="stitch-glass rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 transition-all">
            {/* Textarea Input */}
            <textarea
              rows={3}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                selectedLanguage === "en-IN"
                  ? "What question shall we answer today?"
                  : "आप क्या पूछना चाहते हैं?"
              }
              className="w-full bg-transparent text-base sm:text-lg text-white placeholder-neutral-500 focus:outline-none resize-none leading-relaxed"
            />

            {/* Bottom Action Ribbon inside the capsule */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {/* Left: Source Button & Segmented Language Pill */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Attach or filter source"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Segmented Language Switcher */}
                <VoiceRecorder
                  onTranscript={handleVoiceTranscript}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={(lang) => setSelectedLanguage(lang)}
                  disabled={isLoading}
                />
              </div>

              {/* Right: Model Selector Pill & Circular Submit Button */}
              <div className="flex items-center gap-2.5">
                {/* Model / Index Selector Dropdown Pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs text-neutral-200 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedSource}</span>
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  </button>

                  {isSourceDropdownOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 rounded-2xl stitch-glass shadow-2xl p-1.5 z-40 space-y-1">
                      {["Pinecone MS-MARCO", "Multilingual Vector Chunks", "MS-MARCO Ground Truth"].map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => {
                            setSelectedSource(src);
                            setIsSourceDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                            selectedSource === src
                              ? "bg-cyan-500/20 text-cyan-300 font-medium"
                              : "text-neutral-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {src}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Circular Send Arrow Button */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-black flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0"
                  title="Send query (Enter ↵)"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-black" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sparkle Suggestion Pills Row (Below Capsule) */}
          <DatasetSampleChips
            onSelectQuery={(q) => handleSendMessage(q)}
            language={selectedLanguage}
            disabled={isLoading}
          />
        </div>

        {/* Responses Feed (When messages exist) */}
        {messages.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Responses Feed ({messages.length})
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
              >
                {msg.role === "assistant" ? (
                  <div className="w-full rounded-3xl stitch-glass p-6 space-y-4 shadow-2xl">
                    {/* Monospace Telemetry Header */}
                    {msg.telemetry && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            {msg.telemetry.totalMs}ms
                          </span>
                          <span className="text-neutral-600">&bull;</span>
                          <span className="text-neutral-400">
                            {msg.matched ? "Verified Ground Truth" : "Not in Dataset"}
                          </span>
                        </div>

                        <div className="text-neutral-500 font-mono text-[11px]">
                          Embed: {msg.telemetry.embeddingMs}ms | Search: {msg.telemetry.retrievalMs}ms
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="text-neutral-100 leading-relaxed whitespace-pre-wrap text-sm sm:text-base font-normal">
                      {msg.content}
                    </div>

                    {/* Audio Navigator */}
                    <AudioNavigator
                      textToSpeak={msg.content}
                      language={msg.language || selectedLanguage}
                      autoPlay={false}
                    />

                    {/* Passage Viewer */}
                    {msg.retrievedMatches && msg.retrievedMatches.length > 0 && (
                      <PassageViewer
                        matches={msg.retrievedMatches}
                        groundTruthAnswer={msg.datasetAnswer}
                        groundTruthAnswerEn={msg.datasetAnswerEn}
                        language={msg.language || selectedLanguage}
                      />
                    )}
                  </div>
                ) : (
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 text-white p-4 sm:p-5 space-y-1 shadow-lg">
                    <div className="flex items-center justify-between gap-3 text-[10px] text-neutral-400 pb-1 border-b border-white/10">
                      <span className="uppercase font-semibold">
                        {msg.isVoice ? "VOICE INPUT" : "USER PROMPT"}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="text-white text-sm sm:text-base leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Footer Branding Note */}
      <footer className="relative z-10 py-6 text-center text-xs text-neutral-500">
        <span>Powered by Pinecone Vector Database & Multimodal Audio Retrieval</span>
      </footer>

      {/* Latency Telemetry Benchmark Suite Modal */}
      <HarnessTelemetryModal
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
      />
    </div>
  );
}


