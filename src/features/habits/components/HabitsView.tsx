"use client";

import { Button, Chip, Tooltip } from "@heroui/react";
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArchiveIcon, LayoutTemplateIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { HABIT_CATEGORIES } from "@/features/habits/constants";
import {
    calculateStreaks,
    getDatesInRange,
    isHabitScheduledOn,
    toDateKey,
} from "@/lib/utils";
import type { THabitFormValues } from "@/schemas";
import { habitUpdateSchema } from "@/schemas";
import { useTRPC } from "@/trpc/client";
import type { THabitWithStatus } from "@/types";
import { ExportButton } from "./ExportButton";
import { HabitDeleteDialog } from "./HabitDeleteDialog";
import { HabitDialog } from "./HabitDialog";
import { HabitStatsModal } from "./HabitStatsModal";
import { HabitsHeader } from "./HabitsHeader";
import { HabitsList } from "./HabitsList";
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

    const [date, setDate] = useState<Date>(() => new Date(initialDate));
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
        const prev = new Date(date);
        prev.setUTCDate(prev.getUTCDate() - 1);
        const next = new Date(date);
        next.setUTCDate(next.getUTCDate() + 1);
        prefetchDate(prev);
        prefetchDate(next);
    }, [date, prefetchDate]);

    const streaks = useMemo(() => {
        const allDates = getDatesInRange(streakStart, streakEnd);
        const result: Record<string, number> = {};

        for (const habit of habits) {
            const completedKeys = new Set(
                rangeCompletions
                    .filter((c) => c.habitId === habit.id)
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
        if (!habits.every((h) => !!h.completedAt)) return 0;
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
                if (tab === "COMPLETED") return !!habit.completedAt;
                return !habit.completedAt;
            }),
        [habits, tab, activeCategory],
    );

    const completedCount = habits.filter((h) => !!h.completedAt).length;

    const presentCategories = useMemo(() => {
        const cats = new Set(habits.map((h) => h.category ?? "other"));
        return HABIT_CATEGORIES.filter((c) => cats.has(c.value));
    }, [habits]);

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
                <div className="mx-auto max-w-2xl space-y-6">
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
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-wrap items-center gap-2"
                    >
                        {habits.length > 0 &&
                            !showArchived &&
                            presentCategories.length > 1 && (
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setActiveCategory(null)}
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
                                                    activeCategory === cat.value
                                                        ? null
                                                        : cat.value,
                                                )
                                            }
                                            className={[
                                                "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                                                activeCategory === cat.value
                                                    ? "scale-105"
                                                    : "border-white/10 text-foreground-500 hover:border-white/20",
                                            ].join(" ")}
                                            style={
                                                activeCategory === cat.value
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
                            )}

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
                                    isIconOnly
                                    size="sm"
                                    variant={showArchived ? "solid" : "flat"}
                                    color={showArchived ? "warning" : "default"}
                                    onPress={() => setShowArchived((v) => !v)}
                                    className="h-8 w-8"
                                    aria-label="Toggle archived habits"
                                >
                                    <ArchiveIcon size={14} />
                                </Button>
                            </Tooltip>

                            <Tooltip
                                content="Browse templates"
                                placement="bottom"
                                delay={400}
                            >
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="flat"
                                    onPress={() => setTemplatesOpen(true)}
                                    className="h-8 w-8 text-foreground-400 hover:text-foreground"
                                    aria-label="Habit templates"
                                >
                                    <LayoutTemplateIcon size={14} />
                                </Button>
                            </Tooltip>

                            <ExportButton />
                        </div>
                    </motion.div>

                    {habits.length > 0 && !showArchived && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit"
                        >
                            {TABS.map(({ key, label }) => {
                                const count =
                                    key === "ALL"
                                        ? habits.length
                                        : key === "COMPLETED"
                                          ? completedCount
                                          : habits.length - completedCount;

                                return (
                                    <Button
                                        key={key}
                                        size="sm"
                                        variant={
                                            tab === key ? "solid" : "light"
                                        }
                                        color={
                                            tab === key ? "primary" : "default"
                                        }
                                        onPress={() => setTab(key)}
                                        className={[
                                            "text-xs font-medium px-3 h-7 min-w-fit rounded-lg transition-all",
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
                            <span className="text-2xl select-none">🔥</span>
                            <div>
                                <p className="text-sm font-semibold text-orange-300">
                                    {bannerStreak}-day streak!
                                </p>
                                <p className="text-xs text-orange-400/70">
                                    Keep the momentum going. Don&apos;t break
                                    the chain!
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {showArchived && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 px-4 py-2.5"
                        >
                            <ArchiveIcon
                                size={14}
                                className="text-warning shrink-0"
                            />
                            <p className="text-xs text-warning/80">
                                Showing archived habits. Click the archive icon
                                on a habit to restore it.
                            </p>
                        </motion.div>
                    )}

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
                                        onClose={() => setActiveCategory(null)}
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
                </div>
            </div>
        </>
    );
};
