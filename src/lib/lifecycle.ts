import { lifecycleEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type TDatabase = typeof import("@/db").db;

export async function logLifecycleEvent(
    db: TDatabase,
    userId: string,
    eventType: string,
    metadata?: Record<string, unknown>,
) {
    await db.insert(lifecycleEvents).values({
        userId,
        eventType,
        metadata: metadata ?? null,
    });
}

export async function hasLifecycleEvent(
    db: TDatabase,
    userId: string,
    eventType: string,
) {
    const [event] = await db
        .select({ id: lifecycleEvents.id })
        .from(lifecycleEvents)
        .where(
            and(
                eq(lifecycleEvents.userId, userId),
                eq(lifecycleEvents.eventType, eventType),
            ),
        )
        .limit(1);

    return Boolean(event);
}
