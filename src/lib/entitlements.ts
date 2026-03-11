import type { TSubscriptionTier } from "@/db/schema";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const FREE_TIER_HABIT_LIMIT = 5;
export const FREE_TIER_ANALYTICS_RANGE_DAYS = 7;

export interface ISubscriptionEntitlements {
    tier: TSubscriptionTier;
    maxActiveHabits: number | null;
    maxAnalyticsRangeDays: number | null;
    canExport: boolean;
    canUseReminders: boolean;
    canUsePremiumTemplates: boolean;
}

function isSubscriptionTier(value: string): value is TSubscriptionTier {
    return value === "free" || value === "pro" || value === "lifetime";
}

export function normalizeSubscriptionTier(
    tier: string | null | undefined,
): TSubscriptionTier {
    if (!tier) return "free";
    return isSubscriptionTier(tier) ? tier : "free";
}

export function getUserSubscriptionTier(user: unknown): TSubscriptionTier {
    if (!user || typeof user !== "object") {
        return "free";
    }

    const subscriptionTier = Reflect.get(user, "subscriptionTier");

    return typeof subscriptionTier === "string"
        ? normalizeSubscriptionTier(subscriptionTier)
        : "free";
}

export function getEntitlementsForTier(
    tier: string | null | undefined,
): ISubscriptionEntitlements {
    const normalizedTier = normalizeSubscriptionTier(tier);

    if (normalizedTier === "free") {
        return {
            tier: normalizedTier,
            maxActiveHabits: FREE_TIER_HABIT_LIMIT,
            maxAnalyticsRangeDays: FREE_TIER_ANALYTICS_RANGE_DAYS,
            canExport: false,
            canUseReminders: false,
            canUsePremiumTemplates: false,
        };
    }

    return {
        tier: normalizedTier,
        maxActiveHabits: null,
        maxAnalyticsRangeDays: null,
        canExport: true,
        canUseReminders: true,
        canUsePremiumTemplates: true,
    };
}

export function getUserEntitlements(user: unknown): ISubscriptionEntitlements {
    return getEntitlementsForTier(getUserSubscriptionTier(user));
}

export function canAccessAnalyticsRange(
    tier: string | null | undefined,
    requestedRangeDays: number,
): boolean {
    const { maxAnalyticsRangeDays } = getEntitlementsForTier(tier);

    if (maxAnalyticsRangeDays === null) {
        return true;
    }

    return requestedRangeDays <= maxAnalyticsRangeDays;
}

type TDatabase = typeof import("@/db").db;

export async function getSubscriptionTierForUserId(
    db: TDatabase,
    userId: string,
): Promise<TSubscriptionTier> {
    const [user] = await db
        .select({ subscriptionTier: users.subscriptionTier })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    return normalizeSubscriptionTier(user?.subscriptionTier);
}

export async function getEntitlementsForUserId(
    db: TDatabase,
    userId: string,
): Promise<ISubscriptionEntitlements> {
    const tier = await getSubscriptionTierForUserId(db, userId);

    return getEntitlementsForTier(tier);
}
