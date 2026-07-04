"use client";

import { useState } from "react";

export interface Track {
  id: string;
  title: string;
  type: "song" | "beat" | "vocal" | "guitar";
  source: "uploaded" | "ai_matched" | "ai_standalone";
  fileUrl: string;
  bpm: number | null;
  energyLevel: number | null;
  matchStatus: "none" | "pending" | "generating" | "completed" | "failed";
  matchedTrackId: string | null;
  playCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  song: "Songs",
  beat: "Beats",
  vocal: "Vocals",
  guitar: "Guitar",
};

export default function TrackLibrary({
  tracks,
  onDeleted,
  onRequestMatch,
}: {
  tracks: Track[];
  onDeleted: () => void;
  onRequestMatch: (trackId: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setBusyId(id);
    await fetch(`/api/tracks?id=${id}`, { method: "DELETE" });
    setBusyId(null);
    onDeleted();
  }

  const grouped = ["song", "beat", "vocal", "guitar"].map((type) => ({
    type,
    items: tracks.filter((t) => t.type === type),
  }));

  if (tracks.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-textdim">
        No tracks yet. Upload your first one above.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(
        (group) =>
          group.items.length > 0 && (
            <div key={group.type}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textdim">
                {TYPE_LABELS[group.type]} · {group.items.length}
              </h4>
              <div className="space-y-2">
                {group.items.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {track.title}
                      </p>
                      <p className="mt-0.5 text-xs text-textdim">
                        {track.bpm ? `${Math.round(track.bpm)} BPM` : "—"}
                        {"  ·  "}
                        {track.source === "uploaded"
                          ? "Uploaded"
                          : track.source === "ai_matched"
                          ? "AI Match"
                          : "AI Generated"}
                        {"  ·  "}
                        {track.playCount} plays
                      </p>
                    </div>

                    <div className="ml-3 flex items-center gap-2">
                      {track.type === "song" &&
                        track.source === "uploaded" &&
                        track.matchStatus === "none" && (
                          <button
                            onClick={() => onRequestMatch(track.id)}
                            className="rounded-full border border-accent/40 px-3 py-1.5 text-xs font-medium text-accentglow transition hover:bg-accent/10"
                          >
                            Generate AI match
                          </button>
                        )}
                      {(track.matchStatus === "pending" ||
                        track.matchStatus === "generating") && (
                        <span className="rounded-full border border-accent2/40 px-3 py-1.5 text-xs text-accent2">
                          Generating…
                        </span>
                      )}
                      {track.matchStatus === "failed" && (
                        <span className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs text-red-400">
                          Match failed
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(track.id)}
                        disabled={busyId === track.id}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-textdim transition hover:border-red-500/50 hover:text-red-400"
                      >
                        {busyId === track.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}
