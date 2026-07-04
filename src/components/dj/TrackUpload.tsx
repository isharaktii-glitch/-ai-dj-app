"use client";

import { useState, useRef } from "react";
import { analyzeAudioFile } from "@/lib/audio/analyze";

const TYPE_OPTIONS = [
  { value: "song", label: "Song" },
  { value: "beat", label: "Beat" },
  { value: "vocal", label: "Vocal" },
  { value: "guitar", label: "Guitar" },
];

export default function TrackUpload({
  onUploaded,
}: {
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [type, setType] = useState("song");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      setProgressText("Analyzing audio…");
      const analysis = await analyzeAudioFile(file);

      setProgressText("Uploading track…");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("type", type);

      const res = await fetch("/api/tracks/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        setUploading(false);
        return;
      }

      setProgressText("Saving analysis…");
      await fetch("/api/tracks/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: data.track.id,
          bpm: analysis.bpm,
          energyLevel: analysis.energyLevel,
          durationSeconds: analysis.durationSeconds,
        }),
      });

      setProgressText("");
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (err) {
      console.error(err);
      setError("Something went wrong while uploading.");
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-sm font-semibold text-text">
        Upload a track
      </h3>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              type === opt.value
                ? "bg-accent text-white"
                : "border border-border text-textdim hover:border-accent/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface2 px-4 py-6 text-center transition hover:border-accent">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          disabled={uploading}
          onChange={handleFileSelect}
        />
        <span className="text-sm text-text">
          {uploading ? progressText || "Working…" : "Tap to choose an audio file"}
        </span>
        <span className="mt-1 text-xs text-textdim">MP3, WAV — up to 30MB</span>
      </label>
    </div>
  );
}
