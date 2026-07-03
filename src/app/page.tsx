import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg">
      {/* Ambient glow backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-accent2/10 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-display text-lg font-bold tracking-tight">
          AURA<span className="text-accent">DJ</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-textdim transition hover:text-text"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentglow"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pb-20 pt-16 sm:px-10 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-textdim">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Live mixing engine, always on
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Upload your tracks.
            <br />
            <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
              Let the set play itself.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-textdim sm:text-lg">
            AuraDJ mixes your songs, beats, vocals and guitar tracks into a
            seamless live set — beatmatched, crossfaded, never the same way
            twice. Take the wheel anytime you want.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-full bg-accent px-8 py-3.5 text-center font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accentglow sm:w-auto"
            >
              Start mixing free
            </Link>
            <Link
              href="/login"
              className="w-full rounded-full border border-border px-8 py-3.5 text-center font-semibold text-text transition hover:border-accent sm:w-auto"
            >
              I have an account
            </Link>
          </div>
        </div>

        {/* Signature element: live waveform / mixer strip */}
        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-textdim">
            <span>NOW MIXING</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent2 glow-pulse" />
              AUTO DJ
            </span>
          </div>
          <div className="mt-4 flex h-16 items-end gap-[3px]">
            {Array.from({ length: 60 }).map((_, i) => {
              const h = 15 + Math.abs(Math.sin(i * 0.4)) * 70 + (i % 7) * 3;
              const isAccent = i > 38 && i < 52;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${
                    isAccent ? "bg-accent2" : "bg-accent/60"
                  }`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-text">Track 04 — Midnight Drive.mp3</span>
            <span className="text-accent2">AI transition in 0:12</span>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 px-6 pb-24 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            {
              title: "Smart Auto-Mix",
              desc: "BPM-matched crossfades and EQ sweeps, timed like a real set — never a repeated pattern.",
            },
            {
              title: "AI Track Matching",
              desc: "Upload a song and AuraDJ can generate a companion track built to match its key and energy.",
            },
            {
              title: "Full Manual Control",
              desc: "Grab the fader anytime — skip, blend, or override the auto-mix mid-set.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-6 transition hover:border-accent/50"
            >
              <h3 className="font-display font-semibold text-text">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-textdim">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border px-6 py-6 text-center text-xs text-textdim sm:px-10">
        AuraDJ — your tracks, mixed live.
      </footer>
    </main>
  );
}
