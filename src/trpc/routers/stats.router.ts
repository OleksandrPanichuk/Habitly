import { TRPCError } from "@trpc/server";
import { and, eq, gte, inArray, lte, min } from "drizzle-orm";
import type { THabit } from "@/db/schema";
import { completions, habits } from "@/db/schema";
import {
    calculateStreaks,
    getDatesInRange,
    getEffectiveStart,
    isHabitScheduledOn,
    toDateKey,
} from "@/lib/utils";
import { getHabitStatsSchema, getStatsSchema } from "@/schemas";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

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
            (r: { habitId: string }) => r.habitId === habit.id,
        );
        const firstDate = row?.firstDate ?? undefined;
        map.set(habit.id, getEffectiveStart(habit, firstDate));
    }

    return map;
}

export const statsRouter = createTRPCRouter({
    getSummary: protectedProcedure
        .input(getStatsSchema)
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
                    ),
                loadEffectiveStartMap(ctx.db, userHabits),
            ]);

            const allDates = getDatesInRange(input.startDate, input.endDate);

            const completedDaySet = new Set(
                rangeCompletions.map((c: { date: Date }) => toDateKey(c.date)),
            );

            let totalScheduled = 0;

            for (const habit of userHabits) {
                const effectiveStart = effectiveStartMap.get(habit.id);
                for (const date of allDates) {
                    if (isHabitScheduledOn(habit, date, effectiveStart))
                        totalScheduled++;
                }
            }

            const totalCompletions = rangeCompletions.length;

            const completionRate =
                totalScheduled > 0
                    ? Math.min(
                          100,
                          Math.round((totalCompletions / totalScheduled) * 100),
                      )
                    : 0;

            const { currentStreak, longestStreak } = calculateStreaks(
                allDates,
                completedDaySet,
            );

            const completionsByDay = allDates.map((date) => {
                const key = toDateKey(date);
                return {
                    date,
                    count: rangeCompletions.filter(
                        (c: { date: Date }) => toDateKey(c.date) === key,
                    ).length,
                };
            });

            return {
                totalHabits: userHabits.length,
                totalCompletions,
                totalScheduled,
                completionRate,
                currentStreak,
                longestStreak,
                completionsByDay,
            };
        }),

    getHabitStats: protectedProcedure
        .input(getHabitStatsSchema)
        .query(async ({ ctx, input }) => {
            const [habit] = await ctx.db
                .select()
                .from(habits)
                .where(
                    and(
                        eq(habits.id, input.habitId),
                        eq(habits.userId, ctx.user.id),
                    ),
                );

            if (!habit) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Habit not found",
                });
            }

            const habitCompletions = await ctx.db
                .select({
                    id: completions.id,
                    date: completions.date,
                })
                .from(completions)
                .where(
                    and(
                        eq(completions.habitId, input.habitId),
                        gte(completions.date, input.startDate),
                        lte(completions.date, input.endDate),
                    ),
                );

            // Load the all-time earliest completion for this single habit
            const [earliestRow] = await ctx.db
                .select({
                    firstDate: min(completions.date),
                })
                .from(completions)
                .where(eq(completions.habitId, input.habitId));

            const effectiveStart = getEffectiveStart(
                habit,
                earliestRow?.firstDate ?? undefined,
            );

            const completedDatesSet = new Set(
                habitCompletions.map((c: { date: Date }) => toDateKey(c.date)),
            );

            const allDates = getDatesInRange(input.startDate, input.endDate);
            const scheduledDates = allDates.filter((date) =>
                isHabitScheduledOn(habit, date, effectiveStart),
            );

            const completionRate =
                scheduledDates.length > 0
                    ? Math.min(
                          100,
                          Math.round(
                              (habitCompletions.length /
                                  scheduledDates.length) *
                                  100,
                          ),
                      )
                    : 0;

            const { currentStreak, longestStreak } = calculateStreaks(
                scheduledDates,
                completedDatesSet,
            );

            const completionsByDay = allDates.map((date) => {
                const key = toDateKey(date);
                return {
                    date,
                    scheduled: scheduledDates.some((s) => toDateKey(s) === key),
                    completed: completedDatesSet.has(key),
                };
            });

            return {
                habit,
                totalCompletions: habitCompletions.length,
                totalScheduled: scheduledDates.length,
                completionRate,
                currentStreak,
                longestStreak,
                completionsByDay,
            };
        }),
});
