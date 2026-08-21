"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Trash2,
  Zap,
  Compass,
  Gauge,
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
    } catch (err: any) {
      console.error("Chat Error:", err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: selectedLanguage === "en-IN"
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
    <div className="min-h-screen bg-slate-950 bg-hh-grid text-slate-100 flex flex-col font-sans">
      {/* Top Navbar: Clean & Minimal */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px]">
              <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center text-cyan-400">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
            <span className="font-mono font-bold text-sm text-slate-200">
              SST-RAG
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTelemetryModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition-colors"
              title="View P50/P70/P100 Latency Benchmark"
            >
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Latency Analytics</span>
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors text-xs"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Chat Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col justify-between">
        <div className="flex-1 space-y-5 pb-28">
          {/* Welcome Screen when no messages */}
          {messages.length === 0 && (
            <div className="my-auto pt-6 pb-8 space-y-6 animate-fade-in">
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  Multimodal SST-RAG System
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {selectedLanguage === "en-IN"
                    ? "Voice-to-Text & Sub-200ms Verified QA"
                    : "ध्वनि-से-पाठ एवं सत्यापित प्रश्न-उत्तर"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {selectedLanguage === "en-IN"
                    ? "Ask in English or Hindi using voice or text. Get strictly grounded answers with live latency tracking."
                    : "हिंदी या अंग्रेजी में बोलकर या लिखकर प्रश्न पूछें। पाइनकोन डेटासेट से सत्यापित उत्तर प्राप्त करें।"}
                </p>
              </div>

              {/* Dynamic Language-Aware Sample Prompts */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <DatasetSampleChips
                  onSelectQuery={(q) => handleSendMessage(q)}
                  language={selectedLanguage}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Clean Message Feed */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } animate-fade-in`}
            >
              {/* AI Avatar */}
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 p-1 shrink-0 mt-0.5 flex items-center justify-center text-cyan-400 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Card */}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 space-y-2.5 ${
                  msg.role === "user"
                    ? "bg-cyan-600 text-white rounded-tr-sm shadow-md"
                    : "bg-slate-900/90 border border-slate-800/80 text-slate-100 rounded-tl-sm shadow-lg"
                }`}
              >
                {/* User Message */}
                {msg.role === "user" ? (
                  <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                ) : (
                  /* Assistant Message: Clean, uncluttered, readable */
                  <>
                    {/* Minimal Latency Pill */}
                    {msg.telemetry && (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800/60">
                        <span className="text-cyan-400 font-semibold flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {msg.telemetry.totalMs}ms
                        </span>
                        <span>&bull;</span>
                        <span className="text-slate-400">
                          {msg.matched ? "Verified Dataset Answer" : "Not in Dataset"}
                        </span>
                      </div>
                    )}

                    {/* THE ANSWER: Clear, Bold, Prominent */}
                    <div className="text-sm sm:text-base leading-relaxed text-slate-100 font-normal">
                      {msg.content}
                    </div>

                    {/* Minimal Audio Player */}
                    <AudioNavigator
                      textToSpeak={msg.content}
                      language={msg.language || selectedLanguage}
                      autoPlay={false}
                    />

                    {/* Subtle Collapsible Sources Drawer */}
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
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 p-1 shrink-0 mt-0.5 flex items-center justify-center text-cyan-400 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 items-center animate-fade-in">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 p-1 shrink-0 flex items-center justify-center text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Searching dataset & generating answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Bottom Input Capsule */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pb-4 pt-4">
          <div className="max-w-3xl mx-auto px-4">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 hover:border-slate-700 focus-within:border-cyan-500/60 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2 transition-all">
              {/* Voice Recorder with Language Selector */}
              <VoiceRecorder
                onTranscript={handleVoiceTranscript}
                selectedLanguage={selectedLanguage}
                onLanguageChange={(lang) => setSelectedLanguage(lang)}
                disabled={isLoading}
              />

              {/* Text Input */}
              <input
                type="text"
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
                    ? "Ask in English or use voice..."
                    : "हिंदी में प्रश्न पूछें या बोलें..."
                }
                className="flex-1 bg-transparent px-2.5 py-1.5 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none"
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputQuery.trim()}
                className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold transition-all flex items-center justify-center shrink-0"
                title="Send"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 fill-current" />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Latency Telemetry Modal */}
      <HarnessTelemetryModal
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
      />
    </div>
  );
}
