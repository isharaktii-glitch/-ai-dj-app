import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { djSessions, tracks, sessionTracks } from "@/lib/db/schema";
import { checkLimit, logUsage } from "@/lib/limits";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// POST: start a new DJ session (checks play-time limit first)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = session.user.id;

  const limitCheck = await checkLimit(
    userId,
    "playTimeLimitMins",
    "play_time"
  );
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error:
          limitCheck.reason ||
          `Play time limit reached (${limitCheck.used}/${limitCheck.limit} mins) for this month. Upgrade your package for more.`,
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "manual" ? "manual" : "auto";

  const [newSession] = await db
    .insert(djSessions)
    .values({ userId, mode })
    .returning();

  return NextResponse.json({ success: true, session: newSession });
}

// PATCH: end a session and log its play time; body: { sessionId, playTimeMins }
const patchSchema = z.object({
  sessionId: z.string().uuid(),
  playTimeMins: z.number().min(0).max(1440),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session data." }, { status: 400 });
  }

  const { sessionId, playTimeMins } = parsed.data;

  const updated = await db
    .update(djSessions)
    .set({
      endedAt: new Date(),
      totalPlayTimeMins: playTimeMins,
    })
    .where(
      and(eq(djSessions.id, sessionId), eq(djSessions.userId, session.user.id))
    )
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  await logUsage(session.user.id, "play_time", playTimeMins);

  return NextResponse.json({ success: true, session: updated[0] });
}

// GET: fetch the user's own tracks that are eligible for playback (used by the player)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userTracks = await db
    .select()
    .from(tracks)
    .where(eq(tracks.userId, session.user.id));

  return NextResponse.json({ tracks: userTracks });
}
