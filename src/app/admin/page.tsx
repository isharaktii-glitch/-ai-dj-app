"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import StatsOverview from "@/components/admin/StatsOverview";
import PackageEditor, { AdminPackage } from "@/components/admin/PackageEditor";
import PackageList from "@/components/admin/PackageList";
import UserTable from "@/components/admin/UserTable";

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

interface Stats {
  totalUsers: number;
  totalTracks: number;
  totalSessions: number;
  totalPlayMinutes: number;
  activeSubscriptions: number;
  monthlyRevenueCents: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<"overview" | "packages" | "users">(
    "overview"
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editingPackage, setEditingPackage] = useState<AdminPackage | null>(
    null
  );
  const [showEditor, setShowEditor] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadAll = useCallback(async () => {
    const [statsRes, packagesRes, usersRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/packages"),
      fetch("/api/admin/users"),
    ]);

    if (statsRes.status === 403 || usersRes.status === 403) {
      setUnauthorized(true);
      return;
    }

    const statsData = await statsRes.json();
    const packagesData = await packagesRes.json();
    const usersData = await usersRes.json();

    if (statsRes.ok) setStats(statsData);
    if (packagesRes.ok) setPackages(packagesData.packages);
    if (usersRes.ok) setUsers(usersData.users);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      loadAll();
    }
  }, [status, router, loadAll]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-textdim">
        Loading…
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <p className="text-text">You don&apos;t have admin access.</p>
        <Link href="/dashboard" className="text-accent hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold">
            AURA<span className="text-accent">DJ</span>{" "}
            <span className="text-textdim">/ Admin</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-textdim hover:text-text"
          >
            Back to app
          </Link>
        </header>

        <div className="mb-6 flex gap-2 overflow-x-auto">
          {(["overview", "packages", "users"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t
                  ? "bg-accent text-white"
                  : "border border-border text-textdim hover:border-accent/50"
              }`}
            >
              {t === "overview"
                ? "Overview"
                : t === "packages"
                ? "Packages"
                : "Users"}
            </button>
          ))}
        </div>

        {tab === "overview" && stats && <StatsOverview stats={stats} />}

        {tab === "packages" && (
          <div className="space-y-4">
            {!showEditor && (
              <button
                onClick={() => {
                  setEditingPackage(null);
                  setShowEditor(true);
                }}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accentglow"
              >
                + New package
              </button>
            )}

            {showEditor && (
              <PackageEditor
                editing={editingPackage}
                onSaved={() => {
                  setShowEditor(false);
                  setEditingPackage(null);
                  loadAll();
                }}
                onCancel={() => {
                  setShowEditor(false);
                  setEditingPackage(null);
                }}
              />
            )}

            <PackageList
              packages={packages}
              onEdit={(pkg) => {
                setEditingPackage(pkg);
                setShowEditor(true);
              }}
              onDeleted={loadAll}
            />
          </div>
        )}

        {tab === "users" && (
          <UserTable users={users} packages={packages} onChanged={loadAll} />
        )}
      </div>
    </main>
  );
}
