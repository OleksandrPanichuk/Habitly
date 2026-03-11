import { analyticsRouter } from "@/trpc/routers/analytics.router";
import { billingRouter } from "@/trpc/routers/billing.router";
import { onboardingRouter } from "@/trpc/routers/onboarding.router";
import { statsRouter } from "@/trpc/routers/stats.router";
import { createTRPCRouter } from "../init";
import { completionsRouter } from "./completions.router";
import { habitsRouter } from "./habits.router";

export const appRouter = createTRPCRouter({
    habits: habitsRouter,
    completions: completionsRouter,
    stats: statsRouter,
    analytics: analyticsRouter,
    billing: billingRouter,
    onboarding: onboardingRouter,
});

export type AppRouter = typeof appRouter;
