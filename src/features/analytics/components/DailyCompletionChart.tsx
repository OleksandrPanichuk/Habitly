"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
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

interface IDailyCompletionChartProps {
    data: DayData[];
    primaryColor?: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        value: number;
        dataKey: string;
        payload: DayData;
    }>;
    label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
        <div className="rounded-xl border border-white/15 bg-content1/95 backdrop-blur-sm px-3 py-2.5 shadow-xl text-xs space-y-1 min-w-[120px]">
            <p className="font-semibold text-foreground">
                {format(parseDateKey(d.date), "EEE, MMM d")}
            </p>
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
            <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-white/10">
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
        </div>
    );
};

function getBarColor(rate: number): string {
    if (rate >= 80) return "#10b981";
    if (rate >= 50) return "#eab308";
    if (rate > 0) return "#f97316";
    return "rgba(255,255,255,0.08)";
}

export const DailyCompletionChart = ({ data }: IDailyCompletionChartProps) => {
    const sliced = data.slice(-30);

    if (sliced.length === 0) {
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
            transition={{ duration: 0.4 }}
            className="space-y-3"
        >
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                    Daily Completions
                </p>
                <div className="flex items-center gap-3 text-xs text-foreground-400">
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                        ≥80%
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500" />
                        ≥50%
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-500" />
                        &lt;50%
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <BarChart
                    data={sliced}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    barCategoryGap="25%"
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: string) =>
                            format(parseDateKey(v), "MMM d")
                        }
                        interval={Math.ceil(sliced.length / 7) - 1}
                    />
                    <YAxis
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "rgba(255,255,255,0.04)", radius: 4 }}
                    />
                    <Bar
                        dataKey="completed"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                    >
                        {sliced.map((entry) => (
                            <Cell
                                key={entry.date}
                                fill={getBarColor(entry.rate)}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
