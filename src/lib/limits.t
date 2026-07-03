import { db } from "@/lib/db";
import { subscriptions, packages, usageLogs, tracks } from "@/lib/db/schema";
import { eq, and, count, sum } from "drizzle-orm";

export function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUserPackage(userId: string) {
  const result = await db
    .select({ pkg: packages })
    .from(subscriptions)
    .innerJoin(packages, eq(subscriptions.packageId, packages.id))
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
    )
    .limit(1);

  return result[0]?.pkg ?? null;
}

export async function getUsage(userId: string, actionType: string) {
  const period = currentPeriodKey();
  const result = await db
    .select({ total: sum(usageLogs.amount) })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.actionType, actionType),
        eq(usageLogs.periodKey, period)
      )
    );
  return Number(result[0]?.total ?? 0);
}

export async function logUsage(
  userId: string,
  actionType: string,
  amount: number = 1
) {
  await db.insert(usageLogs).values({
    userId,
    actionType,
    amount,
    periodKey: currentPeriodKey(),
  });
}

/**
 * Checks whether a user can perform an action given their package limit.
 * limitField: "uploadLimit" | "aiMatchLimit" | "aiStandaloneLimit" | "playTimeLimitMins"
 * actionType: matching key used in usage_logs ("upload" | "ai_match" | "ai_standalone" | "play_time")
 * -1 on the package limit means unlimited.
 */
export async function checkLimit(
  userId: string,
  limitField: "uploadLimit" | "aiMatchLimit" | "aiStandaloneLimit" | "playTimeLimitMins",
  actionType: string
): Promise<{ allowed: boolean; used: number; limit: number; reason?: string }> {
  const pkg = await getUserPackage(userId);

  if (!pkg) {
    return { allowed: false, used: 0, limit: 0, reason: "No active package found." };
  }

  const limit = pkg[limitField] as number;

  if (limit === -1) {
    return { allowed: true, used: 0, limit: -1 };
  }

  // Upload limit is a total-owned check, not per-period
  if (limitField === "uploadLimit") {
    const result = await db
      .select({ total: count() })
      .from(tracks)
      .where(and(eq(tracks.userId, userId), eq(tracks.source, "uploaded")));
    const used = Number(result[0]?.total ?? 0);
    return {
      allowed: used < limit,
      used,
      limit,
      reason: used >= limit ? "Upload limit reached for your package." : undefined,
    };
  }

  const used = await getUsage(userId, actionType);
  return {
    allowed: used < limit,
    used,
    limit,
    reason: used >= limit ? "Monthly limit reached for your package." : undefined,
  };
}
