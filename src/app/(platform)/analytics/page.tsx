import type { Metadata } from "next";
import { AnalyticsView } from "@/features/analytics";
import { HydrateClient } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Analytics",
};

const Page = async () => {
    return (
        <HydrateClient>
            <AnalyticsView />
        </HydrateClient>
    );
};

export default Page;
