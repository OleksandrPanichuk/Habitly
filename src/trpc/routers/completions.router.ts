import { completions, habits } from "@/db/schema";
import { hasLifecycleEvent, logLifecycleEvent } from "@/lib/lifecycle";
import {
    calculateStreaks,
    getDatesInRange,
    getEffectiveStart,
    isHabitCompleteForValue,
    isHabitScheduledOn,
    toDateKey,
} from "@/lib/utils";
import {
    getCompletionsByDateRangeSchema,
    setCompletionProgressSchema,
    toggleCompletionSchema,
    updateCompletionNoteSchema,
} from "@/schemas";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, getTableColumns, gte, lte } from "drizzle-orm";

async function maybeLogFirstSevenDayStreak(
    db: typeof import("@/db").db,
    habit: typeof habits.$inferSelect,
) {
    const alreadyLogged = await hasLifecycleEvent(
        db,
        habit.userId,
        "first_7_day_streak",
    );

    if (alreadyLogged) {
        return;
    }

    const habitCompletions = await db
        .select({ date: completions.date, value: completions.value })
        .from(completions)
        .where(eq(completions.habitId, habit.id))
        .orderBy(asc(completions.date));

    if (habitCompletions.length === 0) {
        return;
    }

    const firstCompletionDate = habitCompletions[0]?.date;
    const effectiveStart = getEffectiveStart(habit, firstCompletionDate);
    const now = new Date();
    const today = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const completedSet = new Set(
        habitCompletions
            .filter((completion) =>
                isHabitCompleteForValue(
                    habit,
                    completion.value,
                    completion.date,
                ),
            )
            .map((completion) => toDateKey(completion.date)),
    );

    const scheduledDates = getDatesInRange(effectiveStart, today).filter(
        (date) => isHabitScheduledOn(habit, date, effectiveStart),
    );
    const { currentStreak } = calculateStreaks(scheduledDates, completedSet);

    if (currentStreak >= 7) {
        await logLifecycleEvent(db, habit.userId, "first_7_day_streak", {
            habitId: habit.id,
            habitName: habit.name,
            currentStreak,
        });
    }
}

export const completionsRouter = createTRPCRouter({
    getByDateRange: protectedProcedure
        .input(getCompletionsByDateRangeSchema)
        .query(async ({ ctx, input }) => {
            return ctx.db
                .select(getTableColumns(completions))
                .from(completions)
                .innerJoin(habits, eq(habits.id, completions.habitId))
                .where(
                    and(
                        eq(habits.userId, ctx.user.id),
                        gte(completions.date, input.startDate),
                        lte(completions.date, input.endDate),
                        input.habitId
                            ? eq(completions.habitId, input.habitId)
                            : undefined,
                    ),
                )
                .orderBy(asc(completions.date));
        }),
    toggle: protectedProcedure
        .input(toggleCompletionSchema)
        .mutation(async ({ ctx, input }) => {
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

            if (habit.deletedAt) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Deleted habits are read-only.",
                });
            }

            const [existing] = await ctx.db
                .select({ id: completions.id, value: completions.value })
                .from(completions)
                .where(
                    and(
                        eq(completions.habitId, input.habitId),
                        eq(completions.date, input.date),
                    ),
                );

            if (
                existing &&
                (habit.goalType === "binary" ||
                    isHabitCompleteForValue(habit, existing.value, input.date))
            ) {
                await ctx.db
                    .delete(completions)
                    .where(eq(completions.id, existing.id));

                return { completed: false, completionValue: 0 };
            }

            const nextValue =
                habit.goalType === "binary" ? 1 : (habit.targetValue ?? 1);

            const [completion] = existing
                ? await ctx.db
                      .update(completions)
                      .set({ value: nextValue, updatedAt: new Date() })
                      .where(eq(completions.id, existing.id))
                      .returning()
                : await ctx.db
                      .insert(completions)
                      .values({
                          habitId: input.habitId,
                          date: input.date,
                          note: input.note,
                          value: nextValue,
                      })
                      .returning();

            await logLifecycleEvent(
                ctx.db,
                ctx.user.id,
                "habit_progress_logged",
                {
                    habitId: habit.id,
                    goalType: habit.goalType,
                    value: completion.value,
                    completed: isHabitCompleteForValue(
                        habit,
                        completion.value,
                        completion.date,
                    ),
                },
            );

            await maybeLogFirstSevenDayStreak(ctx.db, habit);

            return {
                completed: isHabitCompleteForValue(
                    habit,
                    completion.value,
                    completion.date,
                ),
                completion,
                completionValue: completion.value,
            };
        }),

    setProgress: protectedProcedure
        .input(setCompletionProgressSchema)
        .mutation(async ({ ctx, input }) => {
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

            if (habit.deletedAt) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Deleted habits are read-only.",
                });
            }

            const [existing] = await ctx.db
                .select({ id: completions.id, note: completions.note })
                .from(completions)
                .where(
                    and(
                        eq(completions.habitId, input.habitId),
                        eq(completions.date, input.date),
                    ),
                );

            if (input.value <= 0) {
                if (existing) {
                    await ctx.db
                        .delete(completions)
                        .where(eq(completions.id, existing.id));
                }

                return { completed: false, completionValue: 0 };
            }

            const normalizedValue =
                habit.goalType === "binary" ? 1 : input.value;

            const [completion] = existing
                ? await ctx.db
                      .update(completions)
                      .set({
                          value: normalizedValue,
                          note: input.note ?? existing.note,
                          updatedAt: new Date(),
                      })
                      .where(eq(completions.id, existing.id))
                      .returning()
                : await ctx.db
                      .insert(completions)
                      .values({
                          habitId: input.habitId,
                          date: input.date,
                          value: normalizedValue,
                          note: input.note,
                      })
                      .returning();

            await logLifecycleEvent(
                ctx.db,
                ctx.user.id,
                "habit_progress_logged",
                {
                    habitId: habit.id,
                    goalType: habit.goalType,
                    value: completion.value,
                    completed: isHabitCompleteForValue(
                        habit,
                        completion.value,
                        completion.date,
                    ),
                },
            );

            await maybeLogFirstSevenDayStreak(ctx.db, habit);

            return {
                completed: isHabitCompleteForValue(
                    habit,
                    completion.value,
                    completion.date,
                ),
                completionValue: completion.value,
                completion,
            };
        }),

    updateNote: protectedProcedure
        .input(updateCompletionNoteSchema)
        .mutation(async ({ ctx, input }) => {
            const [habit] = await ctx.db
                .select({ id: habits.id, deletedAt: habits.deletedAt })
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

            if (habit.deletedAt) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Deleted habits are read-only.",
                });
            }

            const [existing] = await ctx.db
                .select({ id: completions.id })
                .from(completions)
                .where(
                    and(
                        eq(completions.habitId, input.habitId),
                        eq(completions.date, input.date),
                    ),
                );

            if (!existing) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Completion not found for this date",
                });
            }

            const [updated] = await ctx.db
                .update(completions)
                .set({ note: input.note ?? null })
                .where(eq(completions.id, existing.id))
                .returning();

            return updated;
        }),
});
