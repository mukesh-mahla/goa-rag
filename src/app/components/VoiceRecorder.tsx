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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("");

  const latestTranscriptRef = useRef<string>("");
  const hasSpokenRef = useRef<boolean>(false);
  const silenceStartRef = useRef<number | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  // Detect supported MediaRecorder MIME type (Safari mp4 vs Chrome webm/opus)
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === "undefined") return "";
    const candidateTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4", // Safari on macOS / iOS
      "audio/aac",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];
    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
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

            const currentText = (finalTranscript || currentInterim).trim();
            if (currentText) {
              latestTranscriptRef.current = currentText;
              hasSpokenRef.current = true;
              silenceStartRef.current = null;
            }
          };

          recognition.onerror = (event: any) => {
            console.warn("Browser SpeechRecognition event:", event.error);
            if (event.error === "not-allowed") {
              setErrorMessage("Microphone permission denied.");
            }
          };

          recognitionRef.current = recognition;
        } catch (e) {
          console.warn("SpeechRecognition init error:", e);
        }
      }
    }

    return () => {
      stopRecording(false);
    };
  }, [selectedLanguage]);

  // Real-time Web Audio Energy VAD (Voice Activity Detection)
  const startAudioEnergyVAD = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();

      // Resume audio context if suspended (common on macOS Safari / Chrome)
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current || isStoppingRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avgVolume = sum / dataArray.length;

        // Speech Energy Threshold
        if (avgVolume > 12) {
          hasSpokenRef.current = true;
          silenceStartRef.current = null;
        } else if (hasSpokenRef.current) {
          // User spoke previously, now in silence
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else {
            const silenceDuration = Date.now() - silenceStartRef.current;
            // When silence exceeds 1.3s after speech, auto-stop and send!
            if (silenceDuration > 1300 && !isStoppingRef.current) {
              isStoppingRef.current = true;
              autoFinishAndSend();
              return;
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn("Web Audio VAD error:", e);
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    latestTranscriptRef.current = "";
    hasSpokenRef.current = false;
    silenceStartRef.current = null;
    isStoppingRef.current = false;
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Start Web Audio Energy VAD
      startAudioEnergyVAD(stream);

      // Configure MediaRecorder with browser-compatible MIME type
      const supportedMime = getSupportedMimeType();
      mimeTypeRef.current = supportedMime;

      const options: MediaRecorderOptions = supportedMime ? { mimeType: supportedMime } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);

      // Start client speech recognition if available
      if (recognitionRef.current) {
        recognitionRef.current.lang = selectedLanguage;
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }

      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access error on MacBook/Browser:", err);
      setErrorMessage("Could not access microphone.");
    }
  };

  const autoFinishAndSend = async () => {
    setIsRecording(false);
    isStoppingRef.current = true;

    // Teardown Web Audio VAD
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Stop MediaStream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Stop MediaRecorder and process audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // If client SpeechRecognition captured text, dispatch immediately
    if (latestTranscriptRef.current && latestTranscriptRef.current.trim()) {
      const transcript = latestTranscriptRef.current.trim();
      latestTranscriptRef.current = "";
      onTranscript(transcript);
      return;
    }

    // Otherwise, fallback to Sarvam AI STT API (saarika:v2)
    setIsProcessing(true);
    setTimeout(async () => {
      try {
        if (audioChunksRef.current.length > 0) {
          const mime = mimeTypeRef.current || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mime });

          const formData = new FormData();
          formData.append("file", audioBlob, `recording.${mime.includes("mp4") ? "mp4" : "webm"}`);
          formData.append("language_code", selectedLanguage);

          const res = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.transcript && data.transcript.trim()) {
              onTranscript(data.transcript.trim());
            }
          }
        }
      } catch (err) {
        console.error("Sarvam STT processing error:", err);
      } finally {
        setIsProcessing(false);
      }
    }, 200);
  };

  const stopRecording = (sendIfPresent = true) => {
    setIsRecording(false);
    isStoppingRef.current = true;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (sendIfPresent) {
      autoFinishAndSend();
    }
  };

  const toggleRecording = () => {
    if (disabled || isProcessing) return;
    if (isRecording) {
      autoFinishAndSend();
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
        title={
          isRecording
            ? "Listening... Click to finish"
            : `Record voice query (${selectedLanguage === "hi-IN" ? "Hindi" : "English"})`
        }
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
