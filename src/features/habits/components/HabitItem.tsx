"use client";

import { Button, Chip, Tooltip } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    ArchiveIcon,
    ArchiveRestoreIcon,
    BarChart2Icon,
    FlameIcon,
    NotebookPenIcon,
    PencilIcon,
    Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HABIT_CATEGORIES } from "@/features/habits/constants";
import { useTRPC } from "@/trpc/client";
import type { THabitWithStatus } from "@/types";
import { NoteDialog } from "./NoteDialog";

interface IHabitItemProps {
    data: THabitWithStatus;
    date: Date;
    includeArchived?: boolean;
    onEdit: (habit: THabitWithStatus) => void;
    onDelete: (habit: THabitWithStatus) => void;
    onStats: (habit: THabitWithStatus) => void;
    onArchive?: (habit: THabitWithStatus) => void;
    currentStreak?: number;
}

function getFrequencyBadge(habit: THabitWithStatus): string {
    switch (habit.frequencyType) {
        case "daily":
            return "Daily";
        case "weekly": {
            const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
            const days = (habit.frequencyDaysOfWeek ?? [])
                .sort((a, b) => a - b)
                .map((d) => dayNames[d])
                .join(" · ");
            return days ? `Weekly — ${days}` : "Weekly";
        }
        case "custom":
            return `Every ${habit.frequencyInterval} ${habit.frequencyUnit}`;
        default:
            return "";
    }
}

