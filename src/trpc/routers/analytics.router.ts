import { and, asc, eq, gte, inArray, lte, min } from "drizzle-orm";
import z from "zod";
import type { THabit } from "@/db/schema";
import { completions, habits } from "@/db/schema";
import {
    calculateStreaks,
    getDatesInRange,
    getEffectiveStart,
    isHabitScheduledOn,
    toDateKey,
} from "@/lib/utils";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const analyticsRangeSchema = z
    .object({
        startDate: z.date(),
        endDate: z.date(),
    })
    .refine((d) => d.startDate <= d.endDate, {
        message: "startDate must be before endDate",
        path: ["endDate"],
    });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadEffectiveStartMap(
    db: any,
    userHabits: THabit[],
): Promise<Map<string, Date>> {
    const map = new Map<string, Date>();
    if (userHabits.length === 0) return map;

    const rows = await db
        .select({
            habitId: completions.habitId,
            firstDate: min(completions.date),
        })
        .from(completions)
        .where(
            inArray(
                completions.habitId,
                userHabits.map((h) => h.id),
            ),
        )
        .groupBy(completions.habitId);

    for (const habit of userHabits) {
        const row = rows.find(
            (r: { habitId: string; firstDate: Date | null }) =>
                r.habitId === habit.id,
        );
        const firstDate = row?.firstDate ?? undefined;
        map.set(habit.id, getEffectiveStart(habit, firstDate));
    }

    return map;
}

