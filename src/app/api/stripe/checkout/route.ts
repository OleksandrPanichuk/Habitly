import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { logLifecycleEvent } from "@/lib/lifecycle";
import {
    getAppUrl,
    getBillingPlan,
    getBillingPriceId,
    getStripe,
} from "@/lib/stripe";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface ICheckoutRequestBody {
    plan?: string;
}

async function getOrCreateStripeCustomer(user: typeof users.$inferSelect) {
    if (user.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    const stripe = getStripe();
    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
            userId: user.id,
        },
    });

    await db
        .update(users)
        .set({
            stripeCustomerId: customer.id,
        })
        .where(eq(users.id, user.id));

    return customer.id;
}

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const body = (await request.json()) as ICheckoutRequestBody;
        const plan = getBillingPlan(body.plan ?? "");

        if (!plan) {
            return NextResponse.json(
                { error: "Invalid plan." },
                { status: 400 },
            );
        }

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { error: "User not found." },
                { status: 404 },
            );
        }

        if (user.subscriptionTier === plan.tier) {
            return NextResponse.json(
                { error: `You are already on the ${plan.tier} plan.` },
                { status: 409 },
            );
        }

        if (user.subscriptionTier === "lifetime") {
            return NextResponse.json(
                {
                    error: "You already have Lifetime access. No further purchase is required.",
                },
                { status: 409 },
            );
        }

        const stripe = getStripe();
        const customerId = await getOrCreateStripeCustomer(user);
        const appUrl = getAppUrl();

        await logLifecycleEvent(db, user.id, "checkout_started", {
            plan: plan.id,
            tier: plan.tier,
        });

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: plan.mode,
            customer: customerId,
            line_items: [
                {
                    price: getBillingPriceId(plan),
                    quantity: 1,
                },
            ],
            success_url: `${appUrl}/settings?checkout=success`,
            cancel_url: `${appUrl}/#pricing`,
            allow_promotion_codes: true,
            client_reference_id: user.id,
            metadata: {
                userId: user.id,
                plan: plan.id,
                tier: plan.tier,
            },
            subscription_data:
                plan.mode === "subscription"
                    ? {
                          metadata: {
                              userId: user.id,
                              plan: plan.id,
                              tier: plan.tier,
                          },
                      }
                    : undefined,
        });

        if (!checkoutSession.url) {
            return NextResponse.json(
                { error: "Failed to create checkout session." },
                { status: 500 },
            );
        }

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error("Stripe checkout error", error);

        return NextResponse.json(
            { error: "Unable to start checkout right now." },
            { status: 500 },
        );
    }
}
