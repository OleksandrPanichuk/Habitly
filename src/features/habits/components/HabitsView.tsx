"use client";

import { Button, Chip, Tooltip } from "@heroui/react";
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArchiveIcon, NotebookPenIcon, RefreshCcwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { HABIT_CATEGORIES } from "@/features/habits/constants";
import {
    calculateStreaks,
    getDatesInRange,
    isHabitCompleteForValue,
    isHabitScheduledOn,
    toDateKey,
} from "@/lib/utils";
import type { THabitFormValues } from "@/schemas";
import { habitUpdateSchema } from "@/schemas";
import { useTRPC } from "@/trpc/client";
import type { THabitWithStatus } from "@/types";
import { HabitDeleteDialog } from "./HabitDeleteDialog";
import { HabitDialog } from "./HabitDialog";
import { HabitsHeader } from "./HabitsHeader";
import { HabitsList } from "./HabitsList";
import { HabitStatsModal } from "./HabitStatsModal";
import { HabitTemplatesDialog } from "./HabitTemplatesDialog";

type TabState = "ALL" | "COMPLETED" | "INCOMPLETE";

const TABS: { key: TabState; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "COMPLETED", label: "Completed" },
    { key: "INCOMPLETE", label: "Incomplete" },
];

export const HabitsView = ({ date: initialDate }: { date: string }) => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const [date, setDate] = useState<Date>(() => {
        const now = initialDate ? new Date(initialDate) : new Date();
        return new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
    });
    const [tab, setTab] = useState<TabState>("ALL");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [templateDefaults, setTemplateDefaults] =
        useState<THabitFormValues | null>(null);

    const [editHabit, setEditHabit] = useState<THabitWithStatus | null>(null);
    const [deleteHabit, setDeleteHabit] = useState<THabitWithStatus | null>(
        null,
    );
    const [statsHabit, setStatsHabit] = useState<THabitWithStatus | null>(null);
    const [statsOpen, setStatsOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const { data: preferences } = useQuery(
        trpc.onboarding.getStatus.queryOptions({}),
    );
    const { data: coachState } = useQuery(
        trpc.stats.getCoachState.queryOptions({}),
    );

    const { data: habits = [] } = useQuery({
        ...trpc.habits.list.queryOptions({
            date,
            includeArchived: showArchived,
        }),
        placeholderData: keepPreviousData,
    });

    const streakStart = useMemo(
        () =>
            new Date(
                Date.UTC(
                    date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate() - 90,
                ),
            ),
        [date],
    );
    const streakEnd = useMemo(
        () =>
            new Date(
                Date.UTC(
                    date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate(),
                ),
            ),
        [date],
    );

    const { data: rangeCompletions = [] } = useQuery({
        ...trpc.completions.getByDateRange.queryOptions({
            startDate: streakStart,
            endDate: streakEnd,
        }),
        placeholderData: keepPreviousData,
    });

    const prefetchDate = useCallback(
        (d: Date) => {
            const utc = new Date(
                Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
            );
            void queryClient.prefetchQuery(
                trpc.habits.list.queryOptions({
                    date: utc,
                    includeArchived: showArchived,
                }),
            );
        },
        [queryClient, trpc, showArchived],
    );

    useEffect(() => {
        const prev = new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate() - 1,
            ),
        );
        const next = new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate() + 1,
            ),
        );
        prefetchDate(prev);
        prefetchDate(next);
    }, [date, prefetchDate]);

    const streaks = useMemo(() => {
        const allDates = getDatesInRange(streakStart, streakEnd);
        const result: Record<string, number> = {};

        for (const habit of habits) {
            const completedKeys = new Set(
                rangeCompletions
                    .filter(
                        (c) =>
                            c.habitId === habit.id &&
                            isHabitCompleteForValue(habit, c.value, c.date),
                    )
                    .map((c) => toDateKey(new Date(c.date))),
            );
            const scheduledDates = allDates.filter((d) =>
                isHabitScheduledOn(habit, d),
            );
            const { currentStreak } = calculateStreaks(
                scheduledDates,
                completedKeys,
            );
            result[habit.id] = currentStreak;
        }

        return result;
    }, [habits, rangeCompletions, streakStart, streakEnd]);

    const bannerStreak = useMemo(() => {
        if (habits.length === 0) return 0;
        if (
            !habits.every((habit) =>
                isHabitCompleteForValue(
                    habit,
                    habit.completionValue,
                    habit.completedAt,
                ),
            )
        )
            return 0;
        return Math.min(...habits.map((h) => streaks[h.id] ?? 0));
    }, [habits, streaks]);

    const { mutate: createHabit, isPending: isCreating } = useMutation(
        trpc.habits.create.mutationOptions({
            onSuccess: (newHabit) => {
                queryClient.invalidateQueries({
                    queryKey: trpc.habits.list.queryKey({
                        date,
                        includeArchived: showArchived,
                    }),
                });
                setCreateOpen(false);
                setTemplateDefaults(null);
                toast.success(`"${newHabit.name}" created!`);
            },
            onError: () => {
                toast.error("Failed to create habit. Please try again.");
            },
        }),
    );

    const { mutate: updateHabit, isPending: isUpdating } = useMutation(
        trpc.habits.update.mutationOptions({
            onSuccess: (updated) => {
                queryClient.invalidateQueries({
                    queryKey: trpc.habits.list.queryKey({
                        date,
                        includeArchived: showArchived,
                    }),
                });
                setEditHabit(null);
                toast.success(`"${updated.name}" updated!`);
            },
            onError: () => {
                toast.error("Failed to update habit. Please try again.");
            },
        }),
    );

    const { mutate: deleteHabitMutation, isPending: isDeleting } = useMutation(
        trpc.habits.delete.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: trpc.habits.list.queryKey({
                        date,
                        includeArchived: showArchived,
                    }),
                });
                const name = deleteHabit?.name;
                setDeleteHabit(null);
                toast.success(`"${name}" deleted.`);
            },
            onError: () => {
                toast.error("Failed to delete habit. Please try again.");
            },
        }),
    );

    const { mutate: archiveHabitMutation } = useMutation(
        trpc.habits.archive.mutationOptions({
            onSuccess: (updated) => {
                queryClient.invalidateQueries({
                    queryKey: trpc.habits.list.queryKey({ date }),
                });
                const isArchived = !!updated.archivedAt;
                toast.success(
                    isArchived
                        ? `"${updated.name}" archived.`
                        : `"${updated.name}" restored.`,
                );
            },
            onError: () => {
                toast.error("Failed to archive habit. Please try again.");
            },
        }),
    );

    const handleCreateSubmit = (values: THabitFormValues) => {
        createHabit(values);
    };

    const handleEditSubmit = (values: THabitFormValues) => {
        if (!editHabit) return;
        const parsed = habitUpdateSchema.safeParse({
            ...values,
            id: editHabit.id,
        });
        if (!parsed.success) return;
        updateHabit(parsed.data);
    };

    const handleDeleteConfirm = () => {
        if (!deleteHabit) return;
        deleteHabitMutation({ id: deleteHabit.id });
    };

    const handleOpenStats = (habit: THabitWithStatus) => {
        setStatsHabit(habit);
        setStatsOpen(true);
    };

    const handleStatsOpenChange = (open: boolean) => {
        setStatsOpen(open);
        if (!open) setStatsHabit(null);
    };

    const handleArchive = (habit: THabitWithStatus) => {
        archiveHabitMutation({ id: habit.id, archive: !habit.archivedAt });
    };

    const handleTemplateSelect = (values: THabitFormValues) => {
        setTemplateDefaults(values);
        setCreateOpen(true);
    };

    const filteredHabits = useMemo(
        () =>
            habits.filter((habit) => {
                if (activeCategory && habit.category !== activeCategory)
                    return false;
                if (tab === "ALL") return true;
                const isCompleted = isHabitCompleteForValue(
                    habit,
                    habit.completionValue,
                    habit.completedAt,
                );
                if (tab === "COMPLETED") return isCompleted;
                return !isCompleted;
            }),
        [habits, tab, activeCategory],
    );

    const completedCount = habits.filter((habit) =>
        isHabitCompleteForValue(
            habit,
            habit.completionValue,
            habit.completedAt,
        ),
    ).length;

    const presentCategories = useMemo(() => {
        const cats = new Set(habits.map((h) => h.category ?? "other"));
        return HABIT_CATEGORIES.filter((c) => cats.has(c.value));
    }, [habits]);

    const guidedTitle = useMemo(() => {
        if (showArchived) {
            return undefined;
        }

        if ((coachState?.onboardingDay ?? 1) <= 7) {
            return `Day ${coachState?.onboardingDay ?? 1}: keep the system light.`;
        }

        if (coachState?.missedYesterday.length) {
            return "Recovery mode: close yesterday's gap today.";
        }

        if (coachState?.reflectionCandidates.length) {
            return "Lock in the win with a quick reflection.";
        }

        return undefined;
    }, [coachState, showArchived]);

    const guidedBody = useMemo(() => {
        if (showArchived) {
            return undefined;
        }

        if ((coachState?.onboardingDay ?? 1) <= 7) {
            return habits.length === 0
                ? "Start with one or two habits you can hit today. Momentum matters more than volume."
                : `You have ${habits.length} active habit${habits.length === 1 ? "" : "s"}. Stay consistent before you expand.`;
        }

        if (coachState?.missedYesterday.length) {
            return `Yesterday slipped on ${coachState.missedYesterday.join(", ")}. Recover with the smallest next action today.`;
        }

        if (coachState?.reflectionCandidates.length) {
            return `Add a short note for ${coachState.reflectionCandidates.join(", ")} while the context is still fresh.`;
        }

        return undefined;
    }, [coachState, habits.length, showArchived]);

    const showCoachRail =
        !showArchived &&
        !!(
            (guidedTitle && guidedBody) ||
            coachState?.missedYesterday.length ||
            coachState?.reflectionCandidates.length
        );

    return (
        <>
            <HabitDialog
                open={createOpen}
                onOpenChange={(open) => {
                    if (!open) setTemplateDefaults(null);
                    setCreateOpen(open);
                }}
                habit={
                    templateDefaults
                        ? ({
                              ...templateDefaults,
                              id: "",
                              userId: "",
                              createdAt: new Date(),
                              updatedAt: new Date(),
                              completedAt: null,
                              completionNote: null,
                              archivedAt: null,
                              goalType: templateDefaults.goalType ?? "binary",
                              targetValue: templateDefaults.targetValue ?? null,
                              targetUnit: templateDefaults.targetUnit ?? null,
                              reminderEnabled:
                                  templateDefaults.reminderEnabled ?? false,
                              completionValue: null,
                              frequencyDaysOfWeek:
                                  templateDefaults.frequencyDaysOfWeek ?? null,
                              frequencyInterval:
                                  templateDefaults.frequencyInterval ?? null,
                              frequencyUnit:
                                  templateDefaults.frequencyUnit ?? null,
                              description: templateDefaults.description ?? null,
                              icon: templateDefaults.icon ?? null,
                          } as THabitWithStatus)
                        : null
                }
                onSubmit={handleCreateSubmit}
                isLoading={isCreating}
            />

            <HabitDialog
                open={!!editHabit}
                onOpenChange={(open) => {
                    if (!open) setEditHabit(null);
                }}
                habit={editHabit}
                onSubmit={handleEditSubmit}
                isLoading={isUpdating}
            />

            <HabitDeleteDialog
                open={!!deleteHabit}
                onOpenChange={(open) => {
                    if (!open) setDeleteHabit(null);
                }}
                habit={deleteHabit}
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
            />

            <HabitStatsModal
                open={statsOpen}
                onOpenChange={handleStatsOpenChange}
                habit={statsHabit}
            />

            <HabitTemplatesDialog
                open={templatesOpen}
                onOpenChange={setTemplatesOpen}
                onSelect={handleTemplateSelect}
            />

            <div className="min-h-screen px-4 pt-8 pb-16 sm:px-6">
                <div className="mx-auto max-w-6xl space-y-6">
                    <HabitsHeader
                        date={date}
                        onDateChange={setDate}
                        onCreateHabit={() => {
                            setTemplateDefaults(null);
                            setCreateOpen(true);
                        }}
                        onOpenTemplates={() => setTemplatesOpen(true)}
                        totalHabits={habits.length}
                        completedHabits={completedCount}
                        showArchived={showArchived}
                        onHideArchived={
                            showArchived
                                ? () => setShowArchived(false)
                                : undefined
                        }
                    />

                    <div
                        className={[
                            "grid gap-6 lg:items-start",
                            showCoachRail
                                ? "lg:grid-cols-[300px_minmax(0,1fr)]"
                                : "grid-cols-1",
                        ].join(" ")}
                    >
                        {showCoachRail ? (
                            <aside className="space-y-3 lg:sticky lg:top-24">
                                {guidedTitle && guidedBody ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="rounded-3xl border border-white/10 bg-white/5 p-4"
                                    >
                                        <p className="text-sm font-semibold text-foreground">
                                            {guidedTitle}
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-foreground-400">
                                            {guidedBody}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {preferences?.preferredCheckInTime ? (
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    className="bg-white/10 text-foreground-500"
                                                >
                                                    Check-in{" "}
                                                    {
                                                        preferences.preferredCheckInTime
                                                    }
                                                </Chip>
                                            ) : null}
                                            <Chip
                                                size="sm"
                                                color={
                                                    preferences?.reminderEmailEnabled
                                                        ? "primary"
                                                        : "default"
                                                }
                                                variant="flat"
                                            >
                                                {preferences?.reminderEmailEnabled
                                                    ? "Email reminders on"
                                                    : "Reminders off"}
                                            </Chip>
                                        </div>
                                    </motion.div>
                                ) : null}

                                {coachState?.missedYesterday.length ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            duration: 0.2,
                                            delay: 0.04,
                                        }}
                                        className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                                                <RefreshCcwIcon size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-amber-200">
                                                    Recovery prompt
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                                                    You missed{" "}
                                                    {coachState.missedYesterday.join(
                                                        ", ",
                                                    )}{" "}
                                                    yesterday. Recover with the
                                                    smallest useful version
                                                    today.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : null}

                                {coachState?.reflectionCandidates.length ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            duration: 0.2,
                                            delay: 0.08,
                                        }}
                                        className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200">
                                                <NotebookPenIcon size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-cyan-200">
                                                    Reflection loop
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-cyan-100/80">
                                                    Add a quick note for{" "}
                                                    {coachState.reflectionCandidates.join(
                                                        ", ",
                                                    )}{" "}
                                                    while the context is still
                                                    fresh.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : null}
                            </aside>
                        ) : null}

                        <section className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-wrap items-center justify-between gap-3"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    {!showArchived &&
                                    habits.length > 0 &&
                                    presentCategories.length > 1 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActiveCategory(null)
                                                }
                                                className={[
                                                    "text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                                                    activeCategory === null
                                                        ? "border-primary/40 bg-primary/10 text-primary"
                                                        : "border-white/10 text-foreground-500 hover:border-white/20",
                                                ].join(" ")}
                                            >
                                                All
                                            </button>
                                            {presentCategories.map((cat) => (
                                                <button
                                                    key={cat.value}
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveCategory(
                                                            activeCategory ===
                                                                cat.value
                                                                ? null
                                                                : cat.value,
                                                        )
                                                    }
                                                    className={[
                                                        "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                                                        activeCategory ===
                                                        cat.value
                                                            ? "scale-105"
                                                            : "border-white/10 text-foreground-500 hover:border-white/20",
                                                    ].join(" ")}
                                                    style={
                                                        activeCategory ===
                                                        cat.value
                                                            ? {
                                                                  backgroundColor: `${cat.color}22`,
                                                                  color: cat.color,
                                                                  borderColor: `${cat.color}44`,
                                                              }
                                                            : {}
                                                    }
                                                >
                                                    <span>{cat.icon}</span>
                                                    <span>{cat.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}

                                    {showArchived ? (
                                        <p className="text-sm text-foreground-400">
                                            Restore habits when they belong in
                                            your routine again.
                                        </p>
                                    ) : null}
                                </div>

                                <div className="ml-auto flex items-center gap-1.5">
                                    <Tooltip
                                        content={
                                            showArchived
                                                ? "Hide archived"
                                                : "Show archived"
                                        }
                                        placement="bottom"
                                        delay={400}
                                    >
                                        <Button
                                            size="sm"
                                            variant={
                                                showArchived ? "solid" : "flat"
                                            }
                                            color={
                                                showArchived
                                                    ? "warning"
                                                    : "default"
                                            }
                                            onPress={() =>
                                                setShowArchived((v) => !v)
                                            }
                                            startContent={
                                                <ArchiveIcon size={14} />
                                            }
                                            className="font-medium"
                                            aria-label="Toggle archived habits"
                                        >
                                            {showArchived
                                                ? "Active habits"
                                                : "Archived"}
                                        </Button>
                                    </Tooltip>
                                </div>
                            </motion.div>

                            {habits.length > 0 && !showArchived && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.1 }}
                                    className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 w-fit"
                                >
                                    {TABS.map(({ key, label }) => {
                                        const count =
                                            key === "ALL"
                                                ? habits.length
                                                : key === "COMPLETED"
                                                  ? completedCount
                                                  : habits.length -
                                                    completedCount;

                                        return (
                                            <Button
                                                key={key}
                                                size="sm"
                                                variant={
                                                    tab === key
                                                        ? "solid"
                                                        : "light"
                                                }
                                                color={
                                                    tab === key
                                                        ? "primary"
                                                        : "default"
                                                }
                                                onPress={() => setTab(key)}
                                                className={[
                                                    "text-xs font-medium px-3 h-7 min-w-fit rounded-xl transition-all",
                                                    tab === key
                                                        ? "shadow-sm"
                                                        : "text-foreground-500 hover:text-foreground",
                                                ].join(" ")}
                                            >
                                                {label}
                                                <span
                                                    className={[
                                                        "ml-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold w-4 h-4",
                                                        tab === key
                                                            ? "bg-white/20 text-white"
                                                            : "bg-white/10 text-foreground-400",
                                                    ].join(" ")}
                                                >
                                                    {count}
                                                </span>
                                            </Button>
                                        );
                                    })}
                                </motion.div>
                            )}

                            {bannerStreak >= 3 && !showArchived && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.25, delay: 0.15 }}
                                    className="flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3"
                                >
                                    <span className="text-2xl select-none">
                                        🔥
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-orange-300">
                                            {bannerStreak}-day streak!
                                        </p>
                                        <p className="text-xs text-orange-400/70">
                                            Keep the momentum going. Don&apos;t
                                            break the chain!
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {showArchived ? (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-3xl border border-warning/15 bg-warning/10 px-4 py-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                                            <ArchiveIcon size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-warning">
                                                Archived stays out of the way
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-warning/80">
                                                Use this space for habits you
                                                are pausing, not deleting.
                                                Restore any habit to move it
                                                back into the main checklist.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : null}

                            {activeCategory && (
                                <motion.div
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <span className="text-xs text-foreground-400">
                                        Filtering by:
                                    </span>
                                    {(() => {
                                        const cat = HABIT_CATEGORIES.find(
                                            (c) => c.value === activeCategory,
                                        );
                                        return cat ? (
                                            <Chip
                                                size="sm"
                                                onClose={() =>
                                                    setActiveCategory(null)
                                                }
                                                classNames={{ base: "h-5" }}
                                                style={{
                                                    backgroundColor: `${cat.color}22`,
                                                    color: cat.color,
                                                }}
                                            >
                                                {cat.icon} {cat.label}
                                            </Chip>
                                        ) : null;
                                    })()}
                                </motion.div>
                            )}

                            <HabitsList
                                data={filteredHabits}
                                date={date}
                                streaks={streaks}
                                tab={tab}
                                includeArchived={showArchived}
                                onEdit={setEditHabit}
                                onDelete={setDeleteHabit}
                                onStats={handleOpenStats}
                                onArchive={handleArchive}
                                onRestore={handleArchive}
                                onCreateHabit={() => {
                                    setTemplateDefaults(null);
                                    setCreateOpen(true);
                                }}
                                onHideArchived={() => setShowArchived(false)}
                                totalHabits={habits.length}
                            />
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
};
