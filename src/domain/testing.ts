// Test-only helpers for building branded fixtures.
import type { EntryId, ExerciseId, LocalDate, SetId, WorkoutId } from './types';

export const wid = (s: string) => s as WorkoutId;
export const eid = (s: string) => s as EntryId;
export const xid = (s: string) => s as ExerciseId;
export const sid = (s: string) => s as SetId;
export const day = (s: string) => s as LocalDate;
