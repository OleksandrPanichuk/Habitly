import { createTRPCRouter } from "../init";
import { habitsRouter } from "./habits.router";

export const appRouter = createTRPCRouter({
  habits: habitsRouter,
});

export type AppRouter = typeof appRouter;
