import z from "zod";
import { habitValuesSchema } from "./habits.schemas";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const onboardingHabitSchema = habitValuesSchema;

export const onboardingStatusSchema = z.object({});

export const completeOnboardingSchema = z
    .object({
        timezone: z.string().trim().min(1).max(100),
        preferredCheckInTime: z
            .string()
            .regex(timePattern, "Enter a valid time in HH:MM format"),
        weeklyReviewDay: z.number().int().min(0).max(6),
        starterHabits: z.array(onboardingHabitSchema).max(3),
    })
    .superRefine((data, ctx) => {
        const seen = new Set<string>();

        for (const [index, habit] of data.starterHabits.entries()) {
            const normalizedName = habit.name.trim().toLowerCase();

            if (seen.has(normalizedName)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Choose unique starter habits",
                    path: ["starterHabits", index, "name"],
                });
            }

            seen.add(normalizedName);
        }
    });

export type TCompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
