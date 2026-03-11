import z from "zod";

export const getStatsSchema = z
    .object({
        startDate: z.date(),
        endDate: z.date(),
    })
    .refine((data) => data.startDate <= data.endDate, {
        error: "Start date must be before or equal to end date",
        path: ["endDate"],
    });

export const getHabitStatsSchema = z
    .object({
        habitId: z.uuid(),
        startDate: z.date(),
        endDate: z.date(),
    })
    .refine((data) => data.startDate <= data.endDate, {
        error: "Start date must be before or equal to end date",
        path: ["endDate"],
    });

export const getCoachStateSchema = z.object({});
