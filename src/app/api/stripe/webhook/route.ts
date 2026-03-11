import { db } from "@/db";
import { users } from "@/db/schema";
import { logLifecycleEvent } from "@/lib/lifecycle";
import {
    getBillingPlan,
    getStripe,
    getStripeWebhookSecret,
} from "@/lib/stripe";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

function getSubscriptionTierForStatus(
    status: Stripe.Subscription.Status,
): "free" | "pro" {
    switch (status) {
        case "active":
        case "trialing":
        case "past_due":
            return "pro";
        default:
            return "free";
    }
}

async function updateUserCustomerLink(userId: string, customerId: string) {
    await db
        .update(users)
        .set({
            stripeCustomerId: customerId,
        })
        .where(eq(users.id, userId));
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId ?? session.client_reference_id;
    const customerId =
        typeof session.customer === "string" ? session.customer : null;

    if (!userId) {
        return;
    }

    if (customerId) {
        await updateUserCustomerLink(userId, customerId);
    }

    if (session.mode !== "payment") {
        return;
    }

    const plan = getBillingPlan(session.metadata?.plan ?? "");

    if (!plan || plan.tier !== "lifetime") {
        return;
    }

    await db
        .update(users)
        .set({
            subscriptionTier: "lifetime",
            stripeSubscriptionId: null,
            subscriptionEndsAt: null,
        })
        .where(eq(users.id, userId));

    await logLifecycleEvent(db, userId, "checkout_succeeded", {
        plan: plan.id,
        tier: plan.tier,
    });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId =
        typeof subscription.customer === "string"
            ? subscription.customer
            : null;

    if (!customerId) {
        return;
    }

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

    if (!user) {
        return;
    }

    if (user.subscriptionTier === "lifetime") {
        return;
    }

    const nextTier = getSubscriptionTierForStatus(subscription.status);
    const periodEndUnix = subscription.items.data.reduce<number | null>(
        (latestPeriodEnd, item) => {
            if (latestPeriodEnd === null) {
                return item.current_period_end;
            }

            return Math.max(latestPeriodEnd, item.current_period_end);
        },
        null,
    );

    await db
        .update(users)
        .set({
            subscriptionTier: nextTier,
            stripeSubscriptionId: nextTier === "pro" ? subscription.id : null,
            subscriptionEndsAt:
                nextTier === "pro" && periodEndUnix !== null
                    ? new Date(periodEndUnix * 1000)
                    : null,
        })
        .where(eq(users.id, user.id));

    if (nextTier === "pro") {
        await logLifecycleEvent(db, user.id, "checkout_succeeded", {
            plan: "pro",
            tier: nextTier,
            status: subscription.status,
        });
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId =
        typeof subscription.customer === "string"
            ? subscription.customer
            : null;

    if (!customerId) {
        return;
    }

    const [user] = await db
        .select()
        .from(users)
        .where(
            and(
                eq(users.stripeCustomerId, customerId),
                eq(users.subscriptionTier, "pro"),
            ),
        )
        .limit(1);

    if (!user) {
        return;
    }

    await db
        .update(users)
        .set({
            subscriptionTier: "free",
            stripeSubscriptionId: null,
            subscriptionEndsAt: null,
        })
        .where(eq(users.id, user.id));
}

export async function POST(request: Request) {
    try {
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
            return NextResponse.json(
                { error: "Missing Stripe signature." },
                { status: 400 },
            );
        }

        const rawBody = await request.text();
        const stripe = getStripe();
        const event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            getStripeWebhookSecret(),
        );

        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutCompleted(
                    event.data.object as Stripe.Checkout.Session,
                );
                break;
            case "customer.subscription.created":
            case "customer.subscription.updated":
                await handleSubscriptionUpdated(
                    event.data.object as Stripe.Subscription,
                );
                break;
            case "customer.subscription.deleted":
                await handleSubscriptionDeleted(
                    event.data.object as Stripe.Subscription,
                );
                break;
            default:
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Stripe webhook error", error);

        return NextResponse.json(
            { error: "Webhook handling failed." },
            { status: 400 },
        );
    }
}
