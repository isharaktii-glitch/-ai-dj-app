import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

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

// DELETE: remove a track the user owns (?id=trackId)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Track id required." }, { status: 400 });
  }

  const deleted = await db
    .delete(tracks)
    .where(and(eq(tracks.id, id), eq(tracks.userId, session.user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "Track not found or not owned by you." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
