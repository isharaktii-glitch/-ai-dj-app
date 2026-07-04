import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiGenerationJobs, tracks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getJobStatus } from "@/lib/ai-music";
import { put } from "@vercel/blob";

/**
 * This route can be called two ways:
 * 1. As a webhook target configured on the AI provider dashboard (POST with providerJobId).
 * 2. Manually / via a cron job that polls all "processing" jobs and checks their status.
 *
 * POST body: { providerJobId: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const providerJobId = body.providerJobId || body.jobId || body.id;

    if (!providerJobId) {
      return NextResponse.json(
        { error: "providerJobId is required." },
        { status: 400 }
      );
    }

    const jobResult = await db
      .select()
      .from(aiGenerationJobs)
      .where(eq(aiGenerationJobs.providerJobId, providerJobId))
      .limit(1);

    const job = jobResult[0];
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (job.status === "completed") {
      return NextResponse.json({ success: true, message: "Already completed." });
    }

    const statusResult = await getJobStatus(providerJobId);

    if (statusResult.status === "failed") {
      await db
        .update(aiGenerationJobs)
        .set({
          status: "failed",
          errorMessage: statusResult.errorMessage || "Generation failed.",
          completedAt: new Date(),
        })
        .where(eq(aiGenerationJobs.id, job.id));

      if (job.sourceTrackId) {
        await db
          .update(tracks)
          .set({ matchStatus: "failed" })
          .where(eq(tracks.id, job.sourceTrackId));
      }

      return NextResponse.json({ success: true, status: "failed" });
    }

    if (statusResult.status !== "completed" || !statusResult.audioUrl) {
      // Still processing — nothing to do yet
      return NextResponse.json({ success: true, status: statusResult.status });
    }

    // Download the generated audio and re-host it on our own Blob storage
    const audioRes = await fetch(statusResult.audioUrl);
    if (!audioRes.ok) {
      throw new Error("Could not download generated audio from provider.");
    }
    const audioBlob = await audioRes.blob();

    const blob = await put(
      `tracks/${job.userId}/ai-${Date.now()}.mp3`,
      audioBlob,
      { access: "public", addRandomSuffix: true }
    );

    const [newTrack] = await db
      .insert(tracks)
      .values({
        userId: job.userId,
        title:
          job.kind === "match"
            ? "AI Matched Track"
            : "AI Generated Track",
        type: "song",
        source: job.kind === "match" ? "ai_matched" : "ai_standalone",
        fileUrl: blob.url,
        durationSeconds: statusResult.durationSeconds,
        matchedTrackId: job.sourceTrackId || null,
        matchStatus: "none",
      })
      .returning();

    await db
      .update(aiGenerationJobs)
      .set({
        status: "completed",
        resultTrackId: newTrack.id,
        completedAt: new Date(),
      })
      .where(eq(aiGenerationJobs.id, job.id));

    if (job.sourceTrackId) {
      await db
        .update(tracks)
        .set({
          matchStatus: "completed",
          matchedTrackId: newTrack.id,
        })
        .where(eq(tracks.id, job.sourceTrackId));
    }

    return NextResponse.json({ success: true, status: "completed", track: newTrack });
  } catch (err) {
    console.error("AI webhook error:", err);
    return NextResponse.json(
      { error: "Failed to process AI generation result." },
      { status: 500 }
    );
  }
}

/**
 * GET: polls all currently-processing jobs and advances any that are done.
 * Call this from a Vercel Cron job every 1-2 minutes.
 */
export async function GET() {
  const processingJobs = await db
    .select()
    .from(aiGenerationJobs)
    .where(eq(aiGenerationJobs.status, "processing"));

  const results = [];

  for (const job of processingJobs) {
    if (!job.providerJobId) continue;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/webhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerJobId: job.providerJobId }),
        }
      );
      results.push({ jobId: job.id, ok: res.ok });
    } catch (err) {
      results.push({ jobId: job.id, ok: false });
    }
  }

  return NextResponse.json({ checked: results.length, results });
}
