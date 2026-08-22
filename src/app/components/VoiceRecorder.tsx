"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

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

  return (
    <div className="flex items-center gap-2">
      {/* Stitch Segmented Language Pill Switcher */}
      <div className="flex items-center bg-black/40 backdrop-blur-md p-0.5 rounded-full border border-white/10">
        <button
          type="button"
          onClick={() => onLanguageChange("hi-IN")}
          className={`text-xs px-3 py-1 rounded-full transition-all cursor-pointer ${
            selectedLanguage === "hi-IN"
              ? "bg-white/20 text-white font-semibold shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
          title="Hindi Language (hi-IN)"
        >
          हिन्दी
        </button>

        <button
          type="button"
          onClick={() => onLanguageChange("en-IN")}
          className={`text-xs px-3 py-1 rounded-full transition-all cursor-pointer ${
            selectedLanguage === "en-IN"
              ? "bg-white/20 text-white font-semibold shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
          title="English Language (en-IN)"
        >
          EN
        </button>
      </div>

      {/* Mic Action Trigger */}
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
          isRecording
            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/50 animate-pulse"
            : isProcessing
            ? "bg-white/10 text-neutral-500 cursor-not-allowed"
            : "text-neutral-400 hover:text-white hover:bg-white/10"
        }`}
        title={isRecording ? "Stop Recording" : `Record voice query (${selectedLanguage === "hi-IN" ? "Hindi" : "English"})`}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Live Recording Pulsing Indicator */}
      {isRecording && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[11px] font-medium">
            {selectedLanguage === "hi-IN" ? "ध्वनि सुन रहे हैं..." : "Listening..."}
          </span>
        </div>
      )}
    </div>
  );
}

