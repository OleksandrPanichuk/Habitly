import { db } from "@/db";
import { completions, habits, userPreferences, users } from "@/db/schema";
import { sendHabitReminderEmail } from "@/lib/email";
import { getEntitlementsForTier } from "@/lib/entitlements";
import { logLifecycleEvent } from "@/lib/lifecycle";
import { getAppUrl } from "@/lib/stripe";
import {
    getHabitTargetLabel,
    isHabitCompleteForValue,
    isHabitScheduledOn,
    toDateKey,
} from "@/lib/utils";
import { and, eq, isNull } from "drizzle-orm";

function getLocalTimeParts(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });

    const parts = formatter.formatToParts(date);
    const getValue = (type: string) =>
        Number(parts.find((part) => part.type === type)?.value ?? "0");

    return {
        year: getValue("year"),
        month: getValue("month"),
        day: getValue("day"),
        hour: getValue("hour"),
        minute: getValue("minute"),
    };
}

function isReminderWindowOpen(
    now: Date,
    timezone: string,
    preferredCheckInTime: string,
) {
    const [targetHour, targetMinute] = preferredCheckInTime
        .split(":")
        .map(Number);
    const local = getLocalTimeParts(now, timezone);
    const localMinutes = local.hour * 60 + local.minute;
    const targetMinutes = targetHour * 60 + targetMinute;

    return localMinutes >= targetMinutes && localMinutes < targetMinutes + 15;
}

export async function POST(request: Request) {
    const secret = process.env.REMINDER_CRON_SECRET;

    if (!secret) {
        return new Response(
            JSON.stringify({ error: "Missing REMINDER_CRON_SECRET" }),
            {
                status: 500,
            },
        );
    }

    if (request.headers.get("x-reminder-secret") !== secret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
        });
    }

    const now = new Date();
    const preferencesRows = await db
        .select({
            userId: userPreferences.userId,
            timezone: userPreferences.timezone,
            preferredCheckInTime: userPreferences.preferredCheckInTime,
            reminderLastSentOn: userPreferences.reminderLastSentOn,
            email: users.email,
            name: users.name,
            subscriptionTier: users.subscriptionTier,
        })
        .from(userPreferences)
        .innerJoin(users, eq(users.id, userPreferences.userId))
        .where(eq(userPreferences.reminderEmailEnabled, true));

    let sentCount = 0;

    for (const preferences of preferencesRows) {
        const entitlements = getEntitlementsForTier(
            preferences.subscriptionTier,
        );
        if (!entitlements.canUseReminders) {
            continue;
        }

        const local = getLocalTimeParts(now, preferences.timezone);
        const localToday = new Date(
            Date.UTC(local.year, local.month - 1, local.day),
        );

        if (
            preferences.reminderLastSentOn &&
            toDateKey(preferences.reminderLastSentOn) === toDateKey(localToday)
        ) {
            continue;
        }

        if (
            !isReminderWindowOpen(
                now,
                preferences.timezone,
                preferences.preferredCheckInTime,
            )
        ) {
            continue;
        }

        const userHabits = await db
            .select()
            .from(habits)
            .where(
                and(
                    eq(habits.userId, preferences.userId),
                    eq(habits.reminderEnabled, true),
                    isNull(habits.archivedAt),
                    isNull(habits.deletedAt),
                ),
            );

        const completionsForToday = await db
            .select({
                habitId: completions.habitId,
                value: completions.value,
                date: completions.date,
            })
            .from(completions)
            .innerJoin(habits, eq(habits.id, completions.habitId))
            .where(
                and(
                    eq(habits.userId, preferences.userId),
                    eq(completions.date, localToday),
                ),
            );

        const pendingHabits = userHabits
            .filter((habit) => isHabitScheduledOn(habit, localToday))
            .filter(
                (habit) =>
                    !completionsForToday.some(
                        (completion) =>
                            completion.habitId === habit.id &&
                            isHabitCompleteForValue(
                                habit,
                                completion.value,
                                completion.date,
                            ),
                    ),
            );

        if (pendingHabits.length === 0) {
            continue;
        }

        await sendHabitReminderEmail(preferences.email, {
            userName: preferences.name,
            dashboardUrl: `${getAppUrl()}/habits`,
            preferredCheckInTime: preferences.preferredCheckInTime,
            habits: pendingHabits.slice(0, 6).map((habit) => ({
                name: habit.name,
                icon: habit.icon,
                targetLabel: getHabitTargetLabel(habit),
            })),
        });

        await db
            .update(userPreferences)
            .set({ reminderLastSentOn: localToday, updatedAt: new Date() })
            .where(eq(userPreferences.userId, preferences.userId));

        await logLifecycleEvent(db, preferences.userId, "reminder_email_sent", {
            habitCount: pendingHabits.length,
            preferredCheckInTime: preferences.preferredCheckInTime,
        });

        sentCount++;
    }

    return new Response(JSON.stringify({ sentCount }), { status: 200 });
}
