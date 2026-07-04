import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const assignSchema = z.object({
  packageId: z.string().uuid(),
});

// PATCH: change a user's active package (admin only)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid packageId is required." },
        { status: 400 }
      );
    }

    const { packageId } = parsed.data;

    // Cancel any existing active subscription for this user
    await db
      .update(subscriptions)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(
        and(
          eq(subscriptions.userId, params.id),
          eq(subscriptions.status, "active")
        )
      );

    const [newSub] = await db
      .insert(subscriptions)
      .values({
        userId: params.id,
        packageId,
        status: "active",
      })
      .returning();

    return NextResponse.json({ success: true, subscription: newSub });
  } catch (err) {
    console.error("Assign package error:", err);
    return NextResponse.json(
      { error: "Failed to assign package." },
      { status: 500 }
    );
  }
}
