import type { BrowserWindow } from "electron";
import type { WidgetSnapshot } from "../shared/types";
import { CodexService } from "./codex-service";
import { LocalMetricsService } from "./local-metrics-service";
import { SettingsService } from "./settings-service";

export class SnapshotService {
  private snapshot: WidgetSnapshot = {
    codex: null,
    local: null,
    updatedAt: Date.now(),
    errors: []
  };
  private timer: NodeJS.Timeout | null = null;
  private refreshing = false;
  private listeners: Array<(snapshot: WidgetSnapshot) => void> = [];

  constructor(
    private readonly settingsService: SettingsService,
    private readonly localMetricsService: LocalMetricsService,
    private readonly codexService: CodexService
  ) {
    this.codexService.on("quota-updated", () => {
      this.snapshot = {
        ...this.snapshot,
        codex: this.codexService.getCachedQuota(),
        updatedAt: Date.now()
      };
      this.broadcast();
    });
  }

  onSnapshotUpdated(listener: (snapshot: WidgetSnapshot) => void): void {
    this.listeners.push(listener);
    listener(this.snapshot);
  }

  getSnapshot(): WidgetSnapshot {
    return this.snapshot;
  }

  async refresh(): Promise<WidgetSnapshot> {
    if (this.refreshing) {
      return this.snapshot;
    }
    this.refreshing = true;
    const errors: string[] = [];

    try {
      const [codexResult, localResult] = await Promise.allSettled([
        this.codexService.readQuota(),
        this.localMetricsService.collect()
      ]);

      const codex =
        codexResult.status === "fulfilled" ? codexResult.value : this.codexService.getCachedQuota();
      if (codexResult.status === "rejected") {
        const rawErr = codexResult.reason instanceof Error ? codexResult.reason.message : String(codexResult.reason);
        const friendlyErr = rawErr.includes("wham/usage") || rawErr.includes("failed to fetch")
          ? "Codex: 网络连接请求异常，重试中..."
          : `Codex: ${rawErr}`;
        errors.push(friendlyErr);
      } else if (this.codexService.getLastError()) {
        const rawErr = this.codexService.getLastError()!;
        const friendlyErr = rawErr.includes("wham/usage") || rawErr.includes("failed to fetch")
          ? "Codex: 网络连接请求异常，重试中..."
          : `Codex: ${rawErr}`;
        errors.push(friendlyErr);
      }

      const localSnapshot = localResult.status === "fulfilled" ? localResult.value : this.snapshot.local;
      if (localResult.status === "rejected") {
        errors.push(`Local: ${localResult.reason instanceof Error ? localResult.reason.message : localResult.reason}`);
      } else if (localResult.value.message) {
        errors.push(`Local: ${localResult.value.message}`);
      }

      this.snapshot = {
        codex,
        local: localSnapshot,
        updatedAt: Date.now(),
        errors
      };
      this.broadcast();
      return this.snapshot;
    } finally {
      this.refreshing = false;
    }
  }

  async start(): Promise<void> {
    await this.refresh();
    await this.restartTimer();
  }

  async restartTimer(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    const settings = await this.settingsService.read();
    this.timer = setInterval(() => {
      void this.refresh();
    }, settings.refreshIntervalSec * 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setWindow(window: BrowserWindow): void {
    window.webContents.on("did-finish-load", () => {
      window.webContents.send("snapshot:updated", this.snapshot);
    });
  }

  private broadcast(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.snapshot);
      } catch {
        // Ignore listener errors
      }
    }
    for (const window of this.windows()) {
      window.webContents.send("snapshot:updated", this.snapshot);
    }
  }

  private windows(): BrowserWindow[] {
    const electron = require("electron") as typeof import("electron");
    return electron.BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed());
  }
}


