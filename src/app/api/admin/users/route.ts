import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  users,
  subscriptions,
  packages,
  tracks,
  djSessions,
} from "@/lib/db/schema";
import { eq, and, count, sum, desc } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // For each user, attach their active package + basic usage stats.
  // (Fine at small/medium scale; could be optimized with joins later.)
  const enriched = await Promise.all(
    allUsers.map(async (u) => {
      const subResult = await db
        .select({ pkg: packages })
        .from(subscriptions)
        .innerJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(
          and(eq(subscriptions.userId, u.id), eq(subscriptions.status, "active"))
        )
        .limit(1);

      const trackCountResult = await db
        .select({ total: count() })
        .from(tracks)
        .where(eq(tracks.userId, u.id));

      const sessionStatsResult = await db
        .select({
          totalSessions: count(),
          totalMinutes: sum(djSessions.totalPlayTimeMins),
        })
        .from(djSessions)
        .where(eq(djSessions.userId, u.id));

      return {
        ...u,
        package: subResult[0]?.pkg ?? null,
        trackCount: Number(trackCountResult[0]?.total ?? 0),
        totalSessions: Number(sessionStatsResult[0]?.totalSessions ?? 0),
        totalPlayMinutes: Math.round(
          Number(sessionStatsResult[0]?.totalMinutes ?? 0)
        ),
      };
    })
  );

  return NextResponse.json({ users: enriched });
}
