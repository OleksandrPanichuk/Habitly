import { users } from "@/db/schema";
import { getEntitlementsForTier } from "@/lib/entitlements";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

export const billingRouter = createTRPCRouter({
    getStatus: protectedProcedure.query(async ({ ctx }) => {
        const [user] = await ctx.db
            .select({
                subscriptionTier: users.subscriptionTier,
                stripeCustomerId: users.stripeCustomerId,
                stripeSubscriptionId: users.stripeSubscriptionId,
                subscriptionEndsAt: users.subscriptionEndsAt,
            })
            .from(users)
            .where(eq(users.id, ctx.user.id))
            .limit(1);

        if (!user) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "User not found.",
            });
        }

        return {
            subscriptionTier: user.subscriptionTier,
            subscriptionEndsAt: user.subscriptionEndsAt,
            stripeSubscriptionId: user.stripeSubscriptionId,
            hasCustomerProfile: Boolean(user.stripeCustomerId),
            canManageBilling:
                user.subscriptionTier === "pro" &&
                Boolean(user.stripeCustomerId),
            entitlements: getEntitlementsForTier(user.subscriptionTier),
        };
    }),
});
