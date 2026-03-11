import { habits, userPreferences, users } from "@/db/schema";
import { getEntitlementsForUserId } from "@/lib/entitlements";
import { hasLifecycleEvent, logLifecycleEvent } from "@/lib/lifecycle";
import {
    completeOnboardingSchema,
    onboardingStatusSchema,
    updateUserPreferencesSchema,
} from "@/schemas";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, count, eq, isNull } from "drizzle-orm";

const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_CHECK_IN_TIME = "19:00";
const DEFAULT_WEEKLY_REVIEW_DAY = 0;

export const onboardingRouter = createTRPCRouter({
    getStatus: protectedProcedure
        .input(onboardingStatusSchema)
        .query(async ({ ctx }) => {
            const [[user], [preferences], [habitCountResult]] =
                await Promise.all([
                    ctx.db
                        .select({ name: users.name })
                        .from(users)
                        .where(eq(users.id, ctx.user.id))
                        .limit(1),
                    ctx.db
                        .select({
                            timezone: userPreferences.timezone,
                            preferredCheckInTime:
                                userPreferences.preferredCheckInTime,
                            weeklyReviewDay: userPreferences.weeklyReviewDay,
                            reminderEmailEnabled:
                                userPreferences.reminderEmailEnabled,
                            onboardingCompletedAt:
                                userPreferences.onboardingCompletedAt,
                        })
                        .from(userPreferences)
                        .where(eq(userPreferences.userId, ctx.user.id))
                        .limit(1),
                    ctx.db
                        .select({ count: count() })
                        .from(habits)
                        .where(
                            and(
                                eq(habits.userId, ctx.user.id),
                                isNull(habits.deletedAt),
                            ),
                        )
                        .limit(1),
                ]);

            return {
                name: user?.name ?? "there",
                timezone: preferences?.timezone ?? DEFAULT_TIMEZONE,
                preferredCheckInTime:
                    preferences?.preferredCheckInTime ?? DEFAULT_CHECK_IN_TIME,
                weeklyReviewDay:
                    preferences?.weeklyReviewDay ?? DEFAULT_WEEKLY_REVIEW_DAY,
                reminderEmailEnabled:
                    preferences?.reminderEmailEnabled ?? false,
                isCompleted: Boolean(preferences?.onboardingCompletedAt),
                existingHabitCount: habitCountResult?.count ?? 0,
            };
        }),

    complete: protectedProcedure
        .input(completeOnboardingSchema)
        .mutation(async ({ ctx, input }) => {
            const [
                [existingPreferences],
                entitlements,
                [activeHabitCountResult],
            ] = await Promise.all([
                ctx.db
                    .select({
                        onboardingCompletedAt:
                            userPreferences.onboardingCompletedAt,
                    })
                    .from(userPreferences)
                    .where(eq(userPreferences.userId, ctx.user.id))
                    .limit(1),
                getEntitlementsForUserId(ctx.db, ctx.user.id),
                ctx.db
                    .select({ count: count() })
                    .from(habits)
                    .where(
                        and(
                            eq(habits.userId, ctx.user.id),
                            isNull(habits.archivedAt),
                            isNull(habits.deletedAt),
                        ),
                    )
                    .limit(1),
            ]);

            if (existingPreferences?.onboardingCompletedAt) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Onboarding has already been completed.",
                });
            }

            const currentActiveHabitCount = activeHabitCountResult?.count ?? 0;

            if (
                entitlements.maxActiveHabits !== null &&
                currentActiveHabitCount + input.starterHabits.length >
                    entitlements.maxActiveHabits
            ) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: `Your current plan supports up to ${entitlements.maxActiveHabits} active habits.`,
                });
            }

            const onboardingCompletedAt = new Date();

            await ctx.db.transaction(async (tx) => {
                await tx
                    .insert(userPreferences)
                    .values({
                        userId: ctx.user.id,
                        timezone: input.timezone,
                        preferredCheckInTime: input.preferredCheckInTime,
                        weeklyReviewDay: input.weeklyReviewDay,
                        reminderEmailEnabled: false,
                        onboardingCompletedAt,
                    })
                    .onConflictDoUpdate({
                        target: userPreferences.userId,
                        set: {
                            timezone: input.timezone,
                            preferredCheckInTime: input.preferredCheckInTime,
                            weeklyReviewDay: input.weeklyReviewDay,
                            onboardingCompletedAt,
                            updatedAt: new Date(),
                        },
                    });

                if (input.starterHabits.length > 0) {
                    await tx.insert(habits).values(
                        input.starterHabits.map((habit) => ({
                            userId: ctx.user.id,
                            name: habit.name,
                            description: habit.description,
                            color: habit.color,
                            icon: habit.icon ?? null,
                            category: habit.category ?? "other",
                            goalType: habit.goalType ?? "binary",
                            targetValue:
                                habit.goalType && habit.goalType !== "binary"
                                    ? habit.targetValue
                                    : null,
                            targetUnit:
                                habit.goalType && habit.goalType !== "binary"
                                    ? habit.targetUnit
                                    : null,
                            reminderEnabled: habit.reminderEnabled ?? false,
                            frequencyType: habit.frequencyType,
                            frequencyDaysOfWeek:
                                habit.frequencyType === "weekly"
                                    ? habit.frequencyDaysOfWeek
                                    : null,
                            frequencyInterval:
                                habit.frequencyType === "custom"
                                    ? habit.frequencyInterval
                                    : null,
                            frequencyUnit:
                                habit.frequencyType === "custom"
                                    ? habit.frequencyUnit
                                    : null,
                        })),
                    );
                }
            });

            await logLifecycleEvent(
                ctx.db,
                ctx.user.id,
                "onboarding_completed",
                {
                    starterHabitsCount: input.starterHabits.length,
                },
            );

            if (
                currentActiveHabitCount === 0 &&
                input.starterHabits.length > 0
            ) {
                const hasFirstHabitEvent = await hasLifecycleEvent(
                    ctx.db,
                    ctx.user.id,
                    "first_habit_created",
                );

                if (!hasFirstHabitEvent) {
                    await logLifecycleEvent(
                        ctx.db,
                        ctx.user.id,
                        "first_habit_created",
                        { source: "onboarding" },
                    );
                }
            }

            return {
                createdHabitCount: input.starterHabits.length,
                onboardingCompletedAt,
            };
        }),

    updatePreferences: protectedProcedure
        .input(updateUserPreferencesSchema)
        .mutation(async ({ ctx, input }) => {
            const [[existingPreferences], entitlements] = await Promise.all([
                ctx.db
                    .select({
                        reminderEmailEnabled:
                            userPreferences.reminderEmailEnabled,
                    })
                    .from(userPreferences)
                    .where(eq(userPreferences.userId, ctx.user.id))
                    .limit(1),
                getEntitlementsForUserId(ctx.db, ctx.user.id),
            ]);

            if (input.reminderEmailEnabled && !entitlements.canUseReminders) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message:
                        "Email reminders are available on Pro and Lifetime plans.",
                });
            }

            await ctx.db
                .insert(userPreferences)
                .values({
                    userId: ctx.user.id,
                    timezone: input.timezone,
                    preferredCheckInTime: input.preferredCheckInTime,
                    weeklyReviewDay: input.weeklyReviewDay,
                    reminderEmailEnabled: input.reminderEmailEnabled,
                    onboardingCompletedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: userPreferences.userId,
                    set: {
                        timezone: input.timezone,
                        preferredCheckInTime: input.preferredCheckInTime,
                        weeklyReviewDay: input.weeklyReviewDay,
                        reminderEmailEnabled: input.reminderEmailEnabled,
                        updatedAt: new Date(),
                    },
                });

            if (
                input.reminderEmailEnabled &&
                !existingPreferences?.reminderEmailEnabled
            ) {
                const alreadyLogged = await hasLifecycleEvent(
                    ctx.db,
                    ctx.user.id,
                    "reminder_opt_in",
                );

                if (!alreadyLogged) {
                    await logLifecycleEvent(
                        ctx.db,
                        ctx.user.id,
                        "reminder_opt_in",
                        { channel: "email" },
                    );
                }
            }

            return {
                preferredCheckInTime: input.preferredCheckInTime,
                weeklyReviewDay: input.weeklyReviewDay,
                reminderEmailEnabled: input.reminderEmailEnabled,
            };
        }),
});
