import "server-only";

import type { TSubscriptionTier } from "@/db/schema";
import Stripe from "stripe";

export type TBillingPlanId = "pro" | "lifetime";

interface IBillingPlanConfig {
    id: TBillingPlanId;
    tier: Extract<TSubscriptionTier, "pro" | "lifetime">;
    mode: Stripe.Checkout.SessionCreateParams.Mode;
    priceEnvKey: "STRIPE_PRO_PRICE_ID" | "STRIPE_LIFETIME_PRICE_ID";
}

const BILLING_PLANS: Record<TBillingPlanId, IBillingPlanConfig> = {
    pro: {
        id: "pro",
        tier: "pro",
        mode: "subscription",
        priceEnvKey: "STRIPE_PRO_PRICE_ID",
    },
    lifetime: {
        id: "lifetime",
        tier: "lifetime",
        mode: "payment",
        priceEnvKey: "STRIPE_LIFETIME_PRICE_ID",
    },
};

let stripeClient: Stripe | null = null;

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export function getStripe(): Stripe {
    if (stripeClient) {
        return stripeClient;
    }

    stripeClient = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));

    return stripeClient;
}

export function getBillingPlan(planId: string): IBillingPlanConfig | null {
    if (planId === "pro" || planId === "lifetime") {
        return BILLING_PLANS[planId];
    }

    return null;
}

export function getBillingPriceId(plan: IBillingPlanConfig): string {
    return getRequiredEnv(plan.priceEnvKey);
}

export function getStripeWebhookSecret(): string {
    return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getAppUrl(): string {
    return (
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        "http://localhost:3000"
    );
}
