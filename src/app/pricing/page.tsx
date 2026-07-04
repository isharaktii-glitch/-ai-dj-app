"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Package {
  id: string;
  name: string;
  description: string | null;
  priceMonthlyCents: number;
  uploadLimit: number;
  aiMatchLimit: number;
  aiStandaloneLimit: number;
  playTimeLimitMins: number;
  isActive: boolean;
}

function limitLabel(value: number, suffix = "") {
  return value === -1 ? `Unlimited${suffix}` : `${value}${suffix}`;
}

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/packages")
      .then((r) => r.json())
      .then((d) => {
        if (d.packages) {
          setPackages(d.packages.filter((p: Package) => p.isActive));
        }
      });
  }, []);

  async function handleChoose(pkg: Package) {
    if (!session) {
      router.push("/register");
      return;
    }

    setError("");
    setLoadingId(pkg.id);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id }),
    });
    const data = await res.json();

    setLoadingId(null);

    if (!res.ok) {
      setError(data.error || "Could not start checkout.");
      return;
    }

    if (data.free) {
      router.push("/dashboard?upgraded=true");
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <Link href="/" className="font-display text-lg font-bold">
            AURA<span className="text-accent">DJ</span>
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold">
            Choose your plan
          </h1>
          <p className="mt-2 text-sm text-textdim">
            Upgrade anytime. Change or cancel whenever you like.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-6 max-w-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-6"
            >
              <h3 className="font-display text-lg font-bold text-text">
                {pkg.name}
              </h3>
              <p className="mt-1 text-xs text-textdim">{pkg.description}</p>

              <p className="mt-4 font-display text-3xl font-bold text-text">
                ${(pkg.priceMonthlyCents / 100).toFixed(0)}
                <span className="text-sm font-normal text-textdim">/mo</span>
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-textdim">
                <li>• {limitLabel(pkg.uploadLimit, " uploads")}</li>
                <li>• {limitLabel(pkg.aiMatchLimit, " AI matches/mo")}</li>
                <li>
                  • {limitLabel(pkg.aiStandaloneLimit, " AI generations/mo")}
                </li>
                <li>• {limitLabel(pkg.playTimeLimitMins, " min play/mo")}</li>
              </ul>

              <button
                onClick={() => handleChoose(pkg)}
                disabled={loadingId === pkg.id}
                className="mt-6 rounded-full bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accentglow disabled:opacity-50"
              >
                {loadingId === pkg.id ? "Loading…" : "Choose plan"}
              </button>
            </div>
          ))}
        </div>

        {packages.length === 0 && (
          <p className="mt-10 text-center text-sm text-textdim">
            No plans available yet. Check back soon.
          </p>
        )}
      </div>
    </main>
  );
}
