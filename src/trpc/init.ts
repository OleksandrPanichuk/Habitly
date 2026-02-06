import { db } from "@/db";
import { auth } from "@/lib/auth";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";
import superjson from "superjson";

export const createTRPCContext = cache(
  async (opts?: { headers?: Headers; req?: Request }) => {
    const head = opts?.headers ?? opts?.req?.headers ?? (await headers());

    const authSession = await auth.api.getSession({
      headers: head,
    });

    return {
      db,
      user: authSession?.user ?? null,
    };
  },
);

type TContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource.",
    });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});
