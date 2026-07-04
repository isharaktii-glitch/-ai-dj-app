"use client";

import { useState } from "react";
import type { AdminPackage } from "./PackageEditor";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  package: AdminPackage | null;
  trackCount: number;
  totalSessions: number;
  totalPlayMinutes: number;
}

export default function UserTable({
  users,
  packages,
  onChanged,
}: {
  users: AdminUser[];
  packages: AdminPackage[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAssign(userId: string, packageId: string) {
    setBusyId(userId);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });
    setBusyId(null);
    onChanged();
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-textdim">
        No users yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-text">{u.name}</h4>
                {u.role === "admin" && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accentglow">
                    Admin
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-textdim">{u.email}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-textdim">
            <span>{u.trackCount} tracks</span>
            <span>{u.totalSessions} sessions</span>
            <span>{u.totalPlayMinutes} min played</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <select
              value={u.package?.id || ""}
              disabled={busyId === u.id}
              onChange={(e) => handleAssign(u.id, e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-xs text-text outline-none focus:border-accent"
            >
              <option value="" disabled>
                No package
              </option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — ${(pkg.priceMonthlyCents / 100).toFixed(2)}/mo
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
