import type { RamMetric } from "./types";

export function getRamMetric(totalBytes: number, freeBytes: number): RamMetric {
  if (totalBytes <= 0) {
    return { usedMb: 0, totalMb: 0, usedPercent: 0 };
  }
  const totalMb = Math.round(totalBytes / (1024 * 1024));
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const usedMb = Math.round(usedBytes / (1024 * 1024));
  const usedPercent = Math.round((usedBytes / totalBytes) * 1000) / 10;
  return {
    usedMb,
    totalMb,
    usedPercent
  };
}
