import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPackage, getUsage } from "@/lib/limits";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = session.user.id;
  const pkg = await getUserPackage(userId);

  if (!pkg) {
    return NextResponse.json({ error: "No active package." }, { status: 404 });
  }

  const uploadedResult = await db
    .select({ total: count() })
    .from(tracks)
    .where(and(eq(tracks.userId, userId), eq(tracks.source, "uploaded")));
  const uploadsUsed = Number(uploadedResult[0]?.total ?? 0);

  const aiMatchUsed = await getUsage(userId, "ai_match");
  const aiStandaloneUsed = await getUsage(userId, "ai_standalone");
  const playTimeUsed = await getUsage(userId, "play_time");

  return NextResponse.json({
    package: pkg,
    usage: {
      uploads: { used: uploadsUsed, limit: pkg.uploadLimit },
      aiMatch: { used: aiMatchUsed, limit: pkg.aiMatchLimit },
      aiStandalone: { used: aiStandaloneUsed, limit: pkg.aiStandaloneLimit },
      playTime: { used: Math.round(playTimeUsed), limit: pkg.playTimeLimitMins },
    },
  });
}
