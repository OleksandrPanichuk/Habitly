import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { OnboardingView } from "@/features/habits";
import { auth } from "@/lib/auth";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Welcome",
};

export const dynamic = "force-dynamic";

const Page = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        redirect("/sign-in");
    }

    const [preferences] = await db
        .select({
            onboardingCompletedAt: userPreferences.onboardingCompletedAt,
        })
        .from(userPreferences)
        .where(eq(userPreferences.userId, session.user.id))
        .limit(1);

    if (preferences?.onboardingCompletedAt) {
        redirect("/habits");
    }

    prefetch(trpc.onboarding.getStatus.queryOptions({}));

    return (
        <HydrateClient>
            <OnboardingView />
        </HydrateClient>
    );
};

export default Page;
