import { completions, habits } from "@/db/schema";
import { getEntitlementsForUserId } from "@/lib/entitlements";
import { hasLifecycleEvent, logLifecycleEvent } from "@/lib/lifecycle";
import { isHabitScheduledOn } from "@/lib/utils";
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
import { TRPCError } from "@trpc/server";
import {
    and,
    asc,
    count,
    eq,
    getTableColumns,
    inArray,
    isNotNull,
    isNull,
} from "drizzle-orm";

export const habitsRouter = createTRPCRouter({
    list: protectedProcedure
        .input(listHabitsSchema)
        .query(async ({ ctx, input }) => {
            const rows = await ctx.db
                .select({
                    ...getTableColumns(habits),
                    completedAt: completions.date,
                    completionNote: completions.note,
                    completionValue: completions.value,
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

            return rows.filter((row) => isHabitScheduledOn(row, input.date));
        }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select()
            .from(habits)
            .where(
                and(
                    eq(habits.userId, ctx.user.id),
                    isNull(habits.archivedAt),
                    isNull(habits.deletedAt),
                ),
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
                    isNull(habits.deletedAt),
                ),
            )
            .orderBy(asc(habits.createdAt));
    }),

    create: protectedProcedure
        .input(habitValuesSchema)
        .mutation(async ({ ctx, input }) => {
            const entitlements = await getEntitlementsForUserId(
                ctx.db,
                ctx.user.id,
            );

            if (entitlements.maxActiveHabits !== null) {
                const [result] = await ctx.db
                    .select({ count: count() })
                    .from(habits)
                    .where(
                        and(
                            eq(habits.userId, ctx.user.id),
                            isNull(habits.archivedAt),
                            isNull(habits.deletedAt),
                        ),
                    );

                if (result.count >= entitlements.maxActiveHabits) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: `Free plan users can create up to ${entitlements.maxActiveHabits} active habits. Upgrade to Pro for unlimited habits.`,
                    });
                }

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
                        goalType: input.goalType ?? "binary",
                        targetValue:
                            input.goalType && input.goalType !== "binary"
                                ? input.targetValue
                                : null,
                        targetUnit:
                            input.goalType && input.goalType !== "binary"
                                ? input.targetUnit
                                : null,
                        reminderEnabled: input.reminderEnabled ?? false,
                    })
                    .returning();

                await logLifecycleEvent(ctx.db, ctx.user.id, "habit_created", {
                    habitId: habit.id,
                    goalType: habit.goalType,
                    reminderEnabled: habit.reminderEnabled,
                });

                if (result.count === 0) {
                    const alreadyLogged = await hasLifecycleEvent(
                        ctx.db,
                        ctx.user.id,
                        "first_habit_created",
                    );

                    if (!alreadyLogged) {
                        await logLifecycleEvent(
                            ctx.db,
                            ctx.user.id,
                            "first_habit_created",
                            { habitId: habit.id, source: "manual" },
                        );
                    }
                }

                return habit;
            }

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
                    goalType: input.goalType ?? "binary",
                    targetValue:
                        input.goalType && input.goalType !== "binary"
                            ? input.targetValue
                            : null,
                    targetUnit:
                        input.goalType && input.goalType !== "binary"
                            ? input.targetUnit
                            : null,
                    reminderEnabled: input.reminderEnabled ?? false,
                })
                .returning();

            await logLifecycleEvent(ctx.db, ctx.user.id, "habit_created", {
                habitId: habit.id,
                goalType: habit.goalType,
                reminderEnabled: habit.reminderEnabled,
            });
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
                    goalType: values.goalType ?? "binary",
                    targetValue:
                        values.goalType && values.goalType !== "binary"
                            ? values.targetValue
                            : null,
                    targetUnit:
                        values.goalType && values.goalType !== "binary"
                            ? values.targetUnit
                            : null,
                    reminderEnabled: values.reminderEnabled ?? false,
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
                .where(
                    and(
                        eq(habits.id, id),
                        eq(habits.userId, ctx.user.id),
                        isNull(habits.deletedAt),
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
                        isNull(habits.deletedAt),
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
                .update(habits)
                .set({
                    deletedAt: new Date(),
                    archivedAt: null,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(habits.id, input.id),
                        eq(habits.userId, ctx.user.id),
                    ),
                )
                .returning({ id: habits.id, name: habits.name });

            if (!deleted) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Habit not found",
                });
            }

            await logLifecycleEvent(ctx.db, ctx.user.id, "habit_deleted", {
                habitId: deleted.id,
                habitName: deleted.name,
            });

            return deleted;
        }),

    deleteMany: protectedProcedure
        .input(deleteManyHabitsSchema)
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .update(habits)
                .set({
                    deletedAt: new Date(),
                    archivedAt: null,
                    updatedAt: new Date(),
                })
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
            const entitlements = await getEntitlementsForUserId(
                ctx.db,
                ctx.user.id,
            );

            if (!entitlements.canExport) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message:
                        "CSV export is available on Pro and Lifetime plans.",
                });
            }

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
