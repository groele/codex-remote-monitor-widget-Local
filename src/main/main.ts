import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from "electron";
import path from "node:path";
import type { Settings, WidgetSnapshot } from "../shared/types";
import { CodexService } from "./codex-service";
import { LocalMetricsService } from "./local-metrics-service";
import { SettingsService } from "./settings-service";
import { SnapshotService } from "./snapshot-service";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
const SNAP_THRESHOLD = 20;

const settingsService = new SettingsService();
const localMetricsService = new LocalMetricsService();
const codexService = new CodexService();
const snapshotService = new SnapshotService(settingsService, localMetricsService, codexService);

async function createWindow(): Promise<void> {
  const settings = await settingsService.read();
  const bounds = settings.windowBounds ?? { width: 430, height: 360 };

  const iconDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA00lEQVR4nO3UsQ3DMAxEUW2QdNkhtRfMGB4lc3ggZ4AUpkVCJ1L/gGsN3oOh1gghxJjn93Nm6bLDwyHUA6QI6sOlCOqDpQjqQ+UI6iOlAOoD5QiWD8wcAAAYDPB4veUFAIAEANux/xUAAAAAAICVAaJAAJgBwDIQgMoAPY0CAwCAIgDLvwEAALAYQFQBAAAAHcBsAQCAAQDeegd4CwAAAAAAAAAAxAIoAgAAAMQD9CJkAbgc7/kLMtQEUBXBPL4iwu3xlRC6x1dAcI/PChE6nJC6+QE+xMH6wmyfywAAAABJRU5ErkJggg==";
  const appIcon = nativeImage.createFromDataURL(iconDataUrl);

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 380,
    minHeight: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: false,
    resizable: true,
    show: false,
    icon: appIcon,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(settings.alwaysOnTop, "floating");
  applyWindowMode(settings.compactMode);
  applyAutoLaunch(settings.autoLaunch);
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on("move", () => handleWindowMove());
  mainWindow.on("resize", () => saveWindowBoundsSoon());

  snapshotService.setWindow(mainWindow);
  snapshotService.onSnapshotUpdated((snapshot) => updateTrayToolTip(snapshot));

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function updateTrayToolTip(snapshot: WidgetSnapshot): void {
  if (!tray) {
    return;
  }
  const local = snapshot.local;
  if (!local) {
    tray.setToolTip("Codex Monitor Widget");
    return;
  }
  const cpuStr = local.cpuPercent != null ? `CPU: ${local.cpuPercent.toFixed(0)}%` : "CPU: N/A";
  const ramStr = local.ram != null ? `RAM: ${local.ram.usedPercent.toFixed(0)}%` : "RAM: N/A";
  tray.setToolTip(`Codex Monitor | ${cpuStr} | ${ramStr}`);
}

function createTray(): void {
  const iconDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA00lEQVR4nO3UsQ3DMAxEUW2QdNkhtRfMGB4lc3ggZ4AUpkVCJ1L/gGsN3oOh1gghxJjn93Nm6bLDwyHUA6QI6sOlCOqDpQjqQ+UI6iOlAOoD5QiWD8wcAAAYDPB4veUFAIAEANux/xUAAAAAAICVAaJAAJgBwDIQgMoAPY0CAwCAIgDLvwEAALAYQFQBAAAAHcBsAQCAAQDeegd4CwAAAAAAAAAAxAIoAgAAAMQD9CJkAbgc7/kLMtQEUBXBPL4iwu3xlRC6x1dAcI/PChE6nJC6+QE+xMH6wmyfywAAAABJRU5ErkJggg==";
  const image = nativeImage.createFromDataURL(iconDataUrl);
  tray = new Tray(image);
  tray.setToolTip("Codex Monitor Widget");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "显示/隐藏",
        click: () => toggleWindow()
      },
      {
        label: "刷新",
        click: () => void snapshotService.refresh()
      },
      {
        label: "设置",
        click: () => openSettings()
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
  tray.on("click", () => toggleWindow());
}

function toggleWindow(): void {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function openSettings(): void {
  if (!mainWindow) {
    return;
  }
  mainWindow.setMinimumSize(380, 320);
  mainWindow.setSize(430, 360);
  mainWindow.show();
  mainWindow.webContents.send("settings:open");
}

async function closeSettings(): Promise<void> {
  if (!mainWindow) {
    return;
  }
  const settings = await settingsService.read();
  applyWindowMode(settings.compactMode);
}

let saveBoundsTimer: NodeJS.Timeout | null = null;
function saveWindowBoundsSoon(): void {
  if (!mainWindow) {
    return;
  }
  if (saveBoundsTimer) {
    clearTimeout(saveBoundsTimer);
  }
  saveBoundsTimer = setTimeout(() => {
    if (!mainWindow) {
      return;
    }
    void settingsService.saveWindowBounds(mainWindow.getBounds());
  }, 300);
}

function handleWindowMove(): void {
  if (!mainWindow) {
    return;
  }
  const bounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const workArea = display.workArea;

  let newX = bounds.x;
  let newY = bounds.y;

  // 1. Magnetic Edge Snapping (边缘磁力吸附)
  if (Math.abs(newX - workArea.x) < SNAP_THRESHOLD) {
    newX = workArea.x;
  } else if (Math.abs((newX + bounds.width) - (workArea.x + workArea.width)) < SNAP_THRESHOLD) {
    newX = workArea.x + workArea.width - bounds.width;
  }

  if (Math.abs(newY - workArea.y) < SNAP_THRESHOLD) {
    newY = workArea.y;
  } else if (Math.abs((newY + bounds.height) - (workArea.y + workArea.height)) < SNAP_THRESHOLD) {
    newY = workArea.y + workArea.height - bounds.height;
  }

  // 2. Prevent dragging out of screen bounds (防止被拖到屏幕外)
  const minX = workArea.x;
  const maxX = workArea.x + workArea.width - bounds.width;
  const minY = workArea.y;
  const maxY = workArea.y + workArea.height - bounds.height;

  newX = Math.max(minX, Math.min(maxX, newX));
  newY = Math.max(minY, Math.min(maxY, newY));

  if (newX !== bounds.x || newY !== bounds.y) {
    mainWindow.setPosition(newX, newY);
  }

  saveWindowBoundsSoon();
}

function applyWindowMode(compactMode: boolean): void {
  if (!mainWindow) {
    return;
  }
  if (compactMode) {
    mainWindow.setMinimumSize(320, 44);
    mainWindow.setSize(340, 44);
  } else {
    mainWindow.setMinimumSize(380, 320);
    mainWindow.setSize(430, 360);
  }
}

function applyAutoLaunch(autoLaunch: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: autoLaunch,
      path: app.getPath("exe")
    });
  } catch {
    // Ignore errors during dev mode
  }
}

