"use client";

import { HABIT_CATEGORIES } from "@/features/habits/constants";
import type { THabitWithStatus } from "@/types";
import { Button, Tooltip } from "@heroui/react";
import {
    ArchiveRestoreIcon,
    BarChart2Icon,
    PencilIcon,
    Trash2Icon,
} from "lucide-react";

interface IArchivedHabitItemProps {
    data: THabitWithStatus;
    onEdit: (habit: THabitWithStatus) => void;
    onDelete: (habit: THabitWithStatus) => void;
    onStats: (habit: THabitWithStatus) => void;
    onRestore: (habit: THabitWithStatus) => void;
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

export const ArchivedHabitItem = ({
    data,
    onEdit,
    onDelete,
    onStats,
    onRestore,
}: IArchivedHabitItemProps) => {
    const categoryMeta = HABIT_CATEGORIES.find(
        (c) => c.value === data.category,
    );
    const frequencyBadge = getFrequencyBadge(data);
    const isDeleted = !!data.deletedAt;
    const deletedLabel = data.deletedAt
        ? new Date(data.deletedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
          })
        : null;

    return (
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm transition-all duration-200 hover:border-white/15 hover:bg-white/7">
            <div
                className="absolute left-0 top-3 bottom-3 w-1 rounded-full opacity-70"
                style={{ backgroundColor: data.color }}
            />
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />

            <div className="relative flex min-w-0 flex-1 flex-col gap-4 pl-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        {data.icon && (
                            <span className="text-base leading-none select-none opacity-80">
                                {data.icon}
                            </span>
                        )}
                        <span className="text-sm font-semibold text-foreground">
                            {data.name}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                            Archived
                        </span>
                        {deletedLabel ? (
                            <span className="inline-flex items-center rounded-full border border-danger/20 bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
                                Deleted {deletedLabel}
                            </span>
                        ) : null}
                        {data.archivedAt ? (
                            <span className="text-xs text-foreground-500">
                                {new Date(data.archivedAt).toLocaleDateString(
                                    undefined,
                                    {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    },
                                )}
                            </span>
                        ) : null}
                    </div>

                    {data.description ? (
                        <p className="mt-1 text-sm text-foreground-400">
                            {data.description}
                        </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {categoryMeta && categoryMeta.value !== "other" && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
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
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                                backgroundColor: `${data.color}18`,
                                color: data.color,
                            }}
                        >
                            {frequencyBadge}
                        </span>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                    {!isDeleted ? (
                        <Button
                            size="sm"
                            color="warning"
                            variant="flat"
                            startContent={<ArchiveRestoreIcon size={14} />}
                            onPress={() => onRestore(data)}
                            className="font-semibold"
                        >
                            Restore
                        </Button>
                    ) : null}

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

                    {!isDeleted ? (
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
                    ) : null}

                    {!isDeleted ? (
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
                    ) : null}
                </div>
            </div>
        </div>
    );
};
