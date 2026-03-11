import z from "zod";

export const HABIT_CATEGORIES = [
    "health",
    "fitness",
    "learning",
    "mindfulness",
    "productivity",
    "social",
    "finance",
    "creativity",
    "other",
] as const;

export const HABIT_GOAL_TYPES = ["binary", "count", "duration"] as const;
export const HABIT_TARGET_UNITS = ["times", "minutes"] as const;

export type THabitCategory = (typeof HABIT_CATEGORIES)[number];

export const listHabitsSchema = z.object({
    date: z
        .date()
        .optional()
        .default(() => new Date()),
    category: z.enum(HABIT_CATEGORIES).optional(),
    includeArchived: z.boolean().optional().default(false),
});

export const habitValuesSchema = z
    .object({
        name: z.string().min(1, "Name is required").max(50),
        description: z.string().max(500).optional(),
        color: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
            .default("#3b82f6"),
        icon: z.string().max(10).optional(),
        category: z.enum(HABIT_CATEGORIES).optional().default("other"),
        goalType: z.enum(HABIT_GOAL_TYPES).optional().default("binary"),
        targetValue: z.number().int().positive().optional(),
        targetUnit: z.enum(HABIT_TARGET_UNITS).optional(),
        reminderEnabled: z.boolean().optional().default(false),
        frequencyType: z.enum(["daily", "weekly", "custom"]),
        frequencyDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
        frequencyInterval: z
            .number()
            .int()
            .positive("Interval must be positive")
            .optional(),
        frequencyUnit: z.enum(["days", "weeks"]).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.frequencyType === "weekly") {
            if (
                !data.frequencyDaysOfWeek ||
                data.frequencyDaysOfWeek.length === 0
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Select at least one day",
                    path: ["frequencyDaysOfWeek"],
                });
            }
        }

        if (data.frequencyType === "custom") {
            if (
                data.frequencyInterval === undefined ||
                data.frequencyInterval === null
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Interval must be positive",
                    path: ["frequencyInterval"],
                });
            }

            if (!data.frequencyUnit) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Unit is required",
                    path: ["frequencyUnit"],
                });
            }
        }

        if (data.goalType !== "binary") {
            if (!data.targetValue) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Target value is required",
                    path: ["targetValue"],
                });
            }

            if (!data.targetUnit) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Target unit is required",
                    path: ["targetUnit"],
                });
            }

            if (data.goalType === "duration" && data.targetUnit !== "minutes") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Duration goals must use minutes",
                    path: ["targetUnit"],
                });
            }

            if (data.goalType === "count" && data.targetUnit !== "times") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Count goals must use times",
                    path: ["targetUnit"],
                });
            }
        }
    });

export const habitUpdateSchema = habitValuesSchema.extend({
    id: z.uuid(),
});

export type THabitFormInput = z.input<typeof habitValuesSchema>;
export type THabitFormValues = z.infer<typeof habitValuesSchema>;

export const deleteHabitSchema = z.object({
    id: z.uuid(),
});

export const deleteManyHabitsSchema = z.object({
    ids: z.array(z.uuid()).min(1, "Select at least one habit to delete"),
});

export const archiveHabitSchema = z.object({
    id: z.uuid(),
    archive: z.boolean(),
});

export const exportHabitsSchema = z.object({
    startDate: z.date(),
    endDate: z.date(),
});
