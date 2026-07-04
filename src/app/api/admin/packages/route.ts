import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { z } from "zod";

const packageSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priceMonthlyCents: z.number().int().min(0),
  uploadLimit: z.number().int().min(-1),
  aiMatchLimit: z.number().int().min(-1),
  aiStandaloneLimit: z.number().int().min(-1),
  playTimeLimitMins: z.number().int().min(-1),
  aiBiasPercent: z.number().int().min(0).max(100),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// GET: list all packages (public — used by pricing displays too)
export async function GET() {
  const allPackages = await db
    .select()
    .from(packages)
    .orderBy(asc(packages.sortOrder));

  return NextResponse.json({ packages: allPackages });
}

// POST: create a new package (admin only)
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = packageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid package data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [newPackage] = await db
      .insert(packages)
      .values(parsed.data)
      .returning();

    return NextResponse.json({ success: true, package: newPackage });
  } catch (err) {
    console.error("Create package error:", err);
    return NextResponse.json(
      { error: "Failed to create package." },
      { status: 500 }
    );
  }
}
