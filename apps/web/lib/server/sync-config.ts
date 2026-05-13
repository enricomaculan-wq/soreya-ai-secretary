export function readSyncLookbackDays(defaultValue = 7): number {
  return clampNumber(process.env.SYNC_LOOKBACK_DAYS, 1, 90, defaultValue);
}

export function readSyncLookaheadDays(defaultValue = 30): number {
  return clampNumber(process.env.SYNC_LOOKAHEAD_DAYS, 1, 365, defaultValue);
}

export function readSyncEmailLimit(defaultValue = 25): number {
  return clampNumber(process.env.SYNC_EMAIL_LIMIT, 1, 100, defaultValue);
}

export function readSyncCalendarLimit(defaultValue = 250): number {
  return clampNumber(process.env.SYNC_CALENDAR_LIMIT, 1, 1000, defaultValue);
}

export function buildCalendarSyncRange() {
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + readSyncLookaheadDays());

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function buildEmailSyncRange() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - readSyncLookbackDays());

  return {
    start: start.toISOString(),
    end: new Date().toISOString(),
  };
}

function clampNumber(rawValue: string | undefined, min: number, max: number, defaultValue: number): number {
  const parsed = Number(rawValue ?? defaultValue);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
