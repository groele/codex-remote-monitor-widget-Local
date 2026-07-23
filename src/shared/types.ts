export interface Settings {
  refreshIntervalSec: number;
  alwaysOnTop: boolean;
  compactMode: boolean;
  theme?: "dark" | "light";
  showCodexQuota: boolean;
  showCpu: boolean;
  showRam: boolean;
  showGpu: boolean;
  windowBounds?: {
    x?: number;
    y?: number;
    width: number;
    height: number;
  };
}

export interface QuotaWindow {
  label: string;
  remainingPercent: number;
  usedPercent: number;
  resetsAt: number | null;
}

export interface CodexQuotaSnapshot {
  shortWindow: QuotaWindow | null;
  longWindow: QuotaWindow | null;
  credits?: {
    hasCredits: boolean;
    unlimited: boolean;
    balance: string | null;
  } | null;
  planType?: string | null;
}

export interface GpuMetric {
  index: number;
  utilizationPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  temperatureC: number | null;
}

export interface RamMetric {
  usedMb: number;
  totalMb: number;
  usedPercent: number;
}

export interface LocalMetricsSnapshot {
  hostname: string;
  cpuPercent: number | null;
  ram: RamMetric | null;
  gpus: GpuMetric[];
  updatedAt: number | null;
  message?: string;
}

export interface WidgetSnapshot {
  codex: CodexQuotaSnapshot | null;
  local: LocalMetricsSnapshot | null;
  updatedAt: number;
  errors: string[];
}

export interface RendererApi {
  readSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<Settings>;
  readSnapshot: () => Promise<WidgetSnapshot>;
  refreshSnapshot: () => Promise<WidgetSnapshot>;
  openSettings: () => Promise<void>;
  closeSettings: () => Promise<void>;
  closeWindow: () => Promise<void>;
  toggleAlwaysOnTop: () => Promise<boolean>;
  toggleCompactMode: () => Promise<boolean>;
  onSnapshotUpdated: (callback: (snapshot: WidgetSnapshot) => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
}



