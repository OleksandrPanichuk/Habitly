import { SettingsView } from "@/features/habits";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Settings",
};

const Page = async () => {
    prefetch(trpc.onboarding.getStatus.queryOptions({}));
    prefetch(trpc.billing.getStatus.queryOptions());

    return (
        <HydrateClient>
            <SettingsView />
        </HydrateClient>
    );
};

export default Page;
