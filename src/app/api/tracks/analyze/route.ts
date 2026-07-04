import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  trackId: z.string().uuid(),
  bpm: z.number().min(20).max(300),
  energyLevel: z.number().min(0).max(1),
  durationSeconds: z.number().min(0),
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
        { error: "Invalid analysis data provided." },
        { status: 400 }
      );
    }

    const { trackId, bpm, energyLevel, durationSeconds } = parsed.data;

    const updated = await db
      .update(tracks)
      .set({ bpm, energyLevel, durationSeconds })
      .where(and(eq(tracks.id, trackId), eq(tracks.userId, session.user.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Track not found or not owned by you." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, track: updated[0] });
  } catch (err) {
    console.error("Analyze save error:", err);
    return NextResponse.json(
      { error: "Failed to save analysis." },
      { status: 500 }
    );
  }
}
