"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-lg font-bold">
            AURA<span className="text-accent">DJ</span>
          </Link>
          <h1 className="mt-4 font-display text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-textdim">Log in to your DJ booth.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-surface p-6"
        >
          {justRegistered && (
            <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accentglow">
              Account created. Log in to continue.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <label className="mb-1 block text-xs font-medium text-textdim">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-border bg-surface2 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            placeholder="you@example.com"
          />

          <label className="mb-1 block text-xs font-medium text-textdim">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-lg border border-border bg-surface2 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            placeholder="Your password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accentglow disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-textdim">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
