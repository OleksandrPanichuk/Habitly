"use client";

import { Button, Chip, Tooltip } from "@heroui/react";
import { motion } from "framer-motion";
import {
    ArchiveIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    LayoutTemplateIcon,
    PlusIcon,
    SparklesIcon,
} from "lucide-react";

interface IHabitsHeaderProps {
    date: Date;
    onDateChange: (date: Date) => void;
    onCreateHabit: () => void;
    onOpenTemplates: () => void;
    totalHabits: number;
    completedHabits: number;
    showArchived?: boolean;
    onHideArchived?: () => void;
}

const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const MONTH_NAMES_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const MONTH_NAMES_LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function utcToday(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function formatUtcLong(date: Date): string {
    return `${MONTH_NAMES_LONG[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function formatUtcLabel(date: Date): string {
    return `${DAY_NAMES[date.getUTCDay()]}, ${MONTH_NAMES_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function isSameUtcDay(a: Date, b: Date): boolean {
    return (
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate()
    );
}

function formatDateLabel(date: Date): string {
    const today = utcToday();
    if (isSameUtcDay(date, today)) return "Today";

    const yesterday = new Date(
        Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate() - 1,
        ),
    );
    if (isSameUtcDay(date, yesterday)) return "Yesterday";

    return formatUtcLabel(date);
}

function getMotivationalMessage(completed: number, total: number): string {
    if (total === 0) return "Start building habits!";
    const pct = total > 0 ? completed / total : 0;
    if (pct === 0) return "Let's get started!";
    if (pct < 0.5) return "Keep going!";
    if (pct < 1) return "Almost there!";
    return "All done — great job!";
}

export const HabitsHeader = ({
    date,
    onDateChange,
    onCreateHabit,
    onOpenTemplates,
    totalHabits,
    completedHabits,
    showArchived = false,
    onHideArchived,
}: IHabitsHeaderProps) => {
    const progress =
        totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
    const dateLabel = formatDateLabel(date);
    const todayFlag = isSameUtcDay(date, utcToday());

    const goBack = () => {
        onDateChange(
            new Date(
                Date.UTC(
                    date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate() - 1,
                ),
            ),
        );
    };

    const goForward = () => {
        if (todayFlag) return;
        onDateChange(
            new Date(
                Date.UTC(
                    date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate() + 1,
                ),
            ),
        );
    };

    const goToday = () => onDateChange(utcToday());

    if (showArchived) {
        return (
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                        <ArchiveIcon size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">
                                Archived habits
                            </h1>
                            <Chip
                                size="sm"
                                variant="flat"
                                className="bg-warning/10 text-warning"
                            >
                                {totalHabits}
                            </Chip>
                        </div>
                        <p className="mt-1 text-sm text-foreground-400">
                            Keep paused habits here without letting them crowd
                            the daily checklist.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    {onHideArchived ? (
                        <Button variant="flat" onPress={onHideArchived}>
                            Back to active habits
                        </Button>
                    ) : null}
                    <Button
                        color="primary"
                        startContent={<PlusIcon size={16} />}
                        onPress={onCreateHabit}
                        className="font-semibold shadow-lg shadow-primary/25"
                    >
                        New Habit
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <Tooltip content="Previous day" placement="bottom">
                        <Button
                            isIconOnly
                            variant="flat"
                            size="sm"
                            onPress={goBack}
                            className="text-foreground-500"
                        >
                            <ChevronLeftIcon size={16} />
                        </Button>
                    </Tooltip>

                    <div className="flex w-48 flex-col items-center">
                        <motion.h2
                            key={date.toISOString()}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-xl font-bold tracking-tight text-foreground"
                            suppressHydrationWarning
                        >
                            {dateLabel}
                        </motion.h2>
                        <span
                            className="text-xs text-foreground-400"
                            suppressHydrationWarning
                        >
                            {formatUtcLong(date)}
                        </span>
                    </div>

                    <Tooltip content="Next day" placement="bottom">
                        <Button
                            isIconOnly
                            variant="flat"
                            size="sm"
                            onPress={goForward}
                            isDisabled={todayFlag}
                            className="text-foreground-500"
                        >
                            <ChevronRightIcon size={16} />
                        </Button>
                    </Tooltip>

                    {!todayFlag && (
                        <Button
                            size="sm"
                            variant="light"
                            color="primary"
                            onPress={goToday}
                            className="ml-1 text-xs font-medium"
                        >
                            Today
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <Tooltip
                        content="Browse templates"
                        placement="bottom"
                        delay={400}
                    >
                        <Button
                            isIconOnly
                            variant="flat"
                            size="sm"
                            onPress={onOpenTemplates}
                            className="text-foreground-400 hover:text-foreground"
                            aria-label="Habit templates"
                        >
                            <LayoutTemplateIcon size={16} />
                        </Button>
                    </Tooltip>
                    <Button
                        color="primary"
                        startContent={<PlusIcon size={16} />}
                        onPress={onCreateHabit}
                        className="font-semibold shadow-lg shadow-primary/25"
                    >
                        New Habit
                    </Button>
                </div>
            </div>

            {totalHabits > 0 && !showArchived ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm"
                >
                    <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-secondary/15 blur-2xl" />

                    <div className="relative flex items-center gap-4">
                        <div className="relative shrink-0">
                            <svg
                                width="56"
                                height="56"
                                className="-rotate-90"
                                aria-hidden="true"
                            >
                                <circle
                                    cx="28"
                                    cy="28"
                                    r="22"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    className="text-white/10"
                                />
                                <motion.circle
                                    cx="28"
                                    cy="28"
                                    r="22"
                                    fill="none"
                                    stroke="url(#progressGrad)"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 22}
                                    initial={{
                                        strokeDashoffset: 2 * Math.PI * 22,
                                    }}
                                    animate={{
                                        strokeDashoffset:
                                            2 *
                                            Math.PI *
                                            22 *
                                            (1 - progress / 100),
                                    }}
                                    transition={{
                                        duration: 0.6,
                                        ease: "easeOut",
                                    }}
                                />
                                <defs>
                                    <linearGradient
                                        id="progressGrad"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="0%"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor="hsl(var(--heroui-primary))"
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor="hsl(var(--heroui-secondary))"
                                        />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                                {progress}%
                            </span>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                    {completedHabits} / {totalHabits} completed
                                </span>
                                {progress === 100 ? (
                                    <Chip
                                        size="sm"
                                        color="success"
                                        variant="flat"
                                        startContent={
                                            <SparklesIcon size={10} />
                                        }
                                        classNames={{ base: "h-5" }}
                                    >
                                        Perfect day!
                                    </Chip>
                                ) : null}
                            </div>

                            <p className="text-xs text-foreground-400">
                                {getMotivationalMessage(
                                    completedHabits,
                                    totalHabits,
                                )}
                            </p>

                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                <motion.div
                                    className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{
                                        duration: 0.6,
                                        ease: "easeOut",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : null}
        </div>
    );
};
