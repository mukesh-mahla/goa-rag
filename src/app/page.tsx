"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  User,
  Trash2,
  Gauge,
  Loader2,
  Activity,
  ArrowUp,
  Plus,
} from "lucide-react";
import AudioNavigator from "./components/AudioNavigator";
import VoiceRecorder from "./components/VoiceRecorder";
import DatasetSampleChips from "./components/DatasetSampleChips";
import PassageViewer from "./components/PassageViewer";
import HarnessTelemetryModal from "./components/HarnessTelemetryModal";
import Prism from "./components/Prism";
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
  const [selectedLanguage, setSelectedLanguage] = useState<"hi-IN" | "en-IN">("hi-IN");
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
        body: JSON.stringify({ query: text, topK: 3, language: selectedLanguage }),
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
      {/* React Bits 3D Prism Shimmer Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden flex items-center justify-center opacity-85">
        <Prism
          animationType="3drotate"
          timeScale={0.4}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0.35}
          glow={1.1}
          bloom={1.2}
          transparent={true}
        />
      </div>

      {/* Top Header: Clean, boxless, no top-left text, actions aligned on right */}
      <header className="relative z-20 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex items-center justify-end gap-2">
        {/* Right Actions: Floating Separate Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTelemetryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs font-mono text-neutral-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="View P50/P70/P100 Latency Benchmark"
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">Latency Analytics</span>
            <span className="sm:hidden">Latency</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 rounded-full bg-white/5 hover:bg-rose-950/50 text-neutral-400 hover:text-rose-300 border border-white/10 transition-colors text-xs cursor-pointer active:scale-95"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Chat Container */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-2 sm:py-4 flex flex-col justify-between space-y-4 sm:space-y-6">
        {/* Chat Messages Feed: Positioned on top of input bar */}
        <div className="flex-1 space-y-3.5 sm:space-y-5">
          {/* Center Bold Heading: "Ask. Explore. Discover." with Geist Font */}
          {messages.length === 0 && (
            <div className="my-auto py-14 sm:py-20 text-center animate-fade-in px-2">
              <h1
                style={{
                  fontFamily: 'var(--font-geist-sans), "Geist", sans-serif',
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: "-0.04em",
                }}
                className="text-4xl sm:text-6xl md:text-[72px] text-white drop-shadow-2xl"
              >
                Ask. Explore. Discover.
              </h1>
            </div>
          )}

          {/* Active Messages Feed */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } animate-fade-in`}
            >
              {/* AI Avatar */}
              {msg.role === "assistant" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 border border-white/15 p-1 shrink-0 mt-0.5 flex items-center justify-center text-cyan-400 shadow-sm backdrop-blur-xl">
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}

              {/* Message Bubble Card */}
              <div
                className={`max-w-[95%] sm:max-w-[85%] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 shadow-xl ${
                  msg.role === "user"
                    ? "bg-white/15 backdrop-blur-xl border border-white/20 text-white rounded-tr-sm"
                    : "stitch-glass border border-white/10 text-neutral-100 rounded-tl-sm"
                }`}
              >
                {/* User Message */}
                {msg.role === "user" ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-[10px] text-neutral-400 pb-1 border-b border-white/10 font-mono">
                      <span className="uppercase font-semibold">
                        {msg.isVoice ? "VOICE INPUT (STT)" : "USER PROMPT"}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="text-white text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  /* Assistant Message: Clean, clear, bold answer */
                  <>
                    {/* Pure RAG Generation Latency Pill */}
                    {msg.telemetry && (
                      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pb-2 border-b border-white/10 text-[11px] sm:text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 text-cyan-400 font-bold">
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            Generation: {msg.telemetry.totalMs}ms
                          </span>
                          <span className="text-neutral-600">&bull;</span>
                          <span className="text-neutral-400 text-[10px] sm:text-[11px]">
                            {msg.matched ? "Verified Ground Truth" : "Refusal"}
                          </span>
                        </div>

                        <div className="text-neutral-500 font-mono text-[10px] sm:text-[11px]">
                          Embed: {msg.telemetry.embeddingMs}ms | Search: {msg.telemetry.retrievalMs}ms
                        </div>
                      </div>
                    )}

                    {/* THE ANSWER */}
                    <div className="text-sm sm:text-base leading-relaxed text-neutral-100 font-normal">
                      {msg.content}
                    </div>

                    {/* Audio Navigator Player */}
                    <AudioNavigator
                      textToSpeak={msg.content}
                      language={msg.language || selectedLanguage}
                      autoPlay={false}
                    />

                    {/* Collapsible Ground Truth & Retrieved Context Drawer */}
                    {msg.retrievedMatches && msg.retrievedMatches.length > 0 && (
                      <PassageViewer
                        matches={msg.retrievedMatches}
                        groundTruthAnswer={msg.datasetAnswer}
                        groundTruthAnswerEn={msg.datasetAnswerEn}
                        language={msg.language || selectedLanguage}
                      />
                    )}
                  </>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === "user" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 border border-white/15 p-1 shrink-0 mt-0.5 flex items-center justify-center text-white shadow-sm backdrop-blur-xl">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading State */}
          {isLoading && (
            <div className="flex gap-2 sm:gap-3 items-center animate-fade-in">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 border border-white/15 p-1 shrink-0 flex items-center justify-center text-cyan-400 backdrop-blur-xl">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl stitch-glass text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-lg">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Searching dataset & generating answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Cohesive Input Section: Pre-prompts floating separately with NO enclosing box directly above the input */}
        <div className="w-full space-y-2 sm:space-y-3 pt-1">
          {/* Pre-Prompt Suggestion Chips: Separate standalone floating pills */}
          <DatasetSampleChips
            onSelectQuery={(q) => handleSendMessage(q)}
            language={selectedLanguage}
            disabled={isLoading}
          />

          {/* Full-Sized Signature Frosted Glass Prompt Capsule */}
          <div className="stitch-glass rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl space-y-2.5 sm:space-y-4 transition-all">
            {/* Multi-Line Textarea Input */}
            <textarea
              rows={2}
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
              className="w-full bg-transparent text-sm sm:text-lg text-white placeholder-neutral-500 focus:outline-none resize-none leading-relaxed min-h-[50px] sm:min-h-[75px]"
            />

            {/* Action Ribbon inside the capsule */}
            <div className="flex items-center justify-between gap-2 pt-1.5 sm:pt-2 border-t border-white/5">
              {/* Left: Plus & Segmented Language Switcher with Mic */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
                  title="Options"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Voice Recorder & Language Switcher */}
                <VoiceRecorder
                  onTranscript={handleVoiceTranscript}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={(lang) => setSelectedLanguage(lang)}
                  disabled={isLoading}
                />
              </div>

              {/* Right: Circular Send Arrow Button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-black flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 hover:scale-105 active:scale-95"
                  title="Send query (Enter ↵)"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-black" />
                  ) : (
                    <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Right Hacker House Goa Brand Badge */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 pointer-events-none">
        <div className="stitch-pill px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-xl border border-white/15 bg-black/80">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-mono font-medium text-neutral-300 tracking-wider uppercase">
            Hacker House Goa
          </span>
        </div>
      </div>

      {/* Latency Telemetry Modal */}
      <HarnessTelemetryModal
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
      />
    </div>
  );
}
