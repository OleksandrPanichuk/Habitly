import type { Metadata } from "next";
import { HabitsView } from "@/features/habits";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Habits",
};

const Page = async () => {
    const now = new Date();
    const date = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    const streakStart = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 90),
    );

    prefetch(trpc.habits.list.queryOptions({ date, includeArchived: false }));
    prefetch(
        trpc.completions.getByDateRange.queryOptions({
            startDate: streakStart,
            endDate: date,
        }),
    );

    return (
        <HydrateClient>
            <HabitsView date={date.toISOString()} />
        </HydrateClient>
    );
};

export default Page;
