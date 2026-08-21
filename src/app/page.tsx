"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Brain,
  Home as HomeIcon,
  MessageSquare,
  FileText,
  Database,
  BarChart3,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Zap,
  Shield,
  Layers,
  TrendingUp,
  Send,
  ChevronDown,
  Activity,
  Trash2,
  Loader2,
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

interface RecentQuery {
  id: string;
  query: string;
  timeAgo: string;
  language: "hi-IN" | "en-IN";
}

const DEFAULT_RECENT_QUERIES: RecentQuery[] = [
  {
    id: "q1",
    query: "What are the key features of the RAG system?",
    timeAgo: "2 min ago",
    language: "en-IN",
  },
  {
    id: "q2",
    query: "How does retrieval augmented generation work?",
    timeAgo: "15 min ago",
    language: "en-IN",
  },
  {
    id: "q3",
    query: "What documents are in the knowledge base?",
    timeAgo: "1 hour ago",
    language: "en-IN",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"home" | "chat" | "documents" | "sources" | "analytics" | "settings">("home");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<"hi-IN" | "en-IN">("en-IN");
  const [selectedSource, setSelectedSource] = useState("Search Sources");
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>(DEFAULT_RECENT_QUERIES);
  const [isLoading, setIsLoading] = useState(false);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

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

    // Update recent queries list
    const newRecent: RecentQuery = {
      id: userMessageId,
      query: text,
      timeAgo: "Just now",
      language: selectedLanguage,
    };
    setRecentQueries([newRecent, ...recentQueries.slice(0, 4)]);

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
    <div className="min-h-screen bg-[#080b13] bg-dashboard-glow text-slate-100 flex font-sans selection:bg-purple-900/50 selection:text-white">
      {/* Left Sidebar (w-64 fixed desktop) */}
      <aside className="hidden md:flex w-64 flex-col justify-between bg-[#0b0f19] border-r border-[#1a2336] p-5 shrink-0 z-20">
        {/* Top Header & Navigation */}
        <div className="space-y-7">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight">RAG Assistant</h1>
              <p className="text-[11px] text-slate-400">Your AI Knowledge Companion</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-[#1f1d3e] text-purple-300 shadow-sm border border-purple-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#111726]"
              }`}
            >
              <HomeIcon className={`w-4 h-4 ${activeTab === "home" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-[#1f1d3e] text-purple-300 shadow-sm border border-purple-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#111726]"
              }`}
            >
              <MessageSquare className={`w-4 h-4 ${activeTab === "chat" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === "documents"
                  ? "bg-[#1f1d3e] text-purple-300 shadow-sm border border-purple-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#111726]"
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === "documents" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Documents</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sources")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === "sources"
                  ? "bg-[#1f1d3e] text-purple-300 shadow-sm border border-purple-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#111726]"
              }`}
            >
              <Database className={`w-4 h-4 ${activeTab === "sources" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Sources</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("analytics");
                setIsTelemetryModalOpen(true);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-[#1f1d3e] text-purple-300 shadow-sm border border-purple-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#111726]"
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeTab === "analytics" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#1f1d3e] text-purple-300 shadow-sm border border-purple-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#111726]"
              }`}
            >
              <SettingsIcon className={`w-4 h-4 ${activeTab === "settings" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: System Status & User Profile */}
        <div className="space-y-4">
          {/* System Status Card */}
          <div className="bg-[#0e1322] border border-[#1b253b] rounded-2xl p-4 space-y-2.5">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">System Status</span>
            
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Online</span>
            </div>

            <div className="pt-2 border-t border-[#1a2336] space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Documents Loaded</span>
                <span className="text-purple-400 font-bold text-sm">24</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Vector Database</span>
                <span className="text-emerald-400 font-medium">Connected</span>
              </div>
            </div>
          </div>

          {/* User Profile Footer */}
          <div className="bg-[#0e1322] border border-[#1b253b] rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1b2438] border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                H
              </div>
              <div className="text-left">
                <span className="font-semibold text-xs text-white block">Himanshu</span>
                <span className="text-[11px] text-slate-400 block">Local User</span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 px-6 sm:px-8 flex items-center justify-between border-b border-[#1a2336]/60 bg-[#080b13]/80 backdrop-blur-md sticky top-0 z-30">
          {/* Mobile Brand */}
          <div className="flex md:hidden items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-white">RAG Assistant</span>
          </div>

          <div className="hidden md:block" />

          {/* Right Top Status & Theme Controls */}
          <div className="flex items-center gap-3">
            <div className="bg-[#0e1322] border border-[#1b253b] rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs text-slate-300 font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RAG System</span>
            </div>

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-8 h-8 rounded-full bg-[#0e1322] hover:bg-[#151c30] border border-[#1b253b] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="p-2 rounded-full bg-[#0e1322] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#1b253b] hover:border-rose-900/50 transition-colors text-xs cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Main Body */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-3 pt-2 sm:pt-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Ask Anything,
              <br />
              Get{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-500">
                Intelligent Answers
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
              Your AI assistant powered by Retrieval-Augmented Generation.
              <br className="hidden sm:inline" /> Get accurate answers from your documents and knowledge base.
            </p>
          </div>

          {/* Central Query Search Box Card */}
          <div className="relative bg-[#0f1422]/90 backdrop-blur-xl border border-[#1e293b] hover:border-purple-500/40 focus-within:border-purple-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 transition-all">
            {/* Query Textarea */}
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
                  ? "Ask your question here..."
                  : "अपना प्रश्न यहाँ पूछें..."
              }
              className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />

            {/* Bottom Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              {/* Left Filters: Source Selector & Voice Input */}
              <div className="flex items-center gap-2.5">
                {/* Search Sources Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131929] hover:bg-[#1a2336] border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{selectedSource}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isSourceDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-48 rounded-xl bg-[#0e1322] border border-slate-800 shadow-2xl p-1.5 z-40 space-y-1">
                      {["Search Sources", "MS-MARCO Dataset", "Pinecone Index"].map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => {
                            setSelectedSource(src);
                            setIsSourceDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            selectedSource === src
                              ? "bg-purple-600/30 text-purple-300 font-medium"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          }`}
                        >
                          {src}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multilingual Voice Recorder */}
                <VoiceRecorder
                  onTranscript={handleVoiceTranscript}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={(lang) => setSelectedLanguage(lang)}
                  disabled={isLoading}
                />
              </div>

              {/* Right Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputQuery.trim()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 4 Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Smart Retrieval */}
            <div className="bg-[#0f1422]/70 hover:bg-[#131929] border border-slate-800/80 hover:border-purple-500/40 rounded-2xl p-4 sm:p-5 transition-all space-y-2.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-white">Smart Retrieval</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Advanced semantic search finds the most relevant information.
              </p>
            </div>

            {/* Card 2: Accurate Answers */}
            <div className="bg-[#0f1422]/70 hover:bg-[#131929] border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-4 sm:p-5 transition-all space-y-2.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400">
                  <Shield className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-white">Accurate Answers</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Get precise answers grounded in your document sources.
              </p>
            </div>

            {/* Card 3: Multiple Sources */}
            <div className="bg-[#0f1422]/70 hover:bg-[#131929] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 transition-all space-y-2.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-white">Multiple Sources</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Search across all your documents and knowledge bases.
              </p>
            </div>

            {/* Card 4: Analytics */}
            <button
              type="button"
              onClick={() => setIsTelemetryModalOpen(true)}
              className="text-left bg-[#0f1422]/70 hover:bg-[#131929] border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 transition-all space-y-2.5 shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-white">Analytics</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Track queries and system performance with detailed insights.
              </p>
            </button>
          </div>

          {/* Sample Prompts Bar */}
          <div className="bg-[#0f1422]/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <DatasetSampleChips
              onSelectQuery={(q) => handleSendMessage(q)}
              language={selectedLanguage}
              disabled={isLoading}
            />
          </div>

          {/* Active Conversation Feed */}
          {messages.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-sm font-bold text-white">Active Responses</span>
                <span className="text-xs text-slate-400 font-mono">{messages.length} messages</span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } animate-fade-in`}
                >
                  {msg.role === "assistant" ? (
                    <div className="w-full max-w-3xl rounded-2xl bg-[#0f1422] border border-slate-800 p-5 space-y-3.5 shadow-xl">
                      {/* Telemetry Header */}
                      {msg.telemetry && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800 font-mono text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                              <Activity className="w-3.5 h-3.5 text-emerald-400" />
                              {msg.telemetry.totalMs}ms
                            </span>
                            <span className="text-slate-600">&bull;</span>
                            <span className="text-slate-400">
                              {msg.matched ? "Verified Dataset Answer" : "Not in Dataset"}
                            </span>
                          </div>

                          <div className="text-slate-500">
                            Embed: {msg.telemetry.embeddingMs}ms | Search: {msg.telemetry.retrievalMs}ms
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div className="text-slate-200 leading-relaxed whitespace-pre-wrap text-sm sm:text-base font-normal">
                        {msg.content}
                      </div>

                      {/* Audio Player */}
                      <AudioNavigator
                        textToSpeak={msg.content}
                        language={msg.language || selectedLanguage}
                        autoPlay={false}
                      />

                      {/* Source Chunks Inspector */}
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
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-700/50 text-slate-100 p-4 space-y-1 shadow-lg">
                      <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-purple-300 pb-1 border-b border-purple-800/40">
                        <span className="uppercase font-semibold">
                          {msg.isVoice ? "VOICE INPUT" : "USER QUERY"}
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

          {/* Recent Queries Card */}
          <div className="bg-[#0f1422]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Recent Queries</h3>
              <button
                type="button"
                onClick={() => handleSendMessage(recentQueries[0]?.query)}
                className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-800/60">
              {recentQueries.map((rq) => (
                <button
                  key={rq.id}
                  type="button"
                  onClick={() => handleSendMessage(rq.query)}
                  className="w-full py-3.5 flex items-center justify-between gap-4 text-left group hover:bg-[#131929]/60 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-purple-400 shrink-0 transition-colors" />
                    <span className="text-xs sm:text-sm text-slate-300 group-hover:text-white truncate">
                      {rq.query}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0 font-mono">
                    {rq.timeAgo}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div ref={messagesEndRef} />
        </main>
      </div>

      {/* Latency Telemetry Benchmark Modal */}
      <HarnessTelemetryModal
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
      />
    </div>
  );
}

