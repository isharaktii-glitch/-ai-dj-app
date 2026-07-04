"use client";

import { useState, useRef, useCallback } from "react";
import { DjEngine, DjTrack } from "@/lib/audio/djEngine";
import type { Track } from "./TrackLibrary";

export default function DjPlayer({
  tracks,
  aiBiasPercent,
}: {
  tracks: Track[];
  aiBiasPercent: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<DjTrack | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const engineRef = useRef<DjEngine | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

  const toDjTrack = (t: Track): DjTrack => ({
    id: t.id,
    title: t.title,
    type: t.type,
    source: t.source,
    fileUrl: t.fileUrl,
    bpm: t.bpm,
    energyLevel: t.energyLevel,
  });

  const logTrackPlay = useCallback((trackId: string) => {
    if (!sessionIdRef.current) return;
    fetch("/api/sessions/log-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionIdRef.current, trackId }),
    }).catch(() => {});
  }, []);

  const scheduleNext = useCallback(
    (durationSeconds: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      // Trigger the crossfade a few seconds before the track ends
      const leadTime = Math.min(5, durationSeconds * 0.15);
      const delayMs = Math.max(1000, (durationSeconds - leadTime) * 1000);

      timeoutRef.current = setTimeout(async () => {
        const pool = tracks.map(toDjTrack);
        const next = engine.pickNextTrack(pool);
        if (!next) return;

        const dur = await engine.crossfadeTo(next);
        setCurrentTrack(next);
        logTrackPlay(next.id);
        scheduleNext(dur);
      }, delayMs);
    },
    [tracks, logTrackPlay]
  );

  async function handlePlay() {
    if (tracks.length === 0) {
      setError("Upload at least one track first.");
      return;
    }
    setError("");

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "auto" }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not start session.");
      return;
    }

    setSessionId(data.session.id);
    sessionIdRef.current = data.session.id;
    startTimeRef.current = Date.now();

    const engine = new DjEngine();
    engine.aiBiasPercent = aiBiasPercent;
    engine.setMasterVolume(volume);
    engine.onTrackChange = (t) => setCurrentTrack(t);
    engineRef.current = engine;

    const pool = tracks.map(toDjTrack);
    const first = engine.pickNextTrack(pool);
    if (!first) return;

    const dur = await engine.playFirst(first);
    logTrackPlay(first.id);
    setIsPlaying(true);
    scheduleNext(dur);
  }

  async function handleStop() {
    engineRef.current?.stop();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const playTimeMins = (Date.now() - startTimeRef.current) / 60000;
    if (sessionIdRef.current) {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          playTimeMins: Math.round(playTimeMins * 10) / 10,
        }),
      }).catch(() => {});
    }

    setIsPlaying(false);
    setCurrentTrack(null);
    sessionIdRef.current = null;
    setSessionId(null);
  }

  function handleVolumeChange(v: number) {
    setVolume(v);
    engineRef.current?.setMasterVolume(v);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-text">
          Live DJ Player
        </h3>
        {isPlaying && (
          <span className="flex items-center gap-1.5 text-xs text-accent2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent2 glow-pulse" />
            LIVE
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="mt-4 flex h-14 items-end gap-[2px]">
        {Array.from({ length: 50 }).map((_, i) => {
          const h = isPlaying
            ? 15 + Math.abs(Math.sin(i * 0.5 + Date.now() / 500)) * 70
            : 8;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-accent/50 transition-all"
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>

      <p className="mt-3 truncate text-sm text-text">
        {currentTrack ? currentTrack.title : "Nothing playing"}
      </p>
      <p className="text-xs text-textdim">
        {currentTrack?.bpm ? `${Math.round(currentTrack.bpm)} BPM` : ""}
      </p>

      <div className="mt-4 flex items-center gap-3">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accentglow"
          >
            ▶ Start Live Set
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex-1 rounded-full border border-red-500/40 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            ■ Stop
          </button>
        )}
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs text-textdim">
          Volume {Math.round(volume * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="range-slider w-full"
        />
      </div>
    </div>
  );
}
