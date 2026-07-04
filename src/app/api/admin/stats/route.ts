import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  users,
  tracks,
  djSessions,
  subscriptions,
  packages,
} from "@/lib/db/schema";
import { eq, count, sum } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const totalUsersResult = await db.select({ total: count() }).from(users);
  const totalTracksResult = await db.select({ total: count() }).from(tracks);
  const totalSessionsResult = await db
    .select({ total: count() })
    .from(djSessions);
  const totalPlayMinutesResult = await db
    .select({ total: sum(djSessions.totalPlayTimeMins) })
    .from(djSessions);

  // Revenue = sum of active subscriptions' package price
  const activeSubsWithPackage = await db
    .select({ price: packages.priceMonthlyCents })
    .from(subscriptions)
    .innerJoin(packages, eq(subscriptions.packageId, packages.id))
    .where(eq(subscriptions.status, "active"));

  const monthlyRevenueCents = activeSubsWithPackage.reduce(
    (sum, row) => sum + row.price,
    0
  );

  const activeSubsCountResult = await db
    .select({ total: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  return NextResponse.json({
    totalUsers: Number(totalUsersResult[0]?.total ?? 0),
    totalTracks: Number(totalTracksResult[0]?.total ?? 0),
    totalSessions: Number(totalSessionsResult[0]?.total ?? 0),
    totalPlayMinutes: Math.round(
      Number(totalPlayMinutesResult[0]?.total ?? 0)
    ),
    activeSubscriptions: Number(activeSubsCountResult[0]?.total ?? 0),
    monthlyRevenueCents,
  });
}
