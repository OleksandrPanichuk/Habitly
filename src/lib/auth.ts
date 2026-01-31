import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { sendPasswordResetEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      verification,
      account,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: Record<string, unknown>;
      url: string;
    }) => {
      try {
        await sendPasswordResetEmail(
          user.email as string,
          url,
          user.name as string | undefined,
        );
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw error;
      }
    },
  },
});
