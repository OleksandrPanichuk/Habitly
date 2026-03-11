"use client";

import {
    habitValuesSchema,
    type THabitFormInput,
    type THabitFormValues,
} from "@/schemas";
import type { THabitWithStatus } from "@/types";
import {
    Button,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Textarea,
    Tooltip,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    COLORS,
    DAYS_OF_WEEK,
    DEFAULT_COLOR,
    FREQUENCY_TYPES,
    FREQUENCY_UNITS,
    HABIT_CATEGORIES,
} from "../constants";

function getDefaultValues(habit?: THabitWithStatus | null): THabitFormValues {
    if (habit) {
        return {
            name: habit.name,
            description: habit.description ?? "",
            color: habit.color,
            icon: habit.icon ?? undefined,
            category:
                (habit.category as THabitFormValues["category"]) ?? "other",
            goalType: habit.goalType,
            targetValue: habit.targetValue ?? undefined,
            targetUnit:
                (habit.targetUnit as THabitFormValues["targetUnit"]) ??
                undefined,
            reminderEnabled: habit.reminderEnabled,
            frequencyType: habit.frequencyType,
            frequencyDaysOfWeek: habit.frequencyDaysOfWeek ?? [],
            frequencyInterval: habit.frequencyInterval ?? undefined,
            frequencyUnit: habit.frequencyUnit ?? undefined,
        };
    }
    return {
        name: "",
        description: "",
        color: DEFAULT_COLOR,
        icon: undefined,
        category: "other",
        goalType: "binary",
        targetValue: undefined,
        targetUnit: undefined,
        reminderEnabled: false,
        frequencyType: "daily",
        frequencyDaysOfWeek: [],
        frequencyInterval: undefined,
        frequencyUnit: undefined,
    };
}

interface IHabitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    habit?: THabitWithStatus | null;
    onSubmit: (values: THabitFormValues) => void;
    isLoading?: boolean;
}

