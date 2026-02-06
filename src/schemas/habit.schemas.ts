import z from "zod";

const frequencyDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("daily"),
  }),
  z.object({
    type: z.literal("weekly"),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1, "At least one day of the week must be selected")
      .max(7, "No more than 7 days of the week can be selected")
      .refine(
        (days) => new Set(days).size === days.length,
        "Duplicate days of the week are not allowed",
      ),
  }),
  z.object({
    type: z.literal("custom"),
    interval: z
      .number()
      .int()
      .min(1, "Interval must be at least 1")
      .max(365, "Interval must be less than or equal to 365"),
    unit: z.enum(["days", "weeks"]),
  }),
]);

export const createHabitSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters long")
      .max(50, "Name must be less than 50 characters long"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters long")
      .optional(),
    color: z
      .string()
      .length(7, "Color must be a valid hex code")
      .regex(/^#([0-9A-Fa-f]{6})$/, "Color must be a valid hex code"),
    frequency: z.enum(["daily", "weekly", "custom"]),
    frequencyData: frequencyDataSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.frequency === "daily") {
        return !data.frequencyData || data.frequencyData.type === "daily";
      }

      if (data.frequency === "weekly") {
        return data.frequencyData?.type === "weekly";
      }

      if (data.frequency === "custom") {
        return data.frequencyData?.type === "custom";
      }

      return true;
    },
    {
      message: "Frequency data does not match the selected frequency",
      path: ["frequencyData"],
    },
  );

export const getAllHabitsSchema = z.object({
  date: z.date().optional()
});

export type TCreateHabitInput = z.infer<typeof createHabitSchema>;
