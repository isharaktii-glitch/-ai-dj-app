"use client";

import { useState } from "react";

export default function StandaloneGenerate({
  onGenerated,
}: {
  onGenerated: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (prompt.trim().length < 3) {
      setError("Describe the track you want (at least 3 characters).");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, instrumental: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed to start.");
        setLoading(false);
        return;
      }

      setMessage(
        "Generation started — your new track will appear in your library shortly."
      );
      setPrompt("");
      onGenerated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-sm font-semibold text-text">
        Generate a new AI track
      </h3>
      <p className="mt-1 text-xs text-textdim">
        Describe a sound and AuraDJ will create a new track for your library.
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accentglow">
          {message}
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. upbeat 128 BPM house instrumental with warm bass"
        rows={3}
        className="mt-3 w-full rounded-lg border border-border bg-surface2 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
      />

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-3 w-full rounded-full bg-accent2 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Starting…" : "Generate track"}
      </button>
    </div>
  );
}
