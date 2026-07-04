"use client";

import { useEffect, useState } from "react";

interface UsageData {
  package: {
    name: string;
    priceMonthlyCents: number;
    aiBiasPercent: number;
  };
  usage: {
    uploads: { used: number; limit: number };
    aiMatch: { used: number; limit: number };
    aiStandalone: { used: number; limit: number };
    playTime: { used: number; limit: number };
  };
}

function formatLimit(used: number, limit: number, suffix = "") {
  if (limit === -1) return `${used}${suffix} / Unlimited`;
  return `${used}${suffix} / ${limit}${suffix}`;
}

function pct(used: number, limit: number) {
  if (limit === -1) return 8;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default function UsageStatus({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {});
  }, [refreshKey]);

  if (!data) return null;

  const rows = [
    { label: "Uploads", ...data.usage.uploads, suffix: "" },
    { label: "AI matches / mo", ...data.usage.aiMatch, suffix: "" },
    { label: "AI generations / mo", ...data.usage.aiStandalone, suffix: "" },
    { label: "Play time / mo", ...data.usage.playTime, suffix: " min" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-text">
          Your plan
        </h3>
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accentglow">
          {data.package.name}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-xs text-textdim">
              <span>{row.label}</span>
              <span>{formatLimit(row.used, row.limit, row.suffix)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${pct(row.used, row.limit)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
