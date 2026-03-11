import type { THabit } from "@/db/schema";
import { completions, habits } from "@/db/schema";
import {
    canAccessAnalyticsRange,
    getSubscriptionTierForUserId,
} from "@/lib/entitlements";
import {
    calculateStreaks,
    getDatesInRange,
    getEffectiveStart,
    isHabitCompleteForValue,
    isHabitScheduledOn,
    toDateKey,
} from "@/lib/utils";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, inArray, lte, min } from "drizzle-orm";
import z from "zod";

const analyticsRangeSchema = z
    .object({
        startDate: z.date(),
        endDate: z.date(),
    })
    .refine((d) => d.startDate <= d.endDate, {
        message: "startDate must be before endDate",
        path: ["endDate"],
    });

type TDatabase = typeof import("@/db").db;
type TAnalyticsCompletion = {
    id: string;
    date: Date;
    habitId: string;
    value: number;
};

async function loadEffectiveStartMap(
    db: TDatabase,
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

function getRequestedRangeDays(startDate: Date, endDate: Date): number {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return (
        Math.floor(
            (endDate.getTime() - startDate.getTime()) / millisecondsPerDay,
        ) + 1
    );
}

function getHabitMap(userHabits: THabit[]) {
    return new Map(userHabits.map((habit) => [habit.id, habit]));
}

function getRelevantHabitsForRange(
    userHabits: THabit[],
    dates: Date[],
    effectiveStartMap: Map<string, Date>,
    rangeCompletions: TAnalyticsCompletion[],
) {
    return userHabits.filter((habit) => {
        if (
            rangeCompletions.some(
                (completion) => completion.habitId === habit.id,
            )
        ) {
            return true;
        }

        return dates.some((date) =>
            isHabitScheduledOn(habit, date, effectiveStartMap.get(habit.id)),
        );
    });
}

function isCompletedCompletion(
    habitMap: Map<string, THabit>,
    completion: TAnalyticsCompletion,
) {
    const habit = habitMap.get(completion.habitId);
    return habit
        ? isHabitCompleteForValue(habit, completion.value, completion.date)
        : false;
}

function getCompletedCompletionsForHabit(
    habit: THabit,
    completionsForRange: TAnalyticsCompletion[],
) {
    return completionsForRange.filter(
        (completion) =>
            completion.habitId === habit.id &&
            isHabitCompleteForValue(habit, completion.value, completion.date),
    );
}

async function enforceAnalyticsAccess(
    db: TDatabase,
    userId: string,
    input: z.infer<typeof analyticsRangeSchema>,
) {
    const tier = await getSubscriptionTierForUserId(db, userId);
    const requestedRangeDays = getRequestedRangeDays(
        input.startDate,
        input.endDate,
    );

    if (!canAccessAnalyticsRange(tier, requestedRangeDays)) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message:
                "Advanced analytics ranges are available on Pro and Lifetime plans.",
        });
    }
}

