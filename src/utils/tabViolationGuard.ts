export const MAX_TAB_VIOLATIONS = 3;
export const VIOLATION_DEBOUNCE_MS = 1200;

export interface ViolationUpdatePayload {
  violation_count: number;
  last_violation_at: string;
  is_locked: boolean;
  locked_reason: string | null;
}

export function buildViolationPayload(currentCount: number): {
  nextCount: number;
  shouldLock: boolean;
  payload: ViolationUpdatePayload;
} {
  const nextCount = Math.min(Math.max(currentCount, 0) + 1, MAX_TAB_VIOLATIONS);
  const shouldLock = nextCount >= MAX_TAB_VIOLATIONS;

  return {
    nextCount,
    shouldLock,
    payload: {
      violation_count: nextCount,
      last_violation_at: new Date().toISOString(),
      is_locked: shouldLock,
      locked_reason: shouldLock
        ? 'Terdeteksi keluar atau berpindah tab/aplikasi sebanyak 3 kali.'
        : null,
    },
  };
}
