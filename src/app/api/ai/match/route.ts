import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tracks, aiGenerationJobs } from "@/lib/db/schema";
import { checkLimit, logUsage } from "@/lib/limits";
import { generateTrack, buildMatchPrompt } from "@/lib/ai-music";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  sourceTrackId: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = session.user.id;

  const limitCheck = await checkLimit(userId, "aiMatchLimit", "ai_match");
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error:
          limitCheck.reason ||
          `AI match limit reached (${limitCheck.used}/${limitCheck.limit}) for this month. Upgrade your package for more.`,
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid sourceTrackId is required." },
        { status: 400 }
      );
    }

    const { sourceTrackId } = parsed.data;

    const sourceResult = await db
      .select()
      .from(tracks)
      .where(and(eq(tracks.id, sourceTrackId), eq(tracks.userId, userId)))
      .limit(1);

    const sourceTrack = sourceResult[0];
    if (!sourceTrack) {
      return NextResponse.json(
        { error: "Source track not found or not owned by you." },
        { status: 404 }
      );
    }

    if (sourceTrack.matchStatus === "pending" || sourceTrack.matchStatus === "generating") {
      return NextResponse.json(
        { error: "A matching track is already being generated for this song." },
        { status: 409 }
      );
    }

    const prompt = buildMatchPrompt({
      bpm: sourceTrack.bpm,
      musicalKey: sourceTrack.musicalKey,
      energyLevel: sourceTrack.energyLevel,
      genreTags: sourceTrack.genreTags,
      type: sourceTrack.type,
    });

    const [job] = await db
      .insert(aiGenerationJobs)
      .values({
        userId,
        sourceTrackId: sourceTrack.id,
        kind: "match",
        prompt,
        status: "pending",
      })
      .returning();

    await db
      .update(tracks)
      .set({ matchStatus: "pending" })
      .where(eq(tracks.id, sourceTrack.id));

    try {
      const { providerJobId } = await generateTrack({
        prompt,
        instrumental: true,
      });

      await db
        .update(aiGenerationJobs)
        .set({ status: "processing", providerJobId })
        .where(eq(aiGenerationJobs.id, job.id));

      await db
        .update(tracks)
        .set({ matchStatus: "generating" })
        .where(eq(tracks.id, sourceTrack.id));
    } catch (providerErr) {
      console.error("AI provider call failed:", providerErr);

      await db
        .update(aiGenerationJobs)
        .set({
          status: "failed",
          errorMessage:
            providerErr instanceof Error
              ? providerErr.message
              : "Unknown provider error",
        })
        .where(eq(aiGenerationJobs.id, job.id));

      await db
        .update(tracks)
        .set({ matchStatus: "failed" })
        .where(eq(tracks.id, sourceTrack.id));

      return NextResponse.json(
        { error: "Failed to start AI matching. Please try again shortly." },
        { status: 502 }
      );
    }

    await logUsage(userId, "ai_match", 1);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Matching track generation started.",
    });
  } catch (err) {
    console.error("AI match error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
