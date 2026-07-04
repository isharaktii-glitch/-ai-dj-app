import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessionTracks, djSessions, tracks } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  trackId: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "sessionId and trackId are required." },
        { status: 400 }
      );
    }

    const { sessionId, trackId } = parsed.data;

    // Ensure the session belongs to this user
    const sessionRow = await db
      .select()
      .from(djSessions)
      .where(
        and(eq(djSessions.id, sessionId), eq(djSessions.userId, session.user.id))
      )
      .limit(1);

    if (sessionRow.length === 0) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Determine the next order index for this session
    const existingCount = await db
      .select({ total: count() })
      .from(sessionTracks)
      .where(eq(sessionTracks.sessionId, sessionId));

    const orderIndex = Number(existingCount[0]?.total ?? 0);

    const [entry] = await db
      .insert(sessionTracks)
      .values({ sessionId, trackId, orderIndex })
      .returning();

    // Increment the track's play count
    await db
      .update(tracks)
      .set({ playCount: sessionRow[0] ? undefined : undefined })
      .where(eq(tracks.id, trackId));

    const trackRow = await db
      .select()
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (trackRow[0]) {
      await db
        .update(tracks)
        .set({ playCount: trackRow[0].playCount + 1 })
        .where(eq(tracks.id, trackId));
    }

    return NextResponse.json({ success: true, entry });
  } catch (err) {
    console.error("Log track error:", err);
    return NextResponse.json(
      { error: "Failed to log track play." },
      { status: 500 }
    );
  }
}
