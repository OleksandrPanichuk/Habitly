import type { THabit } from "./db/schema";

export type THabitWithStatus = THabit & {
    completedAt: Date | null;
    completionNote: string | null;
    completionValue: number | null;
};
