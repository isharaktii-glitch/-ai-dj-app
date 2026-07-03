import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET: list current user's tracks
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userTracks = await db
    .select()
    .from(tracks)
    .where(eq(tracks.userId, session.user.id))
    .orderBy(desc(tracks.createdAt));

  return NextResponse.json({ tracks: userTracks });
}
</parameter>
