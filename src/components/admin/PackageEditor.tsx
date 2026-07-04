"use client";

import { useState } from "react";

export interface AdminPackage {
  id: string;
  name: string;
  description: string | null;
  priceMonthlyCents: number;
  uploadLimit: number;
  aiMatchLimit: number;
  aiStandaloneLimit: number;
  playTimeLimitMins: number;
  aiBiasPercent: number;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm = {
  name: "",
  description: "",
  priceMonthlyCents: 0,
  uploadLimit: 10,
  aiMatchLimit: 0,
  aiStandaloneLimit: 0,
  playTimeLimitMins: 60,
  aiBiasPercent: 30,
  sortOrder: 0,
};

export default function PackageEditor({
  editing,
  onSaved,
  onCancel,
}: {
  editing: AdminPackage | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(
    editing
      ? {
          name: editing.name,
          description: editing.description || "",
          priceMonthlyCents: editing.priceMonthlyCents,
          uploadLimit: editing.uploadLimit,
          aiMatchLimit: editing.aiMatchLimit,
          aiStandaloneLimit: editing.aiStandaloneLimit,
          playTimeLimitMins: editing.playTimeLimitMins,
          aiBiasPercent: editing.aiBiasPercent,
          sortOrder: editing.sortOrder,
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function numField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value === "" ? 0 : Number(value) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const url = editing
      ? `/api/admin/packages/${editing.id}`
      : "/api/admin/packages";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Failed to save package.");
      return;
    }

    onSaved();
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-surface p-5">
      <h3 className="font-display text-sm font-semibold text-text">
        {editing ? `Edit "${editing.name}"` : "New package"}
      </h3>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs text-textdim">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="e.g. Pro"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs text-textdim">
            Description
          </label>
          <input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Short description shown to users"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-textdim">
            Price (cents/mo)
          </label>
          <input
            type="number"
            value={form.priceMonthlyCents}
            onChange={(e) => numField("priceMonthlyCents", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-textdim">
            Sort order
          </label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => numField("sortOrder", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-textdim">
            Upload limit (-1 = ∞)
          </label>
          <input
            type="number"
            value={form.uploadLimit}
            onChange={(e) => numField("uploadLimit", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-textdim">
            Play time / mo (min, -1 = ∞)
          </label>
          <input
            type="number"
            value={form.playTimeLimitMins}
            onChange={(e) => numField("playTimeLimitMins", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-textdim">
            AI matches / mo (-1 = ∞)
          </label>
          <input
            type="number"
            value={form.aiMatchLimit}
            onChange={(e) => numField("aiMatchLimit", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-textdim">
            AI generations / mo (-1 = ∞)
          </label>
          <input
            type="number"
            value={form.aiStandaloneLimit}
            onChange={(e) => numField("aiStandaloneLimit", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs text-textdim">
            AI bias in auto-mix: {form.aiBiasPercent}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={form.aiBiasPercent}
            onChange={(e) => numField("aiBiasPercent", e.target.value)}
            className="range-slider w-full"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !form.name}
          className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accentglow disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save package"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-full border border-border px-5 py-2.5 text-sm text-textdim hover:text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
