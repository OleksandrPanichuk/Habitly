import { habits } from "@/db/schema";
import { createHabitSchema } from "@/schemas";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const habitsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createHabitSchema)
    .mutation(async ({ ctx, input }) => {
      const existingHabit = await ctx.db
        .select({
          id: habits.id,
        })
        .from(habits)
        .where(and(eq(habits.name, input.name), eq(habits.userId, ctx.user.id)))
        .limit(1)
        .then((res) => (res.length === 0 ? null : res[0]));

      if (existingHabit) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Habit with the same name already exists",
        });
      }

      return await ctx.db.insert(habits).values({
        name: input.name,
        userId: ctx.user.id,
        color: input.color,
        description: input.description,
        frequency: input.frequency,
        frequencyData: input.frequencyData,
      });
    }),

  getAll: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { limit = 50, cursor } = input ?? {};

      const conditions = [eq(habits.userId, ctx.user.id)];

      if (cursor) {
        conditions.push(lt(habits.createdAt, new Date(cursor)));
      }

      const items = await ctx.db
        .select()
        .from(habits)
        .where(and(...conditions))
        .orderBy(desc(habits.createdAt), desc(habits.id))
        .limit(limit + 1);

      let nextCursor: string | undefined = undefined;

      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.createdAt.toISOString();
      }

      return {
        items,
        nextCursor,
      };
    }),

  getTodayHabits: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(),
          date: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { limit = 50, cursor, date = new Date() } = input ?? {};

      const dayOfWeek = date.getDay();
      const targetDate = sql`${date.toISOString().split("T")[0]}::date`;

      const conditions = [eq(habits.userId, ctx.user.id)];

      if (cursor) {
        conditions.push(lt(habits.createdAt, new Date(cursor)));
      }

      conditions.push(
        or(
          eq(habits.frequency, "daily"),

          and(
            eq(habits.frequency, "weekly"),
            sql`${habits.frequencyData}->>'type' = 'weekly'`,
            sql`${habits.frequencyData}->'daysOfWeek' @> ${dayOfWeek}::text::jsonb`,
          ),

          and(
            eq(habits.frequency, "custom"),
            sql`${habits.frequencyData}->>'type' = 'custom'`,
            or(
              sql`${habits.lastCompletedAt} IS NULL`,
              and(
                sql`${habits.frequencyData}->>'unit' = 'days'`,
                sql`(${targetDate} - ${habits.lastCompletedAt})::integer >= (${habits.frequencyData}->>'interval')::integer`,
              ),
              and(
                sql`${habits.frequencyData}->>'unit' = 'weeks'`,
                sql`(${targetDate} - ${habits.lastCompletedAt})::integer >= (${habits.frequencyData}->>'interval')::integer * 7`,
              ),
            )!,
          ),
        )!,
      );

      const items = await ctx.db
        .select()
        .from(habits)
        .where(and(...conditions))
        .orderBy(desc(habits.createdAt), desc(habits.id))
        .limit(limit + 1);

      let nextCursor: string | undefined = undefined;

      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.createdAt.toISOString();
      }

      return {
        items,
        nextCursor,
      };
    }),
});
