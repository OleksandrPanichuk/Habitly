"use client";

import { authClient } from "@/lib/auth-client";
import {
    getEntitlementsForTier,
    normalizeSubscriptionTier,
} from "@/lib/entitlements";
import { useTRPC } from "@/trpc/client";
import {
    Button,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { DownloadIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ExportRange = "30d" | "90d" | "6m" | "1y" | "all";

const RANGE_LABELS: Record<ExportRange, string> = {
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "6m": "Last 6 months",
    "1y": "Last year",
    all: "All time",
};

function getRangeDates(range: ExportRange): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    let startDate: Date;
    switch (range) {
        case "30d":
            startDate = new Date(endDate);
            startDate.setUTCDate(startDate.getUTCDate() - 30);
            break;
        case "90d":
            startDate = new Date(endDate);
            startDate.setUTCDate(startDate.getUTCDate() - 90);
            break;
        case "6m":
            startDate = subMonths(endDate, 6);
            break;
        case "1y":
            startDate = subMonths(endDate, 12);
            break;
        default:
            startDate = new Date(Date.UTC(2020, 0, 1));
            break;
    }

    return { startDate, endDate };
}

function escapeCsvCell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function buildHabitsCsv(
    habits: Array<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        icon: string | null;
        category: string | null;
        frequencyType: string;
        frequencyDaysOfWeek: number[] | null;
        frequencyInterval: number | null;
        frequencyUnit: string | null;
        archivedAt: Date | null;
        createdAt: Date;
    }>,
): string {
    const headers = [
        "ID",
        "Name",
        "Description",
        "Color",
        "Icon",
        "Category",
        "Frequency Type",
        "Frequency Days",
        "Frequency Interval",
        "Frequency Unit",
        "Archived",
        "Created At",
    ];

    const rows = habits.map((h) => [
        escapeCsvCell(h.id),
        escapeCsvCell(h.name),
        escapeCsvCell(h.description),
        escapeCsvCell(h.color),
        escapeCsvCell(h.icon),
        escapeCsvCell(h.category),
        escapeCsvCell(h.frequencyType),
        escapeCsvCell(
            h.frequencyDaysOfWeek
                ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                      .filter((_, i) => h.frequencyDaysOfWeek?.includes(i))
                      .join("|")
                : null,
        ),
        escapeCsvCell(h.frequencyInterval),
        escapeCsvCell(h.frequencyUnit),
        escapeCsvCell(h.archivedAt ? "Yes" : "No"),
        escapeCsvCell(format(new Date(h.createdAt), "yyyy-MM-dd")),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function buildCompletionsCsv(
    completions: Array<{
        id: string;
        habitId: string;
        date: Date;
        note: string | null;
        habitName: string;
        habitCategory: string | null;
    }>,
): string {
    const headers = [
        "ID",
        "Habit ID",
        "Habit Name",
        "Category",
        "Date",
        "Note",
    ];

    const rows = completions.map((c) => [
        escapeCsvCell(c.id),
        escapeCsvCell(c.habitId),
        escapeCsvCell(c.habitName),
        escapeCsvCell(c.habitCategory),
        escapeCsvCell(format(new Date(c.date), "yyyy-MM-dd")),
        escapeCsvCell(c.note),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function downloadCsv(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export const ExportButton = () => {
    const trpc = useTRPC();
    const { data: session } = authClient.useSession();
    const [selectedRange, setSelectedRange] = useState<ExportRange>("90d");
    const [isExporting, setIsExporting] = useState(false);

    const { data: billingStatus } = useQuery({
        ...trpc.billing.getStatus.queryOptions(),
        enabled: Boolean(session?.user),
        retry: false,
    });

    const subscriptionTier = normalizeSubscriptionTier(
        billingStatus?.subscriptionTier ??
            (session?.user as { subscriptionTier?: string | null } | undefined)
                ?.subscriptionTier,
    );
    const entitlements = getEntitlementsForTier(subscriptionTier);

    const { startDate, endDate } = useMemo(
        () => getRangeDates(selectedRange),
        [selectedRange],
    );

    const { refetch } = useQuery({
        ...trpc.habits.exportData.queryOptions({ startDate, endDate }),
        enabled: false,
    });

    const handleExport = async (type: "habits" | "completions" | "both") => {
        if (!entitlements.canExport) {
            toast.info(
                "Upgrade to Pro to export habits and completions as CSV.",
            );
            return;
        }

        setIsExporting(true);
        try {
            const { data, error } = await refetch();
            if (error || !data) {
                toast.error("Failed to export data. Please try again.");
                return;
            }

            const dateTag = format(new Date(), "yyyy-MM-dd");

            if (type === "habits" || type === "both") {
                const csv = buildHabitsCsv(data.habits);
                downloadCsv(csv, `habitly-habits-${dateTag}.csv`);
            }

            if (type === "completions" || type === "both") {
                const csv = buildCompletionsCsv(data.completions);
                downloadCsv(csv, `habitly-completions-${dateTag}.csv`);
            }

            toast.success(
                `Exported ${type === "both" ? "habits & completions" : type} as CSV.`,
            );
        } catch {
            toast.error("Export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {!entitlements.canExport ? (
                <Button
                    size="sm"
                    variant="flat"
                    onPress={() =>
                        toast.info(
                            "CSV export is available on Pro and Lifetime plans.",
                        )
                    }
                    className="text-xs text-foreground-500 h-8 px-2.5"
                >
                    <DownloadIcon size={14} />
                    Export • Pro
                </Button>
            ) : (
                <>
                    <Dropdown>
                        <DropdownTrigger>
                            <Button
                                size="sm"
                                variant="flat"
                                className="text-xs text-foreground-500 h-8 px-2.5"
                                isDisabled={isExporting}
                            >
                                {RANGE_LABELS[selectedRange]}
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Select export range"
                            onAction={(key) =>
                                setSelectedRange(key as ExportRange)
                            }
                            selectedKeys={[selectedRange]}
                            selectionMode="single"
                        >
                            {(
                                Object.entries(RANGE_LABELS) as [
                                    ExportRange,
                                    string,
                                ][]
                            ).map(([key, label]) => (
                                <DropdownItem key={key}>{label}</DropdownItem>
                            ))}
                        </DropdownMenu>
                    </Dropdown>

                    <Dropdown>
                        <DropdownTrigger>
                            <Button
                                size="sm"
                                variant="flat"
                                isIconOnly
                                isLoading={isExporting}
                                className="text-foreground-400 hover:text-foreground h-8 w-8"
                                aria-label="Export data"
                            >
                                {!isExporting && <DownloadIcon size={14} />}
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Export options"
                            onAction={(key) =>
                                handleExport(
                                    key as "habits" | "completions" | "both",
                                )
                            }
                        >
                            <DropdownItem
                                key="habits"
                                description="Export all your habit definitions"
                            >
                                Export Habits
                            </DropdownItem>
                            <DropdownItem
                                key="completions"
                                description="Export all completion records"
                            >
                                Export Completions
                            </DropdownItem>
                            <DropdownItem
                                key="both"
                                description="Download both CSV files"
                            >
                                Export Both
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </>
            )}
        </div>
    );
};
