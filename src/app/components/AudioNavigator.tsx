"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Loader2,
} from "lucide-react";

interface AudioNavigatorProps {
  textToSpeak: string;
  language?: "hi-IN" | "en-IN";
  autoPlay?: boolean;
}

export default function AudioNavigator({
  textToSpeak,
  language = "hi-IN",
  autoPlay = false,
}: AudioNavigatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    stopPlayback();
    if (textToSpeak && autoPlay) {
      loadAndPlayAudio(textToSpeak);
    }
  }, [textToSpeak]);

  const loadAndPlayAudio = async (text: string) => {
    if (!text || text.trim() === "") return;

    setIsLoadingAudio(true);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language_code: language,
          speaker: language === "en-IN" ? "aditya" : "anushka",
        }),
      });

      const data = await res.json();

      if (res.ok && data.audio) {
        if (audioRef.current) audioRef.current.pause();

        const audio = new Audio(data.audio);
        audioRef.current = audio;
        audio.playbackRate = playbackRate;
        audio.volume = isMuted ? 0 : volume;

        audio.onloadedmetadata = () => {
          setDuration(audio.duration || 10);
        };

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
        };

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

        audio.onerror = () => {
          playWithWebSpeech(text);
        };

        await audio.play();
        setIsPlaying(true);
        setIsLoadingAudio(false);
        return;
      }
    } catch (e) {
      console.warn("TTS error, falling back to Web Speech", e);
    }

    playWithWebSpeech(text);
  };

  const playWithWebSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsLoadingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = playbackRate;
    utterance.volume = isMuted ? 0 : volume;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) =>
      language === "en-IN"
        ? v.lang.includes("en")
        : v.lang.includes("hi") || v.lang === "hi-IN"
    );
    if (voice) utterance.voice = voice;

    const words = text.split(/\s+/).length;
    const estDuration = Math.max(3, Math.round(words * 0.45));
    setDuration(estDuration);
    setCurrentTime(0);

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
      if (timerRef.current) clearInterval(timerRef.current);
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed <= estDuration) setCurrentTime(elapsed);
      }, 200);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsLoadingAudio(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const togglePlayPause = () => {
    if (isLoadingAudio) return;
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        loadAndPlayAudio(textToSpeak);
      }
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleRewind = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 5);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    } else {
      setCurrentTime((prev) => Math.max(0, prev - 5));
    }
  };

  const handleFastForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(duration, audioRef.current.currentTime + 5);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    } else {
      setCurrentTime((prev) => Math.min(duration, prev + 5));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) audioRef.current.currentTime = seekTime;
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div className="flex items-center gap-3 pt-2 mt-2 border-t border-slate-800/60 text-slate-300">
      {/* Minimal Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlayPause}
        disabled={isLoadingAudio}
        className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all flex items-center justify-center shrink-0"
        title={isPlaying ? "Pause" : "Listen to answer"}
      >
        {isLoadingAudio ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Skip Controls */}
      <button
        type="button"
        onClick={handleRewind}
        className="text-[11px] font-mono px-1.5 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Rewind 5s"
      >
        -5s
      </button>

      {/* Progress Bar & Time */}
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
        />
        <span className="font-mono text-[11px] text-slate-500 shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <button
        type="button"
        onClick={handleFastForward}
        className="text-[11px] font-mono px-1.5 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Forward 5s"
      >
        +5s
      </button>
    </div>
  );
}
