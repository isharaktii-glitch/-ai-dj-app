"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import TrackUpload from "@/components/dj/TrackUpload";
import TrackLibrary, { Track } from "@/components/dj/TrackLibrary";
import DjPlayer from "@/components/dj/DjPlayer";
import StandaloneGenerate from "@/components/dj/StandaloneGenerate";
import UsageStatus from "@/components/dj/UsageStatus";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [aiBiasPercent, setAiBiasPercent] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [matchMessage, setMatchMessage] = useState("");

  const loadTracks = useCallback(async () => {
    const res = await fetch("/api/tracks");
    const data = await res.json();
    if (res.ok) setTracks(data.tracks);
  }, []);

  const loadUsageForBias = useCallback(async () => {
    const res = await fetch("/api/usage");
    const data = await res.json();
    if (res.ok && data.package) {
      setAiBiasPercent(data.package.aiBiasPercent ?? 30);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadTracks();
      loadUsageForBias();
    }
  }, [status, loadTracks, loadUsageForBias]);

  function refreshAll() {
    loadTracks();
    setRefreshKey((k) => k + 1);
  }

  async function handleRequestMatch(trackId: string) {
    setMatchMessage("");
    const res = await fetch("/api/ai/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceTrackId: trackId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMatchMessage(data.error || "Could not start AI match.");
    } else {
      setMatchMessage("AI match generation started.");
    }
    refreshAll();
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-textdim">
        Loading…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold">
            AURA<span className="text-accent">DJ</span>
          </Link>
          <div className="flex items-center gap-3">
            {(session?.user as any)?.role === "admin" && (
              <Link
                href="/admin"
                className="text-sm text-textdim hover:text-text"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-textdim hover:text-text"
            >
              Log out
            </button>
          </div>
        </header>

        <p className="mb-6 text-sm text-textdim">
          Welcome back, {session?.user?.name}.
        </p>

        {matchMessage && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accentglow">
            {matchMessage}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-5">
            <DjPlayer tracks={tracks} aiBiasPercent={aiBiasPercent} />
            <UsageStatus refreshKey={refreshKey} />
          </div>

          <div className="space-y-5">
            <TrackUpload onUploaded={refreshAll} />
            <StandaloneGenerate onGenerated={refreshAll} />
          </div>
        </div>

        <div className="mt-5">
          <TrackLibrary
            tracks={tracks}
            onDeleted={refreshAll}
            onRequestMatch={handleRequestMatch}
          />
        </div>
      </div>
    </main>
  );
}
