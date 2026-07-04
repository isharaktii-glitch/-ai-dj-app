import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGenerationJobs } from "@/lib/db/schema";
import { checkLimit, logUsage } from "@/lib/limits";
import { generateTrack } from "@/lib/ai-music";
import { eq } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().min(3).max(500),
  instrumental: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = session.user.id;

  const limitCheck = await checkLimit(
    userId,
    "aiStandaloneLimit",
    "ai_standalone"
  );
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error:
          limitCheck.reason ||
          `AI generation limit reached (${limitCheck.used}/${limitCheck.limit}) for this month. Upgrade your package for more.`,
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please provide a valid prompt (3-500 characters)." },
        { status: 400 }
      );
    }

    const { prompt, instrumental } = parsed.data;

    const [job] = await db
      .insert(aiGenerationJobs)
      .values({
        userId,
        kind: "standalone",
        prompt,
        status: "pending",
      })
      .returning();

    try {
      const { providerJobId } = await generateTrack({
        prompt,
        instrumental: instrumental ?? true,
      });

      await db
        .update(aiGenerationJobs)
        .set({ status: "processing", providerJobId })
        .where(eq(aiGenerationJobs.id, job.id));
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

      return NextResponse.json(
        { error: "Failed to start AI generation. Please try again shortly." },
        { status: 502 }
      );
    }

    await logUsage(userId, "ai_standalone", 1);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message:
        "Generation started. Your track will appear in your library once ready.",
    });
  } catch (err) {
    console.error("Standalone AI generation error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
