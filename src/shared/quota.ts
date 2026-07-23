import type { CodexQuotaSnapshot, QuotaWindow } from "./types";

export interface RateLimitWindowPayload {
  usedPercent?: number | null;
  used_percent?: number | null;
  remainingPercent?: number | null;
  remaining_percent?: number | null;
  windowDurationMins?: number | null;
  window_duration_mins?: number | null;
  durationMins?: number | null;
  duration_mins?: number | null;
  resetsAt?: number | null;
  resets_at?: number | null;
  resetAt?: number | null;
  reset_at?: number | null;
}

export interface RateLimitSnapshotPayload {
  limitId?: string | null;
  limitName?: string | null;
  primary?: RateLimitWindowPayload | null;
  primaryWindow?: RateLimitWindowPayload | null;
  secondary?: RateLimitWindowPayload | null;
  secondaryWindow?: RateLimitWindowPayload | null;
  weekly?: RateLimitWindowPayload | null;
  windows?: RateLimitWindowPayload[] | null;
  credits?: CodexQuotaSnapshot["credits"];
  planType?: string | null;
  plan_type?: string | null;
}

export interface RateLimitsResponsePayload {
  rateLimits?: RateLimitSnapshotPayload;
  rate_limits?: RateLimitSnapshotPayload;
  rateLimitsByLimitId?: Record<string, RateLimitSnapshotPayload | undefined> | null;
}

export function normalizeCodexQuota(response: any): CodexQuotaSnapshot | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  let snapshot: any = null;
  if (response.rateLimitsByLimitId && typeof response.rateLimitsByLimitId === "object") {
    snapshot =
      response.rateLimitsByLimitId.codex ??
      response.rateLimitsByLimitId.default ??
      Object.values(response.rateLimitsByLimitId)[0];
  }
  if (!snapshot) {
    snapshot = response.rateLimits ?? response.rate_limits ?? response;
  }

  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const primaryRaw =
    snapshot.primary ??
    snapshot.primaryWindow ??
    snapshot.primary_window ??
    snapshot.short ??
    (Array.isArray(snapshot.windows) ? snapshot.windows[0] : null);

  const secondaryRaw =
    snapshot.secondary ??
    snapshot.secondaryWindow ??
    snapshot.secondary_window ??
    snapshot.long ??
    snapshot.weekly ??
    (Array.isArray(snapshot.windows) ? snapshot.windows[1] : null);

  const shortWindow = normalizeWindow(primaryRaw, "5小时");
  const longWindow = normalizeWindow(secondaryRaw, "周限额");

  if (!shortWindow && !longWindow) {
    return null;
  }

  return {
    shortWindow,
    longWindow,
    credits: snapshot.credits ?? null,
    planType: snapshot.planType ?? snapshot.plan_type ?? null
  };
}

export function normalizeWindow(
  window: any,
  fallbackLabel: string
): QuotaWindow | null {
  if (!window || typeof window !== "object") {
    return null;
  }

  let usedPercent: number | undefined;
  if (typeof window.usedPercent === "number") {
    usedPercent = window.usedPercent;
  } else if (typeof window.used_percent === "number") {
    usedPercent = window.used_percent;
  } else if (typeof window.remainingPercent === "number") {
    usedPercent = 100 - window.remainingPercent;
  } else if (typeof window.remaining_percent === "number") {
    usedPercent = 100 - window.remaining_percent;
  }

  if (usedPercent === undefined) {
    return null;
  }

  const clampedUsed = clamp(usedPercent);
  const minutes =
    window.windowDurationMins ??
    window.window_duration_mins ??
    window.durationMins ??
    window.duration_mins ??
    null;

  const rawResetsAt =
    window.resetsAt ??
    window.resets_at ??
    window.resetAt ??
    window.reset_at ??
    null;

  let resetsAt: number | null = null;
  if (typeof rawResetsAt === "number" && rawResetsAt > 0) {
    resetsAt = rawResetsAt < 10_000_000_000 ? rawResetsAt * 1000 : rawResetsAt;
  }

  return {
    label: labelForDuration(minutes, fallbackLabel),
    usedPercent: clampedUsed,
    remainingPercent: clamp(100 - clampedUsed),
    resetsAt
  };
}

export function labelForDuration(minutes: number | null | undefined, fallback: string): string {
  if (!minutes) {
    return fallback;
  }
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  if (minutes < 60 * 24) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}小时`;
  }
  if (minutes % (60 * 24 * 7) === 0) {
    return "周限额";
  }
  const days = minutes / (60 * 24);
  return `${Number.isInteger(days) ? days : days.toFixed(1)}天`;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}
