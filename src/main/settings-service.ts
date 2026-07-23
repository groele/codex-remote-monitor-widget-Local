import { app } from "electron";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { Settings } from "../shared/types";

const DEFAULT_SETTINGS: Settings = {
  refreshIntervalSec: 5,
  alwaysOnTop: true,
  compactMode: false,
  theme: "dark",
  showCodexQuota: true,
  showCpu: true,
  showRam: true,
  showGpu: true,
  windowBounds: {
    width: 430,
    height: 360
  }
};

type StoredSettings = Partial<Settings>;

export class SettingsService {
  private filePath: string | null = null;

  async read(): Promise<Settings> {
    const stored = await this.readStored();
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async save(input: Settings): Promise<Settings> {
    const current = await this.readStored();
    const stored: StoredSettings = {
      ...current,
      refreshIntervalSec: normalizeRefresh(input.refreshIntervalSec),
      alwaysOnTop: Boolean(input.alwaysOnTop),
      compactMode: Boolean(input.compactMode),
      theme: input.theme === "light" ? "light" : "dark",
      showCodexQuota: Boolean(input.showCodexQuota),
      showCpu: Boolean(input.showCpu),
      showRam: Boolean(input.showRam),
      showGpu: Boolean(input.showGpu),
      windowBounds: input.windowBounds ?? current.windowBounds ?? DEFAULT_SETTINGS.windowBounds
    };

    await fs.mkdir(path.dirname(this.getFilePath()), { recursive: true });
    await fs.writeFile(this.getFilePath(), JSON.stringify(stored, null, 2), "utf8");
    return this.read();
  }



  async saveWindowBounds(bounds: Settings["windowBounds"]): Promise<void> {
    const settings = await this.readStored();
    await fs.mkdir(path.dirname(this.getFilePath()), { recursive: true });
    await fs.writeFile(
      this.getFilePath(),
      JSON.stringify({ ...settings, windowBounds: bounds }, null, 2),
      "utf8"
    );
  }

  private async readStored(): Promise<StoredSettings> {
    try {
      const raw = await fs.readFile(this.getFilePath(), "utf8");
      return JSON.parse(raw) as StoredSettings;
    } catch {
      return {};
    }
  }

  private getFilePath(): string {
    if (!this.filePath) {
      this.filePath = path.join(app.getPath("userData"), "settings.json");
    }
    return this.filePath;
  }
}

function normalizeRefresh(seconds: number): number {
  const value = Number(seconds);
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.refreshIntervalSec;
  }
  return Math.max(1, Math.min(60, Math.round(value)));
}

