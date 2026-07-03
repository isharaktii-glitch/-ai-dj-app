import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, packages, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Check name, email, and password (min 6 chars)." },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // First-ever registered user automatically becomes admin
    const userCount = await db.select().from(users).limit(1);
    const role = userCount.length === 0 ? "admin" : "user";

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: normalizedEmail,
        passwordHash,
        role,
      })
      .returning();

    // Auto-assign the default (lowest sortOrder) active package, if one exists
    const defaultPackage = await db
      .select()
      .from(packages)
      .where(eq(packages.isActive, true))
      .orderBy(packages.sortOrder)
      .limit(1);

    if (defaultPackage[0]) {
      await db.insert(subscriptions).values({
        userId: newUser.id,
        packageId: defaultPackage[0].id,
        status: "active",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Account created. You can now log in.",
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
