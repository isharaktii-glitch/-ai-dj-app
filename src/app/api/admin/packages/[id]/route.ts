import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  priceMonthlyCents: z.number().int().min(0).optional(),
  uploadLimit: z.number().int().min(-1).optional(),
  aiMatchLimit: z.number().int().min(-1).optional(),
  aiStandaloneLimit: z.number().int().min(-1).optional(),
  playTimeLimitMins: z.number().int().min(-1).optional(),
  aiBiasPercent: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// PATCH: update a package (admin only) — price, limits, everything editable
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
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await db
      .update(packages)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(packages.id, params.id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, package: updated[0] });
  } catch (err) {
    console.error("Update package error:", err);
    return NextResponse.json(
      { error: "Failed to update package." },
      { status: 500 }
    );
  }
}

// DELETE: remove a package (admin only)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const deleted = await db
    .delete(packages)
    .where(eq(packages.id, params.id))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
