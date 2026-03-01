import type { Metadata } from "next";
import { HabitsView } from "@/features/habits";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Habits",
};

const Page = async () => {
    const queryClient = getQueryClient();
    const now = new Date();
    const date = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    const streakStart = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 90),
    );

    await Promise.all([
        queryClient.prefetchQuery(
            trpc.habits.list.queryOptions({ date, includeArchived: false }),
        ),
        queryClient.prefetchQuery(
            trpc.completions.getByDateRange.queryOptions({
                startDate: streakStart,
                endDate: date,
            }),
        ),
    ]);

    return (
        <HydrateClient>
            <HabitsView date={date.toISOString()} />
        </HydrateClient>
    );
};

export default Page;
