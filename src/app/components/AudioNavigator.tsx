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
  Sliders,
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

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
    if (synthRef.current) synthRef.current.rate = speed;
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div className="pt-2.5 mt-2 border-t border-slate-800/80 text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0f1a]/80 p-2.5 rounded-xl border border-slate-800">
        {/* Left: Play/Pause Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={isLoadingAudio}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-purple-500/20 disabled:opacity-40"
            title={isPlaying ? "Pause" : "Listen to answer"}
          >
            {isLoadingAudio ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-white text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
            )}
          </button>

          {/* Rewind / Fast Forward */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRewind}
              className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Rewind 5s"
            >
              -5s
            </button>
            <button
              type="button"
              onClick={handleFastForward}
              className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Forward 5s"
            >
              +5s
            </button>
          </div>
        </div>

        {/* Center: Progress Bar & Time */}
        <div className="flex-1 min-w-[140px] flex items-center gap-2.5">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-purple-500 focus:outline-none"
          />
          <span className="font-mono text-[11px] text-slate-400 shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Right: Speed Multipliers */}
        <div className="flex items-center gap-1 bg-[#131929] p-0.5 rounded-lg border border-slate-800">
          {[1.0, 1.25, 1.5, 2.0].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleSpeedChange(rate)}
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                playbackRate === rate
                  ? "bg-purple-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

