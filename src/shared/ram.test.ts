import { describe, expect, it } from "vitest";
import { getRamMetric } from "./ram";

describe("ram metric helper", () => {
  it("calculates correct RAM usage and percentage", () => {
    const totalBytes = 16 * 1024 * 1024 * 1024; // 16GB
    const freeBytes = 4 * 1024 * 1024 * 1024;   // 4GB free -> 12GB used
    const metric = getRamMetric(totalBytes, freeBytes);

    expect(metric.totalMb).toBe(16384);
    expect(metric.usedMb).toBe(12288);
    expect(metric.usedPercent).toBe(75);
  });

  it("handles zero total memory safely", () => {
    const metric = getRamMetric(0, 0);
    expect(metric).toEqual({ usedMb: 0, totalMb: 0, usedPercent: 0 });
  });
});
