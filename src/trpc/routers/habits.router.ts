import { TRPCError } from "@trpc/server";
import {
    and,
    asc,
    eq,
    getTableColumns,
    inArray,
    isNotNull,
    isNull,
} from "drizzle-orm";
import { completions, habits } from "@/db/schema";
import {
    archiveHabitSchema,
    deleteHabitSchema,
    deleteManyHabitsSchema,
    exportHabitsSchema,
    habitUpdateSchema,
    habitValuesSchema,
    listHabitsSchema,
} from "@/schemas";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const habitsRouter = createTRPCRouter({
    list: protectedProcedure
        .input(listHabitsSchema)
        .query(async ({ ctx, input }) => {
            const rows = await ctx.db
                .select({
                    ...getTableColumns(habits),
                    completedAt: completions.date,
                    completionNote: completions.note,
                })
                .from(habits)
                .leftJoin(
                    completions,
                    and(
                        eq(completions.habitId, habits.id),
                        eq(completions.date, input.date),
                    ),
                )
                .where(
                    and(
                        eq(habits.userId, ctx.user.id),
                        input.includeArchived
                            ? isNotNull(habits.archivedAt)
                            : isNull(habits.archivedAt),
                        input.category
                            ? eq(habits.category, input.category)
                            : undefined,
                    ),
                )
                .orderBy(asc(habits.createdAt));

            const dayOfWeek = input.date.getUTCDay();

            const inputDateUtc = new Date(
                Date.UTC(
                    input.date.getUTCFullYear(),
                    input.date.getUTCMonth(),
                    input.date.getUTCDate(),
                ),
            );

            return rows.filter((row) => {
                switch (row.frequencyType) {
                    case "daily":
                        return true;
                    case "weekly":
                        return row.frequencyDaysOfWeek?.includes(dayOfWeek);
                    case "custom": {
                        if (!row.frequencyInterval || !row.frequencyUnit)
                            return false;

                        const start = new Date(
                            Date.UTC(
                                row.createdAt.getUTCFullYear(),
                                row.createdAt.getUTCMonth(),
                                row.createdAt.getUTCDate(),
                            ),
                        );
                        const target = inputDateUtc;

                        const daysDiff = Math.round(
                            (target.getTime() - start.getTime()) /
                                (1000 * 60 * 60 * 24),
                        );

                        if (daysDiff < 0) return false;

                        const intervalDays =
                            row.frequencyUnit === "weeks"
                                ? row.frequencyInterval * 7
                                : row.frequencyInterval;

                        return daysDiff % intervalDays === 0;
                    }
                    default:
                        throw new TRPCError({
                            code: "INTERNAL_SERVER_ERROR",
                            message: "Invalid frequency type",
                        });
                }
            });
        }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select()
            .from(habits)
            .where(
                and(eq(habits.userId, ctx.user.id), isNull(habits.archivedAt)),
            )
            .orderBy(asc(habits.createdAt));
    }),

    listArchived: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select()
            .from(habits)
            .where(
                and(
                    eq(habits.userId, ctx.user.id),
                    isNotNull(habits.archivedAt),
                ),
            )
            .orderBy(asc(habits.createdAt));
    }),

    create: protectedProcedure
        .input(habitValuesSchema)
        .mutation(async ({ ctx, input }) => {
            const [habit] = await ctx.db
                .insert(habits)
                .values({
                    userId: ctx.user.id,
                    name: input.name,
                    description: input.description,
                    frequencyType: input.frequencyType,
                    frequencyDaysOfWeek:
                        input.frequencyType === "weekly"
                            ? input.frequencyDaysOfWeek
                            : null,
                    frequencyInterval:
                        input.frequencyType === "custom"
                            ? input.frequencyInterval
                            : null,
                    frequencyUnit:
                        input.frequencyType === "custom"
                            ? input.frequencyUnit
                            : null,
                    color: input.color,
                    icon: input.icon ?? null,
                    category: input.category ?? "other",
                })
                .returning();
            return habit;
        }),

    update: protectedProcedure
        .input(habitUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            const { id, ...values } = input;

            const [updated] = await ctx.db
                .update(habits)
                .set({
                    name: values.name,
                    description: values.description,
                    color: values.color,
                    icon: values.icon ?? null,
                    category: values.category ?? "other",
                    frequencyType: values.frequencyType,
                    frequencyDaysOfWeek:
                        values.frequencyType === "weekly"
                            ? values.frequencyDaysOfWeek
                            : null,
                    frequencyInterval:
                        values.frequencyType === "custom"
                            ? values.frequencyInterval
                            : null,
                    frequencyUnit:
                        values.frequencyType === "custom"
                            ? values.frequencyUnit
                            : null,
                })
                .where(and(eq(habits.id, id), eq(habits.userId, ctx.user.id)))
                .returning();

            return updated;
        }),

    archive: protectedProcedure
        .input(archiveHabitSchema)
        .mutation(async ({ ctx, input }) => {
            const [updated] = await ctx.db
                .update(habits)
                .set({
                    archivedAt: input.archive ? new Date() : null,
                })
                .where(
                    and(
                        eq(habits.id, input.id),
                        eq(habits.userId, ctx.user.id),
                    ),
                )
                .returning();

            if (!updated) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Habit not found",
                });
            }

            return updated;
        }),

    delete: protectedProcedure
        .input(deleteHabitSchema)
        .mutation(async ({ ctx, input }) => {
            const [deleted] = await ctx.db
                .delete(habits)
                .where(
                    and(
                        eq(habits.id, input.id),
                        eq(habits.userId, ctx.user.id),
                    ),
                )
                .returning({ id: habits.id });

            if (!deleted) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Habit not found",
                });
            }

            return deleted;
        }),

    deleteMany: protectedProcedure
        .input(deleteManyHabitsSchema)
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(habits)
                .where(
                    and(
                        inArray(habits.id, input.ids),
                        eq(habits.userId, ctx.user.id),
                    ),
                );
        }),

    exportData: protectedProcedure
        .input(exportHabitsSchema)
        .query(async ({ ctx, input }) => {
            const { gte, lte } = await import("drizzle-orm");

            const userHabits = await ctx.db
                .select()
                .from(habits)
                .where(eq(habits.userId, ctx.user.id))
                .orderBy(asc(habits.createdAt));

            const habitCompletions = await ctx.db
                .select({
                    ...getTableColumns(completions),
                    habitName: habits.name,
                    habitColor: habits.color,
                    habitCategory: habits.category,
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
                .orderBy(asc(completions.date));

            return {
                habits: userHabits,
                completions: habitCompletions,
                exportedAt: new Date(),
            };
        }),
});
