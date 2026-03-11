"use client";

import { useTRPC } from "@/trpc/client";
import { Button, Chip, Input } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock3Icon, CompassIcon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HABIT_TEMPLATES, type HabitTemplate } from "../constants";

const WEEKDAY_OPTIONS = [
    { label: "Sunday", value: 0 },
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
];

function flattenTemplates(): Array<HabitTemplate & { group: string }> {
    return Object.entries(HABIT_TEMPLATES).flatMap(([group, templates]) =>
        templates.map((template) => ({ ...template, group })),
    );
}

function normalizeTime(value: string): string {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "19:00";
}

export const OnboardingView = () => {
    const router = useRouter();
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery(
        trpc.onboarding.getStatus.queryOptions({}),
    );

    const templates = useMemo(() => flattenTemplates(), []);
    const groups = useMemo(() => Object.keys(HABIT_TEMPLATES), []);

    const [activeGroup, setActiveGroup] = useState<string>(groups[0] ?? "");
    const [selectedNames, setSelectedNames] = useState<string[]>([]);
    const [timezone, setTimezone] = useState("UTC");
    const [preferredCheckInTime, setPreferredCheckInTime] = useState("19:00");
    const [weeklyReviewDay, setWeeklyReviewDay] = useState(0);

    useEffect(() => {
        if (!data) return;

        setTimezone(data.timezone);
        setPreferredCheckInTime(data.preferredCheckInTime);
        setWeeklyReviewDay(data.weeklyReviewDay);
    }, [data]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const browserTimezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTimezone) {
            setTimezone((current) =>
                current === "UTC" ? browserTimezone : current,
            );
        }
    }, []);

    const visibleTemplates = useMemo(
        () => templates.filter((template) => template.group === activeGroup),
        [activeGroup, templates],
    );

    const selectedTemplates = useMemo(
        () =>
            selectedNames
                .map((name) =>
                    templates.find((template) => template.name === name),
                )
                .filter(
                    (template): template is HabitTemplate & { group: string } =>
                        Boolean(template),
                ),
        [selectedNames, templates],
    );

    const completeMutation = useMutation(
        trpc.onboarding.complete.mutationOptions({
            onSuccess: async () => {
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: trpc.onboarding.getStatus.queryKey({}),
                    }),
                    queryClient.invalidateQueries({
                        queryKey: trpc.habits.listAll.queryKey(),
                    }),
                ]);

                toast.success("Your habit system is ready.");
                router.push("/habits");
                router.refresh();
            },
            onError: (error) => {
                toast.error(error.message || "Unable to finish onboarding.");
            },
        }),
    );

    const toggleTemplate = (template: HabitTemplate) => {
        setSelectedNames((current) => {
            if (current.includes(template.name)) {
                return current.filter((name) => name !== template.name);
            }

            if (current.length >= 3) {
                toast.error("Choose up to 3 starter habits.");
                return current;
            }

            return [...current, template.name];
        });
    };

    const submitOnboarding = (starterHabits: HabitTemplate[]) => {
        completeMutation.mutate({
            timezone: timezone.trim() || "UTC",
            preferredCheckInTime: normalizeTime(preferredCheckInTime),
            weeklyReviewDay,
            starterHabits: starterHabits.map((habit) => ({
                name: habit.name,
                description: habit.description,
                color: habit.color,
                icon: habit.icon,
                category: habit.category,
                frequencyType: habit.frequencyType,
                frequencyDaysOfWeek: habit.frequencyDaysOfWeek ?? [],
                frequencyInterval: habit.frequencyInterval,
                frequencyUnit: habit.frequencyUnit,
            })),
        });
    };

    if (isLoading || !data) {
        return (
            <div className="min-h-screen bg-background px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="h-12 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="h-[32rem] rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
                        <div className="h-[32rem] rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8"
                >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <Chip
                                variant="flat"
                                color="primary"
                                className="border border-primary/20 bg-primary/10"
                            >
                                First-run setup
                            </Chip>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                    Welcome, {data.name}. Let&apos;s set up your
                                    first habit loop.
                                </h1>
                                <p className="max-w-2xl text-sm text-foreground-400 sm:text-base">
                                    Pick up to 3 starter habits, choose when you
                                    usually check in, and we&apos;ll drop you
                                    into a cleaner day-one dashboard.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                                <p className="text-xl font-semibold text-foreground">
                                    {selectedTemplates.length}
                                </p>
                                <p className="text-xs text-foreground-400">
                                    Starter habits
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                                <p className="text-xl font-semibold text-foreground">
                                    {data.existingHabitCount}
                                </p>
                                <p className="text-xs text-foreground-400">
                                    Existing habits
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                                <p className="text-xl font-semibold text-foreground">
                                    7d
                                </p>
                                <p className="text-xs text-foreground-400">
                                    Default analytics
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 }}
                        className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                    <SparklesIcon size={16} /> Choose starter
                                    habits
                                </div>
                                <h2 className="mt-2 text-xl font-semibold text-foreground">
                                    Start with a small system you can actually
                                    keep.
                                </h2>
                            </div>

                            <Chip
                                variant="flat"
                                className="bg-white/10 text-foreground-500"
                            >
                                Up to 3
                            </Chip>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                            {groups.map((group) => (
                                <Button
                                    key={group}
                                    size="sm"
                                    variant={
                                        activeGroup === group ? "solid" : "flat"
                                    }
                                    color={
                                        activeGroup === group
                                            ? "primary"
                                            : "default"
                                    }
                                    onPress={() => setActiveGroup(group)}
                                    className="rounded-full px-4"
                                >
                                    {group}
                                </Button>
                            ))}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {visibleTemplates.map((template) => {
                                const isSelected = selectedNames.includes(
                                    template.name,
                                );

                                return (
                                    <button
                                        key={template.name}
                                        type="button"
                                        onClick={() => toggleTemplate(template)}
                                        className={[
                                            "rounded-2xl border px-4 py-4 text-left transition-all",
                                            isSelected
                                                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                                                : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/5",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 gap-3">
                                                <div
                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg"
                                                    style={{
                                                        backgroundColor: `${template.color}22`,
                                                        borderColor: `${template.color}55`,
                                                    }}
                                                >
                                                    {template.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {template.name}
                                                    </p>
                                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground-400">
                                                        {template.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <Chip
                                                size="sm"
                                                variant={
                                                    isSelected
                                                        ? "solid"
                                                        : "flat"
                                                }
                                                color={
                                                    isSelected
                                                        ? "primary"
                                                        : "default"
                                                }
                                            >
                                                {isSelected
                                                    ? "Selected"
                                                    : template.frequencyType}
                                            </Chip>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.section>

                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                    >
                        <div className="space-y-5">
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                    <Clock3Icon size={16} /> Daily rhythm
                                </div>
                                <h2 className="mt-2 text-xl font-semibold text-foreground">
                                    Save a few defaults for the next features.
                                </h2>
                                <p className="mt-1 text-sm text-foreground-400">
                                    We&apos;ll use these settings for your
                                    check-in flow now and for reminders next.
                                </p>
                            </div>

                            <Input
                                type="text"
                                label="Timezone"
                                value={timezone}
                                onValueChange={setTimezone}
                                description="Detected from your browser, but you can override it."
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
                                                weeklyReviewDay === day.value
                                                    ? "solid"
                                                    : "flat"
                                            }
                                            color={
                                                weeklyReviewDay === day.value
                                                    ? "primary"
                                                    : "default"
                                            }
                                            onPress={() =>
                                                setWeeklyReviewDay(day.value)
                                            }
                                            className="rounded-full px-4"
                                        >
                                            {day.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <CompassIcon size={18} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            Your selected setup
                                        </p>
                                        <p className="text-xs text-foreground-400">
                                            {selectedTemplates.length > 0
                                                ? `${selectedTemplates.length} starter habit${selectedTemplates.length === 1 ? "" : "s"} selected.`
                                                : "You can skip starter habits and build your own system from scratch."}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTemplates.map((habit) => (
                                                <Chip
                                                    key={habit.name}
                                                    variant="flat"
                                                    className="bg-white/10 text-foreground-500"
                                                >
                                                    {habit.icon} {habit.name}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    variant="flat"
                                    className="sm:flex-1"
                                    onPress={() => submitOnboarding([])}
                                    isLoading={completeMutation.isPending}
                                >
                                    Start blank
                                </Button>
                                <Button
                                    color="primary"
                                    className="sm:flex-[1.4]"
                                    onPress={() =>
                                        submitOnboarding(selectedTemplates)
                                    }
                                    isLoading={completeMutation.isPending}
                                >
                                    Finish setup
                                </Button>
                            </div>
                        </div>
                    </motion.section>
                </div>
            </div>
        </div>
    );
};
