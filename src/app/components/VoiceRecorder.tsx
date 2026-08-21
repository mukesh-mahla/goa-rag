"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, Languages } from "lucide-react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  selectedLanguage: "hi-IN" | "en-IN";
  onLanguageChange: (lang: "hi-IN" | "en-IN") => void;
  disabled?: boolean;
}

export default function VoiceRecorder({
  onTranscript,
  selectedLanguage,
  onLanguageChange,
  disabled = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage;

        recognition.onresult = (event: any) => {
          let currentInterim = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          if (currentInterim) {
            setInterimText(currentInterim);
          }

          if (finalTranscript) {
            const trimmed = finalTranscript.trim();
            setInterimText(trimmed);
            onTranscript(trimmed);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition event:", event.error);
          if (event.error === "not-allowed") {
            setErrorMessage("Microphone access denied.");
            stopRecording();
          }
        };

        recognition.onend = () => {
          if (isRecording) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      stopRecording();
    };
  }, [selectedLanguage]);

  const startAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(avg);
        }
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn("Visualizer error:", e);
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setInterimText("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      startAudioVisualizer(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);

      if (recognitionRef.current) {
        recognitionRef.current.lang = selectedLanguage;
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }

      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic error:", err);
      setErrorMessage("Could not access microphone.");
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();

      setTimeout(async () => {
        if (audioChunksRef.current.length > 0 && !interimText) {
          setIsProcessing(true);
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
            const formData = new FormData();
            formData.append("file", audioBlob, "recording.wav");
            formData.append("language_code", selectedLanguage);

            const res = await fetch("/api/stt", {
              method: "POST",
              body: formData,
            });

            if (res.ok) {
              const data = await res.json();
              if (data.transcript) {
                setInterimText(data.transcript);
                onTranscript(data.transcript);
              }
            }
          } catch (e) {
            console.error("STT fallback error:", e);
          } finally {
            setIsProcessing(false);
          }
        }
      }, 300);
    }
  };

  const toggleRecording = () => {
    if (disabled || isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const pulseScale = isRecording ? 1 + Math.min(0.25, audioLevel / 200) : 1;

  return (
    <div className="flex items-center gap-2">
      {/* Explicit Language Selector Dropdown / Toggle */}
      <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => onLanguageChange("hi-IN")}
          className={`text-[11px] font-mono px-2 py-1 rounded-lg transition-all ${
            selectedLanguage === "hi-IN"
              ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Transcribe Voice in Hindi (hi-IN)"
        >
          🇮🇳 हिन्दी
        </button>

        <button
          type="button"
          onClick={() => onLanguageChange("en-IN")}
          className={`text-[11px] font-mono px-2 py-1 rounded-lg transition-all ${
            selectedLanguage === "en-IN"
              ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Transcribe Voice in English (en-IN)"
        >
          🌐 EN
        </button>
      </div>

      {/* Mic Button */}
      <div className="relative">
        {isRecording && (
          <div
            className="absolute -inset-1.5 rounded-full bg-rose-500/30 animate-ping pointer-events-none"
            style={{ animationDuration: "1.5s" }}
          />
        )}

        <button
          type="button"
          onClick={toggleRecording}
          disabled={disabled || isProcessing}
          style={{ transform: `scale(${pulseScale})` }}
          className={`relative p-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center ${
            isRecording
              ? "bg-rose-600 text-white ring-2 ring-rose-400 shadow-lg shadow-rose-600/40"
              : isProcessing
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 shadow-md hover:scale-105 active:scale-95"
          }`}
          title={isRecording ? "Stop Listening" : `Voice Input (${selectedLanguage === "hi-IN" ? "Hindi" : "English"})`}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-4 h-4 animate-pulse" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
      </div>

      {isRecording && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/70 border border-rose-800/50 px-2.5 py-1 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="font-mono text-[11px]">
            Listening ({selectedLanguage === "hi-IN" ? "Hindi" : "English"})...
          </span>
        </div>
      )}
    </div>
  );
}
