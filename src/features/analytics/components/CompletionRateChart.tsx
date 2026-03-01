"use client";

import { format, startOfWeek } from "date-fns";
import { motion } from "framer-motion";
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { parseDateKey } from "@/lib/utils";

interface DayData {
    date: string;
    completed: number;
    scheduled: number;
    rate: number;
}

interface WeeklyData {
    week: string;
    rate: number;
    completed: number;
    scheduled: number;
}

interface ICompletionRateChartProps {
    data: DayData[];
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        value: number;
        dataKey: string;
        payload: WeeklyData;
    }>;
    label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
        <div className="rounded-xl border border-white/15 bg-content1/95 backdrop-blur-sm px-3 py-2.5 shadow-xl text-xs space-y-1 min-w-32.5">
            <p className="font-semibold text-foreground">Week of {d.week}</p>
            <div className="flex items-center justify-between gap-4">
                <span className="text-foreground-400">Rate</span>
                <span
                    className="font-bold"
                    style={{
                        color:
                            d.rate >= 80
                                ? "#10b981"
                                : d.rate >= 50
                                  ? "#eab308"
                                  : "#ef4444",
                    }}
                >
                    {d.rate}%
                </span>
            </div>
            <div className="flex items-center justify-between gap-4">
                <span className="text-foreground-400">Completed</span>
                <span className="font-semibold text-foreground">
                    {d.completed}
                </span>
            </div>
            <div className="flex items-center justify-between gap-4">
                <span className="text-foreground-400">Scheduled</span>
                <span className="font-semibold text-foreground">
                    {d.scheduled}
                </span>
            </div>
        </div>
    );
};

function aggregateByWeek(data: DayData[]): WeeklyData[] {
    const weekMap = new Map<
        string,
        { completed: number; scheduled: number; weekStart: Date }
    >();

    for (const day of data) {
        const date = parseDateKey(day.date);
        const ws = startOfWeek(date, { weekStartsOn: 1 });
        const key = format(ws, "yyyy-MM-dd");

        if (!weekMap.has(key)) {
            weekMap.set(key, { completed: 0, scheduled: 0, weekStart: ws });
        }

        const entry = weekMap.get(key)!;
        entry.completed += day.completed;
        entry.scheduled += day.scheduled;
    }

    return Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, entry]) => ({
            week: format(entry.weekStart, "MMM d"),
            completed: entry.completed,
            scheduled: entry.scheduled,
            rate:
                entry.scheduled > 0
                    ? Math.min(
                          100,
                          Math.round((entry.completed / entry.scheduled) * 100),
                      )
                    : 0,
        }));
}

export const CompletionRateChart = ({ data }: ICompletionRateChartProps) => {
    const weeklyData = aggregateByWeek(data);

    if (weeklyData.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-sm text-foreground-400">
                No data available for this period.
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="space-y-3"
        >
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                    Weekly Completion Rate
                </p>
                <div className="flex items-center gap-1.5 text-xs text-foreground-400">
                    <span
                        className="inline-block w-6 h-0.5 rounded-full"
                        style={{
                            background:
                                "linear-gradient(90deg, hsl(var(--heroui-primary)), hsl(var(--heroui-secondary)))",
                        }}
                    />
                    <span>Rate %</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <LineChart
                    data={weeklyData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="week"
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, 100]}
                        allowDataOverflow={false}
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    <ReferenceLine
                        y={80}
                        stroke="rgba(16,185,129,0.35)"
                        strokeDasharray="4 4"
                        label={{
                            value: "80%",
                            position: "insideTopRight",
                            fill: "rgba(16,185,129,0.6)",
                            fontSize: 9,
                        }}
                    />

                    <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="url(#rateGrad)"
                        strokeWidth={2.5}
                        dot={{
                            r: 3,
                            fill: "hsl(var(--heroui-primary))",
                            stroke: "hsl(var(--heroui-primary))",
                            strokeWidth: 1,
                        }}
                        activeDot={{
                            r: 5,
                            fill: "hsl(var(--heroui-primary))",
                            stroke: "rgba(255,255,255,0.3)",
                            strokeWidth: 2,
                        }}
                    />

                    <defs>
                        <linearGradient
                            id="rateGrad"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                        >
                            <stop
                                offset="0%"
                                stopColor="hsl(var(--heroui-primary))"
                            />
                            <stop
                                offset="100%"
                                stopColor="hsl(var(--heroui-secondary))"
                            />
                        </linearGradient>
                    </defs>
                </LineChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