export const HabitItem = ({
    data,
    date,
    includeArchived = false,
    onEdit,
    onDelete,
    onStats,
    onArchive,
    currentStreak = 0,
}: IHabitItemProps) => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const isCompleted = !!data.completedAt;

    const [noteOpen, setNoteOpen] = useState(false);

    const categoryMeta = HABIT_CATEGORIES.find(
        (c) => c.value === data.category,
    );

    const { mutate: toggle, isPending: isToggling } = useMutation(
        trpc.completions.toggle.mutationOptions({
            onMutate: async () => {
                const key = trpc.habits.list.queryKey({
                    date,
                    includeArchived,
                });
                await queryClient.cancelQueries({ queryKey: key });
                const prev = queryClient.getQueryData(key);

                queryClient.setQueryData(
                    key,
                    (old: THabitWithStatus[] | undefined) =>
                        (old ?? []).map((h) =>
                            h.id === data.id
                                ? {
                                      ...h,
                                      completedAt: isCompleted ? null : date,
                                      completionNote: isCompleted
                                          ? null
                                          : h.completionNote,
                                  }
                                : h,
                        ),
                );

                return { prev };
            },
            onError: (_err, _vars, ctx) => {
                const key = trpc.habits.list.queryKey({
                    date,
                    includeArchived,
                });
                if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
            },
            onSettled: () => {
                queryClient.invalidateQueries({
                    queryKey: trpc.habits.list.queryKey({ date }),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.stats.getSummary.queryKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.stats.getHabitStats.queryKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.completions.getByDateRange.queryKey(),
                });
            },
        }),
    );

    const { mutate: updateNote, isPending: isUpdatingNote } = useMutation(
        trpc.completions.updateNote.mutationOptions({
            onMutate: async ({ note }) => {
                const key = trpc.habits.list.queryKey({
                    date,
                    includeArchived,
                });
                await queryClient.cancelQueries({ queryKey: key });
                const prev = queryClient.getQueryData(key);

                queryClient.setQueryData(
                    key,
                    (old: THabitWithStatus[] | undefined) =>
                        (old ?? []).map((h) =>
                            h.id === data.id
                                ? { ...h, completionNote: note }
                                : h,
                        ),
                );

                return { prev };
            },
            onError: (_err, _vars, ctx) => {
                const key = trpc.habits.list.queryKey({
                    date,
                    includeArchived,
                });
                if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
                toast.error("Failed to save note.");
            },
            onSuccess: () => {
                setNoteOpen(false);
                toast.success("Note saved.");
            },
            onSettled: () => {
                queryClient.invalidateQueries({
                    queryKey: trpc.habits.list.queryKey({ date }),
                });
            },
        }),
    );

    const handleToggle = () => {
        toggle({ habitId: data.id, date });
    };

    const handleNoteSave = (note: string | null) => {
        updateNote({ habitId: data.id, date, note });
    };

    const frequencyBadge = getFrequencyBadge(data);
    const hasNote = !!data.completionNote;

    return (
        <>
            <NoteDialog
                open={noteOpen}
                onOpenChange={setNoteOpen}
                habitName={data.name}
                initialNote={data.completionNote}
                onSave={handleNoteSave}
                isLoading={isUpdatingNote}
            />

            <div
                className={[
                    "group relative flex items-start gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-200",
                    "bg-white/5 backdrop-blur-sm",
                    isCompleted
                        ? "border-white/15 opacity-80"
                        : "border-white/10 hover:border-white/20 hover:bg-white/8",
                ].join(" ")}
            >
                <div
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-full opacity-80"
                    style={{ backgroundColor: data.color }}
                />

                <Tooltip
                    content={isCompleted ? "Mark incomplete" : "Mark complete"}
                    placement="top"
                    delay={400}
                >
                    <button
                        type="button"
                        onClick={handleToggle}
                        disabled={isToggling}
                        className={[
                            "relative mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                            isCompleted
                                ? "border-transparent"
                                : "border-white/30 hover:border-white/60",
                            isToggling
                                ? "opacity-50 cursor-wait"
                                : "cursor-pointer",
                        ].join(" ")}
                        style={
                            isCompleted
                                ? {
                                      backgroundColor: data.color,
                                      borderColor: data.color,
                                  }
                                : {}
                        }
                        title={
                            isCompleted ? "Mark incomplete" : "Mark complete"
                        }
                        aria-label={
                            isCompleted ? "Mark incomplete" : "Mark complete"
                        }
                    >
                        {isCompleted && (
                            <motion.svg
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 20,
                                }}
                                viewBox="0 0 12 12"
                                fill="none"
                                aria-hidden="true"
                                className="absolute inset-0 m-auto w-3 h-3"
                            >
                                <path
                                    d="M2 6l3 3 5-5"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </motion.svg>
                        )}
                    </button>
                </Tooltip>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Emoji icon */}
                        {data.icon && (
                            <span className="text-base leading-none select-none">
                                {data.icon}
                            </span>
                        )}

                        <span
                            className={[
                                "text-sm font-semibold transition-all duration-200",
                                isCompleted
                                    ? "line-through text-foreground-400"
                                    : "text-foreground",
                            ].join(" ")}
                        >
                            {data.name}
                        </span>

                        {currentStreak >= 3 && (
                            <Chip
                                size="sm"
                                variant="flat"
                                startContent={
                                    <FlameIcon
                                        size={10}
                                        className="text-orange-400 shrink-0"
                                    />
                                }
                                classNames={{
                                    base: "h-5 px-1.5 bg-orange-500/10 border border-orange-500/20",
                                    content:
                                        "text-orange-400 text-xs font-semibold px-0.5",
                                }}
                            >
                                {currentStreak}
                            </Chip>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {data.description && (
                            <span className="text-xs text-foreground-400 truncate max-w-50">
                                {data.description}
                            </span>
                        )}

                        {/* Category badge */}
                        {categoryMeta && categoryMeta.value !== "other" && (
                            <span
                                className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium"
                                style={{
                                    backgroundColor: `${categoryMeta.color}18`,
                                    color: categoryMeta.color,
                                }}
                            >
                                {categoryMeta.icon}
                                {categoryMeta.label}
                            </span>
                        )}

                        <span
                            className="inline-flex items-center text-xs rounded-full px-2 py-0.5 font-medium"
                            style={{
                                backgroundColor: `${data.color}18`,
                                color: data.color,
                            }}
                        >
                            {frequencyBadge}
                        </span>
                    </div>

                    {isCompleted && hasNote && (
                        <motion.button
                            type="button"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setNoteOpen(true)}
                            className="mt-2 flex items-start gap-1.5 text-left w-full group/note"
                        >
                            <NotebookPenIcon
                                size={11}
                                className="mt-0.5 shrink-0 text-foreground-400 group-hover/note:text-foreground-300 transition-colors"
                            />
                            <span className="text-xs text-foreground-400 group-hover/note:text-foreground-300 transition-colors line-clamp-2 italic leading-relaxed">
                                {data.completionNote}
                            </span>
                        </motion.button>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 mt-0.5">
                    {isCompleted && (
                        <Tooltip
                            content={hasNote ? "Edit note" : "Add note"}
                            placement="top"
                            delay={400}
                        >
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => setNoteOpen(true)}
                                className={[
                                    "min-w-7 w-7 h-7 transition-colors",
                                    hasNote
                                        ? "text-primary hover:text-primary"
                                        : "text-foreground-400 hover:text-foreground",
                                ].join(" ")}
                            >
                                <NotebookPenIcon size={14} />
                            </Button>
                        </Tooltip>
                    )}

                    <Tooltip content="Statistics" placement="top" delay={400}>
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={() => onStats(data)}
                            className="text-foreground-400 hover:text-foreground min-w-7 w-7 h-7"
                        >
                            <BarChart2Icon size={14} />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Edit" placement="top" delay={400}>
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={() => onEdit(data)}
                            className="text-foreground-400 hover:text-foreground min-w-7 w-7 h-7"
                        >
                            <PencilIcon size={14} />
                        </Button>
                    </Tooltip>

                    {onArchive && (
                        <Tooltip
                            content={data.archivedAt ? "Restore" : "Archive"}
                            placement="top"
                            delay={400}
                        >
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => onArchive(data)}
                                className={[
                                    "min-w-7 w-7 h-7",
                                    data.archivedAt
                                        ? "text-warning hover:text-foreground"
                                        : "text-foreground-400 hover:text-warning",
                                ].join(" ")}
                            >
                                {data.archivedAt ? (
                                    <ArchiveRestoreIcon size={14} />
                                ) : (
                                    <ArchiveIcon size={14} />
                                )}
                            </Button>
                        </Tooltip>
                    )}

                    <Tooltip content="Delete" placement="top" delay={400}>
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            color="danger"
                            onPress={() => onDelete(data)}
                            className="text-foreground-400 hover:text-danger min-w-7 w-7 h-7"
                        >
                            <Trash2Icon size={14} />
                        </Button>
                    </Tooltip>
                </div>

                {isCompleted && (
                    <div
                        className="pointer-events-none absolute inset-0 rounded-2xl opacity-5"
                        style={{
                            background: `linear-gradient(90deg, transparent, ${data.color}, transparent)`,
                        }}
                    />
                )}
            </div>
        </>
    );
};