export const HabitDialog = ({
    open,
    onOpenChange,
    habit,
    onSubmit,
    isLoading,
}: IHabitDialogProps) => {
    const isEditMode = !!habit;
    const colorInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        control,
        formState: { errors },
    } = useForm<THabitFormInput, unknown, THabitFormValues>({
        resolver: zodResolver(habitValuesSchema),
        defaultValues: getDefaultValues(habit),
    });

    useEffect(() => {
        reset(getDefaultValues(habit));
    }, [habit, reset]);

    const frequencyType = watch("frequencyType");
    const goalType = watch("goalType") ?? "binary";
    const selectedColor = watch("color") ?? DEFAULT_COLOR;
    const selectedDays = watch("frequencyDaysOfWeek") ?? [];
    const selectedCategory = watch("category") ?? "other";
    const reminderEnabled = watch("reminderEnabled") ?? false;

    const CATEGORY_ICONS = HABIT_CATEGORIES.map((c) => c.icon);
    const GOAL_TYPE_OPTIONS = [
        { value: "binary", label: "Simple check-off" },
        { value: "count", label: "Count target" },
        { value: "duration", label: "Duration target" },
    ] as const;

    const toggleDay = (day: number) => {
        const next = selectedDays.includes(day)
            ? selectedDays.filter((d) => d !== day)
            : [...selectedDays, day];
        setValue("frequencyDaysOfWeek", next, { shouldValidate: true });
    };

    const isCustomColor = !COLORS.includes(selectedColor);

    return (
        <Modal isOpen={open} onOpenChange={onOpenChange} placement="center">
            <ModalContent className="max-h-[80vh] overflow-auto">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <ModalHeader className="flex flex-col gap-1">
                        {isEditMode ? "Edit Habit" : "Create Habit"}
                    </ModalHeader>

                    <ModalBody className="gap-4">
                        <div className="flex gap-3 items-end">
                            <div className="flex flex-col gap-1.5 shrink-0">
                                <span className="text-sm font-medium opacity-0 select-none">
                                    Icon
                                </span>
                                <Controller
                                    control={control}
                                    name="icon"
                                    render={({ field }) => (
                                        <div className="relative group">
                                            <button
                                                type="button"
                                                className="w-10.5 h-10.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl transition-colors"
                                                title="Choose icon"
                                            >
                                                {field.value ?? "✨"}
                                            </button>
                                            <div className="absolute top-full left-0 mt-1.5 z-50 hidden group-focus-within:flex flex-wrap gap-1 p-2 rounded-xl border border-white/15 bg-content1 shadow-xl w-44">
                                                {CATEGORY_ICONS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() =>
                                                            field.onChange(
                                                                emoji,
                                                            )
                                                        }
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-base transition-colors"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>

                            <Input
                                label="Name"
                                labelPlacement="outside"
                                placeholder="e.g. Morning run"
                                isRequired
                                isInvalid={!!errors.name}
                                errorMessage={errors.name?.message}
                                className="flex-1"
                                {...register("name")}
                            />
                        </div>

                        <Textarea
                            label="Description"
                            labelPlacement="outside"
                            placeholder="Optional description..."
                            isInvalid={!!errors.description}
                            errorMessage={errors.description?.message}
                            {...register("description")}
                        />

                        {/* Category */}
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium">
                                Category
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {HABIT_CATEGORIES.map((cat) => {
                                    const isSelected =
                                        selectedCategory === cat.value;
                                    return (
                                        <Tooltip
                                            key={cat.value}
                                            content={cat.label}
                                            placement="top"
                                            delay={300}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setValue(
                                                        "category",
                                                        cat.value as THabitFormValues["category"],
                                                        {
                                                            shouldValidate: true,
                                                        },
                                                    )
                                                }
                                                className={[
                                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150",
                                                    isSelected
                                                        ? "border-transparent scale-105"
                                                        : "border-white/10 hover:border-white/20 text-foreground-500",
                                                ].join(" ")}
                                                style={
                                                    isSelected
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
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium">Color</span>
                            <div className="flex flex-wrap gap-2 items-center">
                                {COLORS.map((hex) => (
                                    <button
                                        key={hex}
                                        type="button"
                                        title={hex}
                                        onClick={() =>
                                            setValue("color", hex, {
                                                shouldValidate: true,
                                            })
                                        }
                                        className={[
                                            "w-7 h-7 rounded-full border-2 transition-transform",
                                            selectedColor === hex
                                                ? "border-foreground scale-110"
                                                : "border-transparent",
                                        ].join(" ")}
                                        style={{ backgroundColor: hex }}
                                    />
                                ))}
                                <div className="relative w-7 h-7">
                                    <button
                                        type="button"
                                        title="Custom color"
                                        onClick={() =>
                                            colorInputRef.current?.click()
                                        }
                                        className={[
                                            "w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center",
                                            isCustomColor
                                                ? "border-foreground scale-110"
                                                : "border-dashed border-default-400",
                                        ].join(" ")}
                                        style={{
                                            backgroundColor: isCustomColor
                                                ? selectedColor
                                                : "transparent",
                                        }}
                                    >
                                        {!isCustomColor && (
                                            <span className="text-default-400 text-xs leading-none select-none">
                                                +
                                            </span>
                                        )}
                                    </button>
                                    <input
                                        ref={colorInputRef}
                                        type="color"
                                        value={selectedColor}
                                        onChange={(e) =>
                                            setValue("color", e.target.value, {
                                                shouldValidate: true,
                                            })
                                        }
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
                                        tabIndex={-1}
                                        aria-hidden
                                    />
                                </div>
                            </div>
                            {errors.color && (
                                <p className="text-danger text-xs">
                                    {errors.color.message}
                                </p>
                            )}
                        </div>
                        <Controller
                            control={control}
                            name="frequencyType"
                            render={({ field }) => (
                                <Select
                                    label="Frequency"
                                    labelPlacement="outside"
                                    selectedKeys={[field.value]}
                                    onSelectionChange={(keys) => {
                                        const val = Array.from(keys)[0] as
                                            | string
                                            | undefined;
                                        if (!val) return;
                                        field.onChange(val);
                                        setValue("frequencyDaysOfWeek", []);
                                        setValue(
                                            "frequencyInterval",
                                            undefined,
                                        );
                                        setValue("frequencyUnit", undefined);
                                    }}
                                    isInvalid={!!errors.frequencyType}
                                    errorMessage={errors.frequencyType?.message}
                                >
                                    {FREQUENCY_TYPES.map((ft) => (
                                        <SelectItem key={ft.value}>
                                            {ft.label}
                                        </SelectItem>
                                    ))}
                                </Select>
                            )}
                        />
                        {frequencyType === "weekly" && (
                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium">
                                    Days of week
                                </span>
                                <div className="flex gap-1 flex-wrap">
                                    {DAYS_OF_WEEK.map((day) => {
                                        const isSelected =
                                            selectedDays.includes(day.value);
                                        return (
                                            <Button
                                                key={day.value}
                                                type="button"
                                                size="sm"
                                                variant={
                                                    isSelected
                                                        ? "solid"
                                                        : "bordered"
                                                }
                                                color={
                                                    isSelected
                                                        ? "primary"
                                                        : "default"
                                                }
                                                onPress={() =>
                                                    toggleDay(day.value)
                                                }
                                                className="min-w-10"
                                            >
                                                {day.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                                {errors.frequencyDaysOfWeek && (
                                    <p className="text-danger text-xs">
                                        {errors.frequencyDaysOfWeek.message}
                                    </p>
                                )}
                            </div>
                        )}

                        {frequencyType === "custom" && (
                            <div className="flex gap-3 items-start">
                                <Input
                                    type="number"
                                    label="Every"
                                    labelPlacement="outside"
                                    placeholder="1"
                                    min={1}
                                    isInvalid={!!errors.frequencyInterval}
                                    errorMessage={
                                        errors.frequencyInterval?.message
                                    }
                                    className="flex-1"
                                    {...register("frequencyInterval", {
                                        valueAsNumber: true,
                                    })}
                                />
                                <Controller
                                    control={control}
                                    name="frequencyUnit"
                                    render={({ field }) => (
                                        <Select
                                            label="Unit"
                                            labelPlacement="outside"
                                            selectedKeys={
                                                field.value ? [field.value] : []
                                            }
                                            onSelectionChange={(keys) => {
                                                const val = Array.from(
                                                    keys,
                                                )[0] as string | undefined;
                                                if (!val) return;
                                                field.onChange(val);
                                            }}
                                            isInvalid={!!errors.frequencyUnit}
                                            errorMessage={
                                                errors.frequencyUnit?.message
                                            }
                                            className="flex-1"
                                        >
                                            {FREQUENCY_UNITS.map((u) => (
                                                <SelectItem key={u.value}>
                                                    {u.label}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    )}
                                />
                            </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Controller
                                control={control}
                                name="goalType"
                                render={({ field }) => (
                                    <Select
                                        label="Tracking mode"
                                        labelPlacement="outside"
                                        selectedKeys={[field.value ?? "binary"]}
                                        onSelectionChange={(keys) => {
                                            const val = Array.from(keys)[0] as
                                                | string
                                                | undefined;
                                            if (!val) return;
                                            field.onChange(val);
                                            if (val === "binary") {
                                                setValue(
                                                    "targetValue",
                                                    undefined,
                                                );
                                                setValue(
                                                    "targetUnit",
                                                    undefined,
                                                );
                                            } else {
                                                setValue(
                                                    "targetUnit",
                                                    val === "duration"
                                                        ? "minutes"
                                                        : "times",
                                                    { shouldValidate: true },
                                                );
                                            }
                                        }}
                                    >
                                        {GOAL_TYPE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                )}
                            />

                            {goalType === "binary" ? (
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                                    <p className="text-sm font-medium text-foreground">
                                        Goal target
                                    </p>
                                    <p className="mt-1 text-xs text-foreground-400 leading-relaxed">
                                        This habit is complete with a single
                                        check-off.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-[1fr_1fr] gap-3">
                                    <Input
                                        type="number"
                                        label="Target"
                                        labelPlacement="outside"
                                        min={1}
                                        isInvalid={!!errors.targetValue}
                                        errorMessage={
                                            errors.targetValue?.message
                                        }
                                        {...register("targetValue", {
                                            valueAsNumber: true,
                                        })}
                                    />
                                    <Controller
                                        control={control}
                                        name="targetUnit"
                                        render={({ field }) => (
                                            <Select
                                                label="Unit"
                                                labelPlacement="outside"
                                                selectedKeys={
                                                    field.value
                                                        ? [field.value]
                                                        : []
                                                }
                                                onSelectionChange={(keys) => {
                                                    const val = Array.from(
                                                        keys,
                                                    )[0] as string | undefined;
                                                    if (!val) return;
                                                    field.onChange(val);
                                                }}
                                                isDisabled={
                                                    goalType === "duration"
                                                }
                                            >
                                                <SelectItem key="times">
                                                    Times
                                                </SelectItem>
                                                <SelectItem key="minutes">
                                                    Minutes
                                                </SelectItem>
                                            </Select>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        Reminder eligible
                                    </p>
                                    <p className="mt-1 text-xs text-foreground-400 leading-relaxed">
                                        Mark this habit for the daily email
                                        reminder. Delivery is controlled by your
                                        account settings.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={reminderEnabled ? "solid" : "flat"}
                                    color={
                                        reminderEnabled ? "primary" : "default"
                                    }
                                    onPress={() =>
                                        setValue(
                                            "reminderEnabled",
                                            !reminderEnabled,
                                            { shouldValidate: true },
                                        )
                                    }
                                >
                                    {reminderEnabled ? "Included" : "Off"}
                                </Button>
                            </div>
                        </div>
                    </ModalBody>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="light"
                            onPress={() => onOpenChange(false)}
                            isDisabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            isLoading={isLoading}
                        >
                            {isEditMode ? "Update" : "Create"}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};
