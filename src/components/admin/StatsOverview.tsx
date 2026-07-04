"use client";

interface Stats {
  totalUsers: number;
  totalTracks: number;
  totalSessions: number;
  totalPlayMinutes: number;
  activeSubscriptions: number;
  monthlyRevenueCents: number;
}

export default function StatsOverview({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Total users", value: stats.totalUsers.toLocaleString() },
    {
      label: "Monthly revenue",
      value: `$${(stats.monthlyRevenueCents / 100).toFixed(2)}`,
    },
    { label: "Active subscriptions", value: stats.activeSubscriptions },
    { label: "Total tracks", value: stats.totalTracks.toLocaleString() },
    { label: "DJ sessions", value: stats.totalSessions.toLocaleString() },
    {
      label: "Minutes played",
      value: stats.totalPlayMinutes.toLocaleString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-border bg-surface p-4"
        >
          <p className="text-xs text-textdim">{c.label}</p>
          <p className="mt-1 font-display text-xl font-bold text-text">
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
