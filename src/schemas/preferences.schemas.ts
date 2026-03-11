import z from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateUserPreferencesSchema = z.object({
    timezone: z.string().trim().min(1).max(100),
    preferredCheckInTime: z
        .string()
        .regex(timePattern, "Enter a valid time in HH:MM format"),
    weeklyReviewDay: z.number().int().min(0).max(6),
    reminderEmailEnabled: z.boolean(),
});
