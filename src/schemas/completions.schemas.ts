import z from "zod";

export const getCompletionsByDateRangeSchema = z
    .object({
        habitId: z.uuid().optional(),
        startDate: z.date(),
        endDate: z.date(),
    })
    .refine((data) => data.startDate <= data.endDate, {
        message: "Start date must be before or equal to end date",
        path: ["endDate"],
    });

export const toggleCompletionSchema = z.object({
    habitId: z.uuid(),
    date: z.date(),
    note: z.string().max(500).optional(),
});

export const setCompletionProgressSchema = z.object({
    habitId: z.uuid(),
    date: z.date(),
    value: z.number().int().min(0).max(1440),
    note: z.string().max(500).optional(),
});

export const updateCompletionNoteSchema = z.object({
    habitId: z.uuid(),
    date: z.date(),
    note: z.string().max(500).nullable(),
});
