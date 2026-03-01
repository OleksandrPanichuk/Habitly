"use client";

import { Button } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart2Icon, ChevronLeftIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toDateKey } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { CategoryBreakdownChart } from "./CategoryBreakdownChart";
import { CompletionRateChart } from "./CompletionRateChart";
import { DailyCompletionChart } from "./DailyCompletionChart";
import { DayOfWeekChart } from "./DayOfWeekChart";
import { HabitBreakdownChart } from "./HabitBreakdownChart";
import { OverviewCards } from "./OverviewCards";

type RangeKey = "7d" | "30d" | "90d" | "6m" | "1y";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" },
    { key: "6m", label: "6 months" },
    { key: "1y", label: "1 year" },
];

function utcToday(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addUtcMonths(date: Date, months: number): Date {
    return new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth() - months,
            date.getUTCDate(),
        ),
    );
}

function getRangeDates(range: RangeKey): { startDate: Date; endDate: Date } {
    const endDate = utcToday();

    let startDate: Date;
    switch (range) {
        case "7d":
            startDate = new Date(
                Date.UTC(
                    endDate.getUTCFullYear(),
                    endDate.getUTCMonth(),
                    endDate.getUTCDate() - 6,
                ),
            );
            break;
        case "30d":
            startDate = new Date(
                Date.UTC(
                    endDate.getUTCFullYear(),
                    endDate.getUTCMonth(),
                    endDate.getUTCDate() - 29,
                ),
            );
            break;
        case "90d":
            startDate = new Date(
                Date.UTC(
                    endDate.getUTCFullYear(),
                    endDate.getUTCMonth(),
                    endDate.getUTCDate() - 89,
                ),
            );
            break;
        case "6m":
            startDate = addUtcMonths(endDate, 6);
            break;
        case "1y":
            startDate = addUtcMonths(endDate, 12);
            break;
    }

    return { startDate, endDate };
}

const SkeletonCard = () => (
    <div className="rounded-2xl border border-white/10 bg-white/5 h-24 animate-pulse" />
);

const SkeletonChart = ({ height = "h-64" }: { height?: string }) => (
    <div
        className={`rounded-2xl border border-white/10 bg-white/5 ${height} animate-pulse`}
    />
);

interface IAnalyticsContentProps {
    startDate: Date;
    endDate: Date;
}

const AnalyticsContent = ({ startDate, endDate }: IAnalyticsContentProps) => {
    const trpc = useTRPC();

    const input = { startDate, endDate };

    const { data: overview, isLoading: overviewLoading } = useQuery(
        trpc.analytics.getOverviewStats.queryOptions(input),
    );
    const { data: dailyData, isLoading: dailyLoading } = useQuery(
        trpc.analytics.getDailyBreakdown.queryOptions(input),
    );
    const { data: habitData, isLoading: habitLoading } = useQuery(
        trpc.analytics.getHabitBreakdown.queryOptions(input),
    );
    const { data: categoryData, isLoading: categoryLoading } = useQuery(
        trpc.analytics.getCategoryBreakdown.queryOptions(input),
    );
    const { data: dowData, isLoading: dowLoading } = useQuery(
        trpc.analytics.getDayOfWeekBreakdown.queryOptions(input),
    );

    return (
        <div className="space-y-8">
            {overviewLoading || !overview ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : (
                <OverviewCards
                    totalHabits={overview.totalHabits}
                    totalCompletions={overview.totalCompletions}
                    overallRate={overview.overallRate}
                    bestStreak={overview.bestStreak}
                    perfectDays={overview.perfectDays}
                    totalScheduled={overview.totalScheduled}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                    {dailyLoading || !dailyData ? (
                        <SkeletonChart height="h-52" />
                    ) : (
                        <DailyCompletionChart data={dailyData} />
                    )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                    {dailyLoading || !dailyData ? (
                        <SkeletonChart height="h-52" />
                    ) : (
                        <CompletionRateChart data={dailyData} />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                    {dowLoading || !dowData ? (
                        <SkeletonChart height="h-52" />
                    ) : (
                        <DayOfWeekChart data={dowData} />
                    )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                    {categoryLoading || !categoryData ? (
                        <SkeletonChart height="h-52" />
                    ) : (
                        <CategoryBreakdownChart data={categoryData} />
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                {habitLoading || !habitData ? (
                    <SkeletonChart height="h-64" />
                ) : (
                    <HabitBreakdownChart data={habitData} />
                )}
            </div>
        </div>
    );
};

export const AnalyticsView = () => {
    const [range, setRange] = useState<RangeKey>("30d");

    const { startDate, endDate } = useMemo(() => getRangeDates(range), [range]);

    return (
        <div className="min-h-screen px-4 pt-8 pb-16 sm:px-6">
            <div className="mx-auto max-w-5xl space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                            <BarChart2Icon size={20} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground leading-tight">
                                Analytics
                            </h1>
                            <p className="text-xs text-foreground-400">
                                {toDateKey(startDate)} — {toDateKey(endDate)}
                            </p>
                        </div>
                    </div>

                    <a
                        href="/habits"
                        className="inline-flex items-center gap-1.5 text-xs text-foreground-400 hover:text-foreground transition-colors"
                    >
                        <ChevronLeftIcon size={14} />
                        Back to Habits
                    </a>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="flex gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 w-fit"
                >
                    {RANGE_OPTIONS.map(({ key, label }) => (
                        <Button
                            key={key}
                            size="sm"
                            variant={range === key ? "solid" : "light"}
                            color={range === key ? "primary" : "default"}
                            onPress={() => setRange(key)}
                            className={[
                                "text-xs font-medium h-7 px-3 min-w-fit rounded-lg transition-all",
                                range === key
                                    ? "shadow-sm"
                                    : "text-foreground-500 hover:text-foreground",
                            ].join(" ")}
                        >
                            {label}
                        </Button>
                    ))}
                </motion.div>

                <AnalyticsContent startDate={startDate} endDate={endDate} />
            </div>
        </div>
    );
};
