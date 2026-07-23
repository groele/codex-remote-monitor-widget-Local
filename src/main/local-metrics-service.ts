import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LocalMetricsSnapshot, GpuMetric } from "../shared/types";
import { calculateCpuPercent, getSystemCpuSample, CpuSample } from "../shared/cpu";
import { getRamMetric } from "../shared/ram";
import { parseNvidiaSmi } from "../shared/gpu";

const execFileAsync = promisify(execFile);
const GPU_QUERY_ARGS = [
  "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu",
  "--format=csv,noheader,nounits"
];

export class LocalMetricsService {
  private lastCpuSample: CpuSample | null = null;
  private nvidiaSmiBin: string | null | undefined = undefined;

  async collect(): Promise<LocalMetricsSnapshot> {
    try {
      const hostname = os.hostname();

      // 1. CPU
      const currentCpuSample = getSystemCpuSample(os.cpus());
      let cpuPercent: number;
      if (this.lastCpuSample) {
        cpuPercent = calculateCpuPercent(this.lastCpuSample, currentCpuSample);
        this.lastCpuSample = currentCpuSample;
      } else {
        this.lastCpuSample = currentCpuSample;
        await new Promise((resolve) => setTimeout(resolve, 200));
        const nextSample = getSystemCpuSample(os.cpus());
        cpuPercent = calculateCpuPercent(currentCpuSample, nextSample);
        this.lastCpuSample = nextSample;
      }

      // 2. RAM
      const ram = getRamMetric(os.totalmem(), os.freemem());

      // 3. GPU
      let gpus: GpuMetric[] = [];
      const nvidiaCmd = this.getNvidiaSmiCommand();
      if (nvidiaCmd) {
        try {
          const { stdout } = await execFileAsync(nvidiaCmd, GPU_QUERY_ARGS, { timeout: 3000 });
          if (stdout && stdout.trim()) {
            gpus = parseNvidiaSmi(stdout);
          }
        } catch {
          // Failure executing nvidia-smi command
        }
      }


      return {
        hostname,
        cpuPercent,
        ram,
        gpus,
        updatedAt: Date.now()
      };
    } catch (error) {
      return {
        hostname: os.hostname() || "localhost",
        cpuPercent: null,
        ram: null,
        gpus: [],
        updatedAt: Date.now(),
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getNvidiaSmiCommand(): string | null {
    if (this.nvidiaSmiBin !== undefined) {
      return this.nvidiaSmiBin;
    }

    if (process.platform !== "win32") {
      this.nvidiaSmiBin = "nvidia-smi";
      return this.nvidiaSmiBin;
    }

    // Windows candidate paths
    const candidates = [
      "nvidia-smi",
      path.join(process.env.SystemRoot || "C:\\Windows", "System32", "nvidia-smi.exe"),
      path.join(process.env.ProgramFiles || "C:\\Program Files", "NVIDIA Corporation", "NVSMI", "nvidia-smi.exe")
    ];

    // Also scan DriverStore if possible
    const driverStoreDir = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "DriverStore", "FileRepository");
    if (fs.existsSync(driverStoreDir)) {
      try {
        const subdirs = fs.readdirSync(driverStoreDir);
        for (const dir of subdirs) {
          if (dir.toLowerCase().includes("nv")) {
            const exePath = path.join(driverStoreDir, dir, "nvidia-smi.exe");
            if (fs.existsSync(exePath)) {
              candidates.push(exePath);
              break;
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    for (const candidate of candidates) {
      if (candidate === "nvidia-smi" || fs.existsSync(candidate)) {
        this.nvidiaSmiBin = candidate;
        return this.nvidiaSmiBin;
      }
    }

    this.nvidiaSmiBin = null;
    return null;
  }
}

