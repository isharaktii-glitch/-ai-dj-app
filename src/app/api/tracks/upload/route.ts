import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { checkLimit, logUsage } from "@/lib/limits";

const ALLOWED_TYPES = ["song", "beat", "vocal", "guitar"];
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = session.user.id;

  // Enforce package upload limit
  const limitCheck = await checkLimit(userId, "uploadLimit", "upload");
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error:
          limitCheck.reason ||
          `Upload limit reached (${limitCheck.used}/${limitCheck.limit}). Upgrade your package to add more tracks.`,
      },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Untitled Track";
    const type = (formData.get("type") as string) || "song";

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid track type." }, { status: 400 });
    }

    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Only audio files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max size is 30MB." },
        { status: 400 }
      );
    }

    const blob = await put(
      `tracks/${userId}/${Date.now()}-${file.name}`,
      file,
      {
        access: "public",
        addRandomSuffix: true,
      }
    );

    const [newTrack] = await db
      .insert(tracks)
      .values({
        userId,
        title,
        type: type as "song" | "beat" | "vocal" | "guitar",
        source: "uploaded",
        fileUrl: blob.url,
        matchStatus: "none",
      })
      .returning();

    await logUsage(userId, "upload", 1);

    return NextResponse.json({ success: true, track: newTrack });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
