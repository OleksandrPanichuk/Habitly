import type { THabit } from "@/db/schema";
import { completions, habits, userPreferences } from "@/db/schema";
import {
    calculateStreaks,
    getDatesInRange,
    getEffectiveStart,
    isHabitCompleteForValue,
    isHabitScheduledOn,
    toDateKey,
} from "@/lib/utils";
import {
    getCoachStateSchema,
    getHabitStatsSchema,
    getStatsSchema,
} from "@/schemas";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, gte, inArray, lte, min } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadEffectiveStartMap(
    db: typeof import("@/db").db,
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

function getRelevantHabitsForRange(
    userHabits: THabit[],
    dates: Date[],
    effectiveStartMap: Map<string, Date>,
    rangeCompletions: Array<{ habitId: string }>,
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
                    ),
                loadEffectiveStartMap(ctx.db, userHabits),
            ]);

            const allDates = getDatesInRange(input.startDate, input.endDate);
            const relevantHabits = getRelevantHabitsForRange(
                userHabits,
                allDates,
                effectiveStartMap,
                rangeCompletions,
            );

            const completedDaySet = new Set(
                rangeCompletions
                    .filter((completion) => {
                        const habit = userHabits.find(
                            (userHabit) => userHabit.id === completion.habitId,
                        );

                        return habit
                            ? isHabitCompleteForValue(
                                  habit,
                                  completion.value,
                                  completion.date,
                              )
                            : false;
                    })
                    .map((c: { date: Date }) => toDateKey(c.date)),
            );

            let totalScheduled = 0;

            for (const habit of relevantHabits) {
                const effectiveStart = effectiveStartMap.get(habit.id);
                for (const date of allDates) {
                    if (isHabitScheduledOn(habit, date, effectiveStart))
                        totalScheduled++;
                }
            }

            const totalCompletions = rangeCompletions.filter((completion) => {
                const habit = userHabits.find(
                    (userHabit) => userHabit.id === completion.habitId,
                );
                return habit
                    ? isHabitCompleteForValue(
                          habit,
                          completion.value,
                          completion.date,
                      )
                    : false;
            }).length;

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
                    count: rangeCompletions.filter((c) => {
                        const habit = userHabits.find(
                            (userHabit) => userHabit.id === c.habitId,
                        );

                        return (
                            toDateKey(c.date) === key &&
                            !!habit &&
                            isHabitCompleteForValue(habit, c.value, c.date)
                        );
                    }).length,
                };
            });

            return {
                totalHabits: relevantHabits.length,
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
                    value: completions.value,
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
                habitCompletions
                    .filter((c) =>
                        isHabitCompleteForValue(habit, c.value, c.date),
                    )
                    .map((c: { date: Date }) => toDateKey(c.date)),
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
                totalCompletions: habitCompletions.filter((completion) =>
                    isHabitCompleteForValue(
                        habit,
                        completion.value,
                        completion.date,
                    ),
                ).length,
                totalScheduled: scheduledDates.length,
                completionRate,
                currentStreak,
                longestStreak,
                completionsByDay,
            };
        }),

    getCoachState: protectedProcedure
        .input(getCoachStateSchema)
        .query(async ({ ctx }) => {
            const now = new Date();
            const today = new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate(),
                ),
            );
            const yesterday = new Date(
                Date.UTC(
                    today.getUTCFullYear(),
                    today.getUTCMonth(),
                    today.getUTCDate() - 1,
                ),
            );
            const weekStart = new Date(
                Date.UTC(
                    today.getUTCFullYear(),
                    today.getUTCMonth(),
                    today.getUTCDate() - 6,
                ),
            );

            const [userHabits, preferences, recentCompletions] =
                await Promise.all([
                    ctx.db
                        .select()
                        .from(habits)
                        .where(eq(habits.userId, ctx.user.id)),
                    ctx.db
                        .select()
                        .from(userPreferences)
                        .where(eq(userPreferences.userId, ctx.user.id))
                        .limit(1),
                    ctx.db
                        .select({
                            habitId: completions.habitId,
                            date: completions.date,
                            note: completions.note,
                            value: completions.value,
                        })
                        .from(completions)
                        .innerJoin(habits, eq(habits.id, completions.habitId))
                        .where(
                            and(
                                eq(habits.userId, ctx.user.id),
                                gte(completions.date, weekStart),
                                lte(completions.date, today),
                            ),
                        ),
                ]);

            const effectiveStartMap = await loadEffectiveStartMap(
                ctx.db,
                userHabits,
            );
            const yesterdayKey = toDateKey(yesterday);
            const todayKey = toDateKey(today);

            const missedYesterday = userHabits
                .filter((habit) =>
                    isHabitScheduledOn(
                        habit,
                        yesterday,
                        effectiveStartMap.get(habit.id),
                    ),
                )
                .filter((habit) => {
                    const completion = recentCompletions.find(
                        (item) =>
                            item.habitId === habit.id &&
                            toDateKey(item.date) === yesterdayKey,
                    );

                    return (
                        !completion ||
                        !isHabitCompleteForValue(
                            habit,
                            completion.value,
                            completion.date,
                        )
                    );
                })
                .slice(0, 3)
                .map((habit) => habit.name);

            const reflectionCandidates = userHabits
                .filter((habit) => {
                    const completion = recentCompletions.find(
                        (item) =>
                            item.habitId === habit.id &&
                            toDateKey(item.date) === todayKey,
                    );

                    return (
                        !!completion &&
                        isHabitCompleteForValue(
                            habit,
                            completion.value,
                            completion.date,
                        ) &&
                        !completion.note
                    );
                })
                .slice(0, 3)
                .map((habit) => habit.name);

            const onboardingDate = preferences[0]?.onboardingCompletedAt;
            const onboardingDay = onboardingDate
                ? Math.max(
                      1,
                      Math.floor(
                          (today.getTime() - onboardingDate.getTime()) /
                              (1000 * 60 * 60 * 24),
                      ) + 1,
                  )
                : 1;

            return {
                onboardingDay,
                preferredCheckInTime:
                    preferences[0]?.preferredCheckInTime ?? "19:00",
                reminderEmailEnabled:
                    preferences[0]?.reminderEmailEnabled ?? false,
                weeklyReviewDue:
                    today.getUTCDay() ===
                    (preferences[0]?.weeklyReviewDay ?? 0),
                missedYesterday,
                reflectionCandidates,
            };
        }),
});
