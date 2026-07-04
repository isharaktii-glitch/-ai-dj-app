"use client";

import { useState } from "react";
import type { AdminPackage } from "./PackageEditor";

export default function PackageList({
  packages,
  onEdit,
  onDeleted,
}: {
  packages: AdminPackage[];
  onEdit: (pkg: AdminPackage) => void;
  onDeleted: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this package? Users on it will need reassigning.")) {
      return;
    }
    setBusyId(id);
    await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
    setBusyId(null);
    onDeleted();
  }

  async function toggleActive(pkg: AdminPackage) {
    setBusyId(pkg.id);
    await fetch(`/api/admin/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    setBusyId(null);
    onDeleted(); // reuse to trigger a refresh
  }

  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-textdim">
        No packages yet. Create your first one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display text-sm font-semibold text-text">
                  {pkg.name}
                </h4>
                {!pkg.isActive && (
                  <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-textdim">
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-textdim">{pkg.description}</p>
            </div>
            <span className="font-display text-sm font-bold text-accentglow">
              ${(pkg.priceMonthlyCents / 100).toFixed(2)}/mo
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-textdim sm:grid-cols-4">
            <span>Uploads: {pkg.uploadLimit === -1 ? "∞" : pkg.uploadLimit}</span>
            <span>
              AI match: {pkg.aiMatchLimit === -1 ? "∞" : pkg.aiMatchLimit}/mo
            </span>
            <span>
              AI gen: {pkg.aiStandaloneLimit === -1 ? "∞" : pkg.aiStandaloneLimit}
              /mo
            </span>
            <span>
              Play:{" "}
              {pkg.playTimeLimitMins === -1 ? "∞" : pkg.playTimeLimitMins}min/mo
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onEdit(pkg)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-text hover:border-accent/50"
            >
              Edit
            </button>
            <button
              onClick={() => toggleActive(pkg)}
              disabled={busyId === pkg.id}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-text hover:border-accent/50"
            >
              {pkg.isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => handleDelete(pkg.id)}
              disabled={busyId === pkg.id}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-textdim hover:border-red-500/50 hover:text-red-400"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
