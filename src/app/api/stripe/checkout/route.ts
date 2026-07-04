import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { packages, subscriptions, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const requestSchema = z.object({
  packageId: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid packageId is required." },
        { status: 400 }
      );
    }

    const { packageId } = parsed.data;

    const pkgResult = await db
      .select()
      .from(packages)
      .where(eq(packages.id, packageId))
      .limit(1);
    const pkg = pkgResult[0];

    if (!pkg) {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }

    if (pkg.priceMonthlyCents === 0) {
      // Free package — assign directly, no Stripe needed
      await db
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(
          and(
            eq(subscriptions.userId, session.user.id),
            eq(subscriptions.status, "active")
          )
        );

      await db.insert(subscriptions).values({
        userId: session.user.id,
        packageId: pkg.id,
        status: "active",
      });

      return NextResponse.json({ success: true, free: true });
    }

    // Find or create a Stripe customer for this user
    const existingSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, session.user.id))
      .limit(1);

    let stripeCustomerId = existingSub[0]?.stripeCustomerId;

    if (!stripeCustomerId) {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      const user = userResult[0];

      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: session.user.id },
      });
      stripeCustomerId = customer.id;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "month" },
            unit_amount: pkg.priceMonthlyCents,
            product_data: {
              name: `AuraDJ — ${pkg.name}`,
              description: pkg.description || undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        packageId: pkg.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ success: true, url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to start checkout." },
      { status: 500 }
    );
  }
}
