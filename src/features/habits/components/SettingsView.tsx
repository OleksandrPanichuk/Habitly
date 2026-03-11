"use client";

import { useTRPC } from "@/trpc/client";
import { Button, Chip, Input } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    BellIcon,
    ChevronLeftIcon,
    DownloadIcon,
    Settings2Icon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BillingCard } from "./BillingCard";
import { ExportButton } from "./ExportButton";

const WEEKDAY_OPTIONS = [
    { label: "Sunday", value: 0 },
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
] as const;

export const SettingsView = () => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { data: preferences, isLoading } = useQuery(
        trpc.onboarding.getStatus.queryOptions({}),
    );
    const { data: billingStatus } = useQuery(
        trpc.billing.getStatus.queryOptions(),
    );

    const [timezone, setTimezone] = useState("UTC");
    const [preferredCheckInTime, setPreferredCheckInTime] = useState("19:00");
    const [weeklyReviewDay, setWeeklyReviewDay] = useState(0);
    const [reminderEmailEnabled, setReminderEmailEnabled] = useState(false);

    useEffect(() => {
        if (!preferences) return;
        setTimezone(preferences.timezone);
        setPreferredCheckInTime(preferences.preferredCheckInTime);
        setWeeklyReviewDay(preferences.weeklyReviewDay);
        setReminderEmailEnabled(preferences.reminderEmailEnabled);
    }, [preferences]);

    const { mutate: updatePreferences, isPending } = useMutation(
        trpc.onboarding.updatePreferences.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: trpc.onboarding.getStatus.queryKey({}),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.stats.getCoachState.queryKey({}),
                });
                toast.success("Settings updated.");
            },
            onError: (error) => {
                toast.error(error.message || "Unable to update settings.");
            },
        }),
    );

    const canUseReminders =
        billingStatus?.entitlements.canUseReminders ?? false;
    const isDirty =
        timezone !== (preferences?.timezone ?? "UTC") ||
        preferredCheckInTime !==
            (preferences?.preferredCheckInTime ?? "19:00") ||
        weeklyReviewDay !== (preferences?.weeklyReviewDay ?? 0) ||
        reminderEmailEnabled !== (preferences?.reminderEmailEnabled ?? false);

    const handleSave = () => {
        if (reminderEmailEnabled && !canUseReminders) {
            toast.info("Upgrade to Pro to unlock email reminders.");
            return;
        }

        updatePreferences({
            timezone,
            preferredCheckInTime,
            weeklyReviewDay,
            reminderEmailEnabled,
        });
    };

    return (
        <div className="min-h-screen px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-5xl space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary">
                            <Settings2Icon size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Settings
                            </h1>
                            <p className="text-sm text-foreground-400">
                                Keep billing, reminders, and data actions out of
                                your daily checklist.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/habits"
                        className="inline-flex items-center gap-1.5 text-sm text-foreground-400 transition-colors hover:text-foreground"
                    >
                        <ChevronLeftIcon size={15} />
                        Back to Habits
                    </Link>
                </motion.div>

                <BillingCard />

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.05 }}
                        className="rounded-3xl border border-white/10 bg-white/5 p-5"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                                <BellIcon size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    Reminder settings
                                </h2>
                                <p className="mt-1 text-sm text-foreground-400">
                                    Control your daily check-in window and
                                    weekly review cadence here instead of on the
                                    habits screen.
                                </p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="mt-5 h-56 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
                        ) : (
                            <div className="mt-5 space-y-4">
                                <Input
                                    type="text"
                                    label="Timezone"
                                    value={timezone}
                                    onValueChange={setTimezone}
                                    classNames={{
                                        inputWrapper:
                                            "border border-white/10 bg-black/10",
                                    }}
                                />

                                <Input
                                    type="time"
                                    label="Preferred daily check-in"
                                    value={preferredCheckInTime}
                                    onValueChange={setPreferredCheckInTime}
                                    classNames={{
                                        inputWrapper:
                                            "border border-white/10 bg-black/10",
                                    }}
                                />

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">
                                        Weekly review day
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {WEEKDAY_OPTIONS.map((day) => (
                                            <Button
                                                key={day.value}
                                                size="sm"
                                                variant={
                                                    weeklyReviewDay ===
                                                    day.value
                                                        ? "solid"
                                                        : "flat"
                                                }
                                                color={
                                                    weeklyReviewDay ===
                                                    day.value
                                                        ? "primary"
                                                        : "default"
                                                }
                                                onPress={() =>
                                                    setWeeklyReviewDay(
                                                        day.value,
                                                    )
                                                }
                                                className="rounded-full px-4"
                                            >
                                                {day.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">
                                                Email reminders
                                            </p>
                                            <p className="mt-1 text-xs text-foreground-400">
                                                {canUseReminders
                                                    ? "Send one clean check-in email each day at your preferred time."
                                                    : "Email reminders are available on Pro and Lifetime plans."}
                                            </p>
                                        </div>
                                        <Button
                                            color={
                                                reminderEmailEnabled
                                                    ? "primary"
                                                    : "default"
                                            }
                                            variant={
                                                reminderEmailEnabled
                                                    ? "solid"
                                                    : "flat"
                                            }
                                            onPress={() => {
                                                if (
                                                    !canUseReminders &&
                                                    !reminderEmailEnabled
                                                ) {
                                                    toast.info(
                                                        "Upgrade to Pro to unlock email reminders.",
                                                    );
                                                    return;
                                                }

                                                setReminderEmailEnabled(
                                                    (current) => !current,
                                                );
                                            }}
                                        >
                                            {reminderEmailEnabled
                                                ? "Enabled"
                                                : canUseReminders
                                                  ? "Enable"
                                                  : "Locked"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        color="primary"
                                        onPress={handleSave}
                                        isLoading={isPending}
                                        isDisabled={!isDirty}
                                    >
                                        Save settings
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.section>

                    <div className="space-y-6">
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.1 }}
                            className="rounded-3xl border border-white/10 bg-white/5 p-5"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-foreground">
                                    <DownloadIcon size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Data tools
                                    </h2>
                                    <p className="mt-1 text-sm text-foreground-400">
                                        Export history from here so the habits
                                        page stays focused on doing the work.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                <ExportButton />
                                <Chip
                                    variant="flat"
                                    className="bg-white/10 text-foreground-500"
                                >
                                    CSV export
                                </Chip>
                            </div>
                        </motion.section>
                    </div>
                </div>
            </div>
        </div>
    );
};