export const analyticsRouter = createTRPCRouter({
    getDailyBreakdown: protectedProcedure
        .input(analyticsRangeSchema)
        .query(async ({ ctx, input }) => {
            const userHabits = await ctx.db
                .select()
                .from(habits)
                .where(eq(habits.userId, ctx.user.id));

            const [rangeCompletions, effectiveStartMap] = await Promise.all([
                ctx.db
                    .select({
                        id: completions.id,
                        date: completions.date,
                        habitId: completions.habitId,
                    })
                    .from(completions)
                    .innerJoin(habits, eq(habits.id, completions.habitId))
                    .where(
                        and(
                            eq(habits.userId, ctx.user.id),
                            gte(completions.date, input.startDate),
                            lte(completions.date, input.endDate),
                        ),
                    )
                    .orderBy(asc(completions.date)),
                loadEffectiveStartMap(ctx.db, userHabits),
            ]);

            const allDates = getDatesInRange(input.startDate, input.endDate);

            const days = allDates.map((date) => {
                const key = toDateKey(date);
                const scheduledCount = userHabits.filter((h) =>
                    isHabitScheduledOn(h, date, effectiveStartMap.get(h.id)),
                ).length;
                const completedCount = rangeCompletions.filter(
                    (c) => toDateKey(c.date) === key,
                ).length;

                return {
                    date: key,
                    completed: completedCount,
                    scheduled: scheduledCount,
                    rate:
                        scheduledCount > 0
                            ? Math.min(
                                  100,
                                  Math.round(
                                      (completedCount / scheduledCount) * 100,
                                  ),
                              )
                            : 0,
                };
            });

            return days;
        }),

    getHabitBreakdown: protectedProcedure
        .input(analyticsRangeSchema)
        .query(async ({ ctx, input }) => {
            const userHabits = await ctx.db
                .select()
                .from(habits)
                .where(eq(habits.userId, ctx.user.id));

            const [rangeCompletions, effectiveStartMap] = await Promise.all([
                ctx.db
                    .select({
                        id: completions.id,
                        date: completions.date,
                        habitId: completions.habitId,
                    })
                    .from(completions)
                    .innerJoin(habits, eq(habits.id, completions.habitId))
                    .where(
                        and(
                            eq(habits.userId, ctx.user.id),
                            gte(completions.date, input.startDate),
                            lte(completions.date, input.endDate),
                        ),
                    )
                    .orderBy(asc(completions.date)),
                loadEffectiveStartMap(ctx.db, userHabits),
            ]);

            const allDates = getDatesInRange(input.startDate, input.endDate);

            return userHabits.map((habit) => {
                const effectiveStart = effectiveStartMap.get(habit.id);
                const habitDone = rangeCompletions.filter(
                    (c) => c.habitId === habit.id,
                );
                const scheduledDates = allDates.filter((d) =>
                    isHabitScheduledOn(habit, d, effectiveStart),
                );

                const completedSet = new Set(
                    habitDone.map((c) => toDateKey(c.date)),
                );

                const { currentStreak, longestStreak } = calculateStreaks(
                    scheduledDates,
                    completedSet,
                );

                const rate =
                    scheduledDates.length > 0
                        ? Math.min(
                              100,
                              Math.round(
                                  (habitDone.length / scheduledDates.length) *
                                      100,
                              ),
                          )
                        : 0;

                return {
                    id: habit.id,
                    name: habit.name,
                    color: habit.color,
                    icon: habit.icon,
                    category: habit.category,
                    completed: habitDone.length,
                    scheduled: scheduledDates.length,
                    rate,
                    currentStreak,
                    longestStreak,
                };
            });
        }),

    getCategoryBreakdown: protectedProcedure
        .input(analyticsRangeSchema)
        .query(async ({ ctx, input }) => {
            const userHabits = await ctx.db
                .select()
                .from(habits)
                .where(eq(habits.userId, ctx.user.id));

            const [rangeCompletions, effectiveStartMap] = await Promise.all([
                ctx.db
                    .select({
                        id: completions.id,
                        date: completions.date,
                        habitId: completions.habitId,
                    })
                    .from(completions)
                    .innerJoin(habits, eq(habits.id, completions.habitId))
                    .where(
                        and(
                            eq(habits.userId, ctx.user.id),
                            gte(completions.date, input.startDate),
                            lte(completions.date, input.endDate),
                        ),
                    )
                    .orderBy(asc(completions.date)),
                loadEffectiveStartMap(ctx.db, userHabits),
            ]);

            const allDates = getDatesInRange(input.startDate, input.endDate);

            const categoryMap = new Map<
                string,
                { completed: number; scheduled: number; habitCount: number }
            >();

            for (const habit of userHabits) {
                const cat = habit.category ?? "other";
                if (!categoryMap.has(cat)) {
                    categoryMap.set(cat, {
                        completed: 0,
                        scheduled: 0,
                        habitCount: 0,
                    });
                }
                const entry = categoryMap.get(cat)!;
                entry.habitCount += 1;

                const effectiveStart = effectiveStartMap.get(habit.id);
                const scheduledDates = allDates.filter((d) =>
                    isHabitScheduledOn(habit, d, effectiveStart),
                );
                entry.scheduled += scheduledDates.length;

                const done = rangeCompletions.filter(
                    (c) => c.habitId === habit.id,
                ).length;
                entry.completed += done;
            }

            return Array.from(categoryMap.entries()).map(
                ([category, data]) => ({
                    category,
                    ...data,
                    rate:
                        data.scheduled > 0
                            ? Math.min(
                                  100,
                                  Math.round(
                                      (data.completed / data.scheduled) * 100,
                                  ),
                              )
                            : 0,
                }),
            );
        }),

    getDayOfWeekBreakdown: protectedProcedure
        .input(analyticsRangeSchema)
        .query(async ({ ctx, input }) => {
            const userHabits = await ctx.db
                .select()
                .from(habits)
                .where(eq(habits.userId, ctx.user.id));

            const [rangeCompletions, effectiveStartMap] = await Promise.all([
                ctx.db
                    .select({
                        id: completions.id,
                        date: completions.date,
                        habitId: completions.habitId,
                    })
                    .from(completions)
                    .innerJoin(habits, eq(habits.id, completions.habitId))
                    .where(
                        and(
                            eq(habits.userId, ctx.user.id),
                            gte(completions.date, input.startDate),
                            lte(completions.date, input.endDate),
                        ),
                    )
                    .orderBy(asc(completions.date)),
                loadEffectiveStartMap(ctx.db, userHabits),
            ]);

            const allDates = getDatesInRange(input.startDate, input.endDate);

            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            const dayStats = dayNames.map((name, dow) => {
                const datesOnThisDay = allDates.filter(
                    (d) => d.getUTCDay() === dow,
                );

                let totalScheduled = 0;
                let totalCompleted = 0;

                for (const date of datesOnThisDay) {
                    const key = toDateKey(date);
                    for (const habit of userHabits) {
                        const effectiveStart = effectiveStartMap.get(habit.id);
                        if (isHabitScheduledOn(habit, date, effectiveStart)) {
                            totalScheduled++;
                            const done = rangeCompletions.some(
                                (c) =>
                                    c.habitId === habit.id &&
                                    toDateKey(c.date) === key,
                            );
                            if (done) totalCompleted++;
                        }
                    }
                }

                return {
                    day: name,
                    dow,
                    completed: totalCompleted,
                    scheduled: totalScheduled,
                    rate:
                        totalScheduled > 0
                            ? Math.min(
                                  100,
                                  Math.round(
                                      (totalCompleted / totalScheduled) * 100,
                                  ),
                              )
                            : 0,
                };
            });

            return dayStats;
        }),

    getOverviewStats: protectedProcedure
        .input(analyticsRangeSchema)
        .query(async ({ ctx, input }) => {
            const userHabits = await ctx.db
                .select()
                .from(habits)
                .where(eq(habits.userId, ctx.user.id));

            const [rangeCompletions, effectiveStartMap] = await Promise.all([
                ctx.db
                    .select({
                        id: completions.id,
                        date: completions.date,
                        habitId: completions.habitId,
                    })
                    .from(completions)
                    .innerJoin(habits, eq(habits.id, completions.habitId))
                    .where(
                        and(
                            eq(habits.userId, ctx.user.id),
                            gte(completions.date, input.startDate),
                            lte(completions.date, input.endDate),
                        ),
                    )
                    .orderBy(asc(completions.date)),
                loadEffectiveStartMap(ctx.db, userHabits),
            ]);

            const allDates = getDatesInRange(input.startDate, input.endDate);

            let totalScheduled = 0;
            let bestStreakAcrossHabits = 0;

            for (const habit of userHabits) {
                const effectiveStart = effectiveStartMap.get(habit.id);
                const scheduledDates = allDates.filter((d) =>
                    isHabitScheduledOn(habit, d, effectiveStart),
                );
                totalScheduled += scheduledDates.length;

                const completedSet = new Set(
                    rangeCompletions
                        .filter((c) => c.habitId === habit.id)
                        .map((c) => toDateKey(c.date)),
                );
                const { longestStreak } = calculateStreaks(
                    scheduledDates,
                    completedSet,
                );
                if (longestStreak > bestStreakAcrossHabits) {
                    bestStreakAcrossHabits = longestStreak;
                }
            }

            const totalCompletions = rangeCompletions.length;
            const overallRate =
                totalScheduled > 0
                    ? Math.min(
                          100,
                          Math.round((totalCompletions / totalScheduled) * 100),
                      )
                    : 0;

            const perfectDays = allDates.filter((date) => {
                const key = toDateKey(date);
                const scheduled = userHabits.filter((h) =>
                    isHabitScheduledOn(h, date, effectiveStartMap.get(h.id)),
                );
                if (scheduled.length === 0) return false;
                return scheduled.every((h) =>
                    rangeCompletions.some(
                        (c) => c.habitId === h.id && toDateKey(c.date) === key,
                    ),
                );
            }).length;

            return {
                totalHabits: userHabits.length,
                totalCompletions,
                totalScheduled,
                overallRate,
                bestStreak: bestStreakAcrossHabits,
                perfectDays,
            };
        }),
});