function registerIpc(): void {
  ipcMain.handle("settings:read", async () => settingsService.read());
  ipcMain.handle("settings:open", async () => openSettings());
  ipcMain.handle("settings:close", async () => closeSettings());
  ipcMain.handle("settings:save", async (_event, settings: Settings) => {
    const saved = await settingsService.save(settings);
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(saved.alwaysOnTop, "floating");
      applyWindowMode(saved.compactMode);
    }
    applyAutoLaunch(saved.autoLaunch);
    await snapshotService.restartTimer();
    void snapshotService.refresh();
    return saved;
  });
  ipcMain.handle("window:close", async () => {
    mainWindow?.hide();
  });
  ipcMain.handle("window:toggle-always-on-top", async () => {
    const current = await settingsService.read();
    const updated = await settingsService.save({ ...current, alwaysOnTop: !current.alwaysOnTop });
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(updated.alwaysOnTop, "floating");
    }
    return updated.alwaysOnTop;
  });
  ipcMain.handle("window:toggle-compact-mode", async () => {
    const current = await settingsService.read();
    const updated = await settingsService.save({ ...current, compactMode: !current.compactMode });
    applyWindowMode(updated.compactMode);
    return updated.compactMode;
  });
  ipcMain.handle("snapshot:read", async () => snapshotService.getSnapshot());
  ipcMain.handle("snapshot:refresh", async () => snapshotService.refresh());
}


app.whenReady().then(async () => {
  registerIpc();
  await createWindow();
  createTray();
  void snapshotService.start();
});

app.on("before-quit", () => {
  isQuitting = true;
  snapshotService.stop();
  codexService.dispose();
});

app.on("window-all-closed", () => {
  // The app intentionally lives in the tray until the user chooses Exit.
});
