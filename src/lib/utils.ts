import type { THabit } from "@/db/schema";


export function parseDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function toDateKey(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function getDatesInRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];

    const current = new Date(
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()),
    );

    const endNorm = new Date(
        Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()),
    );

    while (current <= endNorm) {
        dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
}

export function getEffectiveStart(
    habit: THabit,
    firstCompletionDate?: Date,
): Date {
    const createdUtc = new Date(
        Date.UTC(
            habit.createdAt.getUTCFullYear(),
            habit.createdAt.getUTCMonth(),
            habit.createdAt.getUTCDate(),
        ),
    );

    if (!firstCompletionDate) return createdUtc;

    const firstCompletionUtc = new Date(
        Date.UTC(
            firstCompletionDate.getUTCFullYear(),
            firstCompletionDate.getUTCMonth(),
            firstCompletionDate.getUTCDate(),
        ),
    );

    return firstCompletionUtc < createdUtc ? firstCompletionUtc : createdUtc;
}

export function isHabitScheduledOn(
    habit: THabit,
    date: Date,
    effectiveStart?: Date,
): boolean {
    const floorDate =
        effectiveStart ??
        new Date(
            Date.UTC(
                habit.createdAt.getUTCFullYear(),
                habit.createdAt.getUTCMonth(),
                habit.createdAt.getUTCDate(),
            ),
        );

    const dateNorm = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

    if (dateNorm < floorDate) return false;

    const dayOfWeek = date.getUTCDay();

    switch (habit.frequencyType) {
        case "daily":
            return true;
        case "weekly":
            return habit.frequencyDaysOfWeek?.includes(dayOfWeek) ?? false;
        case "custom": {
            if (!habit.frequencyInterval || !habit.frequencyUnit) return false;

            const habitStart = new Date(
                Date.UTC(
                    habit.createdAt.getUTCFullYear(),
                    habit.createdAt.getUTCMonth(),
                    habit.createdAt.getUTCDate(),
                ),
            );

            const daysDiff = Math.round(
                (date.getTime() - habitStart.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysDiff < 0) return false;

            const intervalDays =
                habit.frequencyUnit === "weeks"
                    ? habit.frequencyInterval * 7
                    : habit.frequencyInterval;

            return daysDiff % intervalDays === 0;
        }
    }
}

export function calculateStreaks(
    scheduledDates: Date[],
    completedDatesSet: Set<string>,
): {
    currentStreak: number;
    longestStreak: number;
} {
    if (scheduledDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    const sorted = [...scheduledDates].sort(
        (a, b) => a.getTime() - b.getTime(),
    );

    let longestStreak = 0;
    let run = 0;

    for (const date of sorted) {
        if (completedDatesSet.has(toDateKey(date))) {
            run++;
            if (run > longestStreak) longestStreak = run;
        } else {
            run = 0;
        }
    }

    const now = new Date();
    const todayKey = toDateKey(
        new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        ),
    );
    let startIdx = sorted.length - 1;

    if (
        startIdx >= 0 &&
        toDateKey(sorted[startIdx]) === todayKey &&
        !completedDatesSet.has(todayKey)
    ) {
        startIdx--;
    }

    let currentStreak = 0;

    for (let i = startIdx; i >= 0; i--) {
        if (completedDatesSet.has(toDateKey(sorted[i]))) {
            currentStreak++;
        } else {
            break;
        }
    }

    return { currentStreak, longestStreak };
}
