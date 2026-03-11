import { relations } from "drizzle-orm";
import {
    boolean,
    date,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

export const habitCategoryEnum = pgEnum("habit_category", [
    "health",
    "fitness",
    "learning",
    "mindfulness",
    "productivity",
    "social",
    "finance",
    "creativity",
    "other",
]);

export const frequencyTypeEnum = pgEnum("frequency_type", [
    "daily",
    "weekly",
    "custom",
]);
export const frequencyUnitEnum = pgEnum("frequency_unit", ["days", "weeks"]);
export const habitGoalTypeEnum = pgEnum("habit_goal_type", [
    "binary",
    "count",
    "duration",
]);
export const subscriptionTierEnum = pgEnum("subscription_tier", [
    "free",
    "pro",
    "lifetime",
]);

export const users = pgTable("users", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    subscriptionTier: subscriptionTierEnum("subscription_tier")
        .default("free")
        .notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionEndsAt: timestamp("subscription_ends_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const userPreferences = pgTable(
    "user_preferences",
    {
        userId: text("user_id")
            .primaryKey()
            .references(() => users.id, { onDelete: "cascade" }),
        timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
        preferredCheckInTime: varchar("preferred_check_in_time", {
            length: 5,
        })
            .notNull()
            .default("19:00"),
        weeklyReviewDay: integer("weekly_review_day").notNull().default(0),
        reminderEmailEnabled: boolean("reminder_email_enabled")
            .notNull()
            .default(false),
        reminderLastSentOn: date("reminder_last_sent_on", { mode: "date" }),
        onboardingCompletedAt: timestamp("onboarding_completed_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("user_preferences_onboarding_idx").on(
            table.onboardingCompletedAt,
        ),
    ],
);

export const sessions = pgTable(
    "sessions",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
    },
    (table) => [index("session_userId_idx").on(table.userId)],
);

export const accounts = pgTable(
    "accounts",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)],
);

export const verifications = pgTable(
    "verifications",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const habits = pgTable(
    "habits",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 50 }).notNull(),
        description: text("description"),

        frequencyType: frequencyTypeEnum("frequency_type")
            .notNull()
            .default("daily"),
        frequencyDaysOfWeek: integer("frequency_days_of_week").array(),
        frequencyInterval: integer("frequency_interval"),
        frequencyUnit: frequencyUnitEnum("frequency_unit"),

        color: varchar("color", { length: 7 }).notNull().default("#3b82f6"),
        icon: varchar("icon", { length: 10 }),
        category: habitCategoryEnum("category").default("other"),
        goalType: habitGoalTypeEnum("goal_type").notNull().default("binary"),
        targetValue: integer("target_value"),
        targetUnit: varchar("target_unit", { length: 20 }),
        reminderEnabled: boolean("reminder_enabled").notNull().default(false),
        archivedAt: timestamp("archived_at"),
        deletedAt: timestamp("deleted_at"),

        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("habit_userId_idx").on(table.userId)],
);

export const completions = pgTable(
    "completions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        habitId: uuid("habit_id")
            .notNull()
            .references(() => habits.id, { onDelete: "cascade" }),
        date: date("date", { mode: "date" }).notNull(),
        value: integer("value").notNull().default(1),
        note: text("note"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("completion_habitId_idx").on(table.habitId),
        index("completion_date_idx").on(table.date),
        uniqueIndex("completion_habitId_date_uidx").on(
            table.habitId,
            table.date,
        ),
    ],
);

export const lifecycleEvents = pgTable(
    "lifecycle_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        eventType: varchar("event_type", { length: 64 }).notNull(),
        metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("lifecycle_events_user_event_idx").on(
            table.userId,
            table.eventType,
        ),
    ],
);

export const userRelations = relations(users, ({ many, one }) => ({
    sessions: many(sessions),
    accounts: many(accounts),
    habits: many(habits),
    preferences: one(userPreferences),
    lifecycleEvents: many(lifecycleEvents),
}));

export const userPreferencesRelations = relations(
    userPreferences,
    ({ one }) => ({
        user: one(users, {
            fields: [userPreferences.userId],
            references: [users.id],
        }),
    }),
);

export const sessionRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const accountRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));

export const habitRelations = relations(habits, ({ one, many }) => ({
    user: one(users, {
        fields: [habits.userId],
        references: [users.id],
    }),
    completions: many(completions),
}));

export const completionRelations = relations(completions, ({ one }) => ({
    habit: one(habits, {
        fields: [completions.habitId],
        references: [habits.id],
    }),
}));

export const lifecycleEventRelations = relations(
    lifecycleEvents,
    ({ one }) => ({
        user: one(users, {
            fields: [lifecycleEvents.userId],
            references: [users.id],
        }),
    }),
);

export type THabit = typeof habits.$inferSelect;
export type TCompletion = typeof completions.$inferSelect;
export type TLifecycleEvent = typeof lifecycleEvents.$inferSelect;
export type TUser = typeof users.$inferSelect;
export type TUserPreferences = typeof userPreferences.$inferSelect;
export type TSession = typeof sessions.$inferSelect;
export type TAccount = typeof accounts.$inferSelect;
export type TVerification = typeof verifications.$inferSelect;
export type THabitCategory = (typeof habitCategoryEnum.enumValues)[number];
export type THabitGoalType = (typeof habitGoalTypeEnum.enumValues)[number];
export type TSubscriptionTier =
    (typeof subscriptionTierEnum.enumValues)[number];