export const analyticsRouter = createTRPCRouter({
    getDailyBreakdown: protectedProcedure
        .input(analyticsRangeSchema)
        .query(async ({ ctx, input }) => {
            await enforceAnalyticsAccess(ctx.db, ctx.user.id, input);

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
                        value: completions.value,
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
            const relevantHabits = getRelevantHabitsForRange(
                userHabits,
                allDates,
                effectiveStartMap,
                rangeCompletions,
            );
            const habitMap = getHabitMap(relevantHabits);

            const days = allDates.map((date) => {
                const key = toDateKey(date);
                const scheduledCount = relevantHabits.filter((h) =>
                    isHabitScheduledOn(h, date, effectiveStartMap.get(h.id)),
                ).length;
                const completedCount = rangeCompletions.filter(
                    (c) =>
                        toDateKey(c.date) === key &&
                        isCompletedCompletion(habitMap, c),
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
            await enforceAnalyticsAccess(ctx.db, ctx.user.id, input);

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
                        value: completions.value,
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
            const relevantHabits = getRelevantHabitsForRange(
                userHabits,
                allDates,
                effectiveStartMap,
                rangeCompletions,
            );

            return relevantHabits.map((habit) => {
                const effectiveStart = effectiveStartMap.get(habit.id);
                const habitDone = getCompletedCompletionsForHabit(
                    habit,
                    rangeCompletions,
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
            await enforceAnalyticsAccess(ctx.db, ctx.user.id, input);

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
                        value: completions.value,
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
            const relevantHabits = getRelevantHabitsForRange(
                userHabits,
                allDates,
                effectiveStartMap,
                rangeCompletions,
            );

            const categoryMap = new Map<
                string,
                { completed: number; scheduled: number; habitCount: number }
            >();

            for (const habit of relevantHabits) {
                const cat = habit.category ?? "other";
                if (!categoryMap.has(cat)) {
                    categoryMap.set(cat, {
                        completed: 0,
                        scheduled: 0,
                        habitCount: 0,
                    });
                }
                const entry = categoryMap.get(cat);
                if (!entry) {
                    continue;
                }
                entry.habitCount += 1;

                const effectiveStart = effectiveStartMap.get(habit.id);
                const scheduledDates = allDates.filter((d) =>
                    isHabitScheduledOn(habit, d, effectiveStart),
                );
                entry.scheduled += scheduledDates.length;

                const done = getCompletedCompletionsForHabit(
                    habit,
                    rangeCompletions,
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
            await enforceAnalyticsAccess(ctx.db, ctx.user.id, input);

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
                        value: completions.value,
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
            const relevantHabits = getRelevantHabitsForRange(
                userHabits,
                allDates,
                effectiveStartMap,
                rangeCompletions,
            );
            const habitMap = getHabitMap(relevantHabits);

            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            const dayStats = dayNames.map((name, dow) => {
                const datesOnThisDay = allDates.filter(
                    (d) => d.getUTCDay() === dow,
                );

                let totalScheduled = 0;
                let totalCompleted = 0;

                for (const date of datesOnThisDay) {
                    const key = toDateKey(date);
                    for (const habit of relevantHabits) {
                        const effectiveStart = effectiveStartMap.get(habit.id);
                        if (isHabitScheduledOn(habit, date, effectiveStart)) {
                            totalScheduled++;
                            const done = rangeCompletions.some(
                                (c) =>
                                    c.habitId === habit.id &&
                                    toDateKey(c.date) === key &&
                                    isCompletedCompletion(habitMap, c),
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
            await enforceAnalyticsAccess(ctx.db, ctx.user.id, input);

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
                        value: completions.value,
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
            const relevantHabits = getRelevantHabitsForRange(
                userHabits,
                allDates,
                effectiveStartMap,
                rangeCompletions,
            );
            const habitMap = getHabitMap(relevantHabits);

            let totalScheduled = 0;
            let bestStreakAcrossHabits = 0;

            for (const habit of relevantHabits) {
                const effectiveStart = effectiveStartMap.get(habit.id);
                const scheduledDates = allDates.filter((d) =>
                    isHabitScheduledOn(habit, d, effectiveStart),
                );
                totalScheduled += scheduledDates.length;

                const completedSet = new Set(
                    getCompletedCompletionsForHabit(
                        habit,
                        rangeCompletions,
                    ).map((completion) => toDateKey(completion.date)),
                );
                const { longestStreak } = calculateStreaks(
                    scheduledDates,
                    completedSet,
                );
                if (longestStreak > bestStreakAcrossHabits) {
                    bestStreakAcrossHabits = longestStreak;
                }
            }

            const totalCompletions = rangeCompletions.filter((completion) =>
                isCompletedCompletion(habitMap, completion),
            ).length;
            const overallRate =
                totalScheduled > 0
                    ? Math.min(
                          100,
                          Math.round((totalCompletions / totalScheduled) * 100),
                      )
                    : 0;

            const perfectDays = allDates.filter((date) => {
                const key = toDateKey(date);
                const scheduled = relevantHabits.filter((h) =>
                    isHabitScheduledOn(h, date, effectiveStartMap.get(h.id)),
                );
                if (scheduled.length === 0) return false;
                return scheduled.every((h) =>
                    rangeCompletions.some(
                        (c) =>
                            c.habitId === h.id &&
                            toDateKey(c.date) === key &&
                            isCompletedCompletion(habitMap, c),
                    ),
                );
            }).length;

            return {
                totalHabits: relevantHabits.length,
                totalCompletions,
                totalScheduled,
                overallRate,
                bestStreak: bestStreakAcrossHabits,
                perfectDays,
            };
        }),

    getInsights: protectedProcedure
        .input(analyticsRangeSchema)
        .query(async ({ ctx, input }) => {
            await enforceAnalyticsAccess(ctx.db, ctx.user.id, input);

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
                        value: completions.value,
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
            const relevantHabits = getRelevantHabitsForRange(
                userHabits,
                allDates,
                effectiveStartMap,
                rangeCompletions,
            );
            const midpoint = Math.floor(allDates.length / 2);
            const firstHalf = allDates.slice(0, midpoint);
            const secondHalf = allDates.slice(midpoint);

            const dayBreakdown = [
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
            ].map((day, dow) => {
                const dates = allDates.filter(
                    (date) => date.getUTCDay() === dow,
                );
                let scheduled = 0;
                let completed = 0;

                for (const date of dates) {
                    const key = toDateKey(date);
                    for (const habit of relevantHabits) {
                        if (
                            isHabitScheduledOn(
                                habit,
                                date,
                                effectiveStartMap.get(habit.id),
                            )
                        ) {
                            scheduled++;
                            const done = rangeCompletions.some(
                                (completion) =>
                                    completion.habitId === habit.id &&
                                    toDateKey(completion.date) === key &&
                                    isHabitCompleteForValue(
                                        habit,
                                        completion.value,
                                        completion.date,
                                    ),
                            );
                            if (done) {
                                completed++;
                            }
                        }
                    }
                }

                return {
                    day,
                    scheduled,
                    completed,
                    rate:
                        scheduled > 0
                            ? Math.round((completed / scheduled) * 100)
                            : 0,
                };
            });

            const weakestDay =
                [...dayBreakdown]
                    .filter((item) => item.scheduled > 0)
                    .sort((a, b) => a.rate - b.rate)[0] ?? null;

            const categoryRates = new Map<
                string,
                { completed: number; scheduled: number }
            >();

            for (const habit of relevantHabits) {
                const category = habit.category ?? "other";
                const current = categoryRates.get(category) ?? {
                    completed: 0,
                    scheduled: 0,
                };

                const scheduledDates = allDates.filter((date) =>
                    isHabitScheduledOn(
                        habit,
                        date,
                        effectiveStartMap.get(habit.id),
                    ),
                );
                const completedCount = getCompletedCompletionsForHabit(
                    habit,
                    rangeCompletions,
                ).length;

                current.completed += completedCount;
                current.scheduled += scheduledDates.length;
                categoryRates.set(category, current);
            }

            const strongestCategory =
                [...categoryRates.entries()]
                    .map(([category, data]) => ({
                        category,
                        rate:
                            data.scheduled > 0
                                ? Math.round(
                                      (data.completed / data.scheduled) * 100,
                                  )
                                : 0,
                        ...data,
                    }))
                    .filter((item) => item.scheduled > 0)
                    .sort((a, b) => b.rate - a.rate)[0] ?? null;

            const decliningHabits = relevantHabits
                .map((habit) => {
                    const firstHalfScheduled = firstHalf.filter((date) =>
                        isHabitScheduledOn(
                            habit,
                            date,
                            effectiveStartMap.get(habit.id),
                        ),
                    );
                    const secondHalfScheduled = secondHalf.filter((date) =>
                        isHabitScheduledOn(
                            habit,
                            date,
                            effectiveStartMap.get(habit.id),
                        ),
                    );

                    const firstHalfCompleted = getCompletedCompletionsForHabit(
                        habit,
                        rangeCompletions.filter((completion) =>
                            firstHalf.some(
                                (date) =>
                                    toDateKey(date) ===
                                    toDateKey(completion.date),
                            ),
                        ),
                    ).length;
                    const secondHalfCompleted = getCompletedCompletionsForHabit(
                        habit,
                        rangeCompletions.filter((completion) =>
                            secondHalf.some(
                                (date) =>
                                    toDateKey(date) ===
                                    toDateKey(completion.date),
                            ),
                        ),
                    ).length;

                    const firstHalfRate =
                        firstHalfScheduled.length > 0
                            ? Math.round(
                                  (firstHalfCompleted /
                                      firstHalfScheduled.length) *
                                      100,
                              )
                            : 0;
                    const secondHalfRate =
                        secondHalfScheduled.length > 0
                            ? Math.round(
                                  (secondHalfCompleted /
                                      secondHalfScheduled.length) *
                                      100,
                              )
                            : 0;

                    return {
                        habitId: habit.id,
                        name: habit.name,
                        icon: habit.icon,
                        color: habit.color,
                        firstHalfRate,
                        secondHalfRate,
                        delta: secondHalfRate - firstHalfRate,
                    };
                })
                .filter(
                    (habit) =>
                        habit.firstHalfRate > 0 &&
                        habit.secondHalfRate < habit.firstHalfRate,
                )
                .sort((a, b) => a.delta - b.delta)
                .slice(0, 3);

            return {
                weakestDay,
                strongestCategory,
                decliningHabits,
            };
        }),
});
