import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import path from "node:path";
import type { Settings, WidgetSnapshot } from "../shared/types";
import { CodexService } from "./codex-service";
import { LocalMetricsService } from "./local-metrics-service";
import { SettingsService } from "./settings-service";
import { SnapshotService } from "./snapshot-service";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const settingsService = new SettingsService();
const localMetricsService = new LocalMetricsService();
const codexService = new CodexService();
const snapshotService = new SnapshotService(settingsService, localMetricsService, codexService);

async function createWindow(): Promise<void> {
  const settings = await settingsService.read();
  const bounds = settings.windowBounds ?? { width: 430, height: 360 };

  const iconDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAa0lEQVR4nGNgGAVIQGBn43964AG1HKcjRh0wKB1ALTD0HcAvrkUWHnUAzR1gcnnmqAPo5wCQZdgwPsfQNREOmANwhQwID58QoBQMXQfgw8RYgg+POmBoOYCaiW9oOYCaiW9oPoAWePA5gJ6OwGr5iAUAjbOQIrOjeawAAAAASUVORK5CYII=";
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
    skipTaskbar: true,
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
  applyClickThrough(settings.clickThrough);
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on("move", () => saveWindowBoundsSoon());
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
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAa0lEQVR4nGNgGAVIQGBn43964AG1HKcjRh0wKB1ALTD0HcAvrkUWHnUAzR1gcnnmqAPo5wCQZdgwPsfQNREOmANwhQwID58QoBQMXQfgw8RYgg+POmBoOYCaiW9oOYCaiW9oPoAWePA5gJ6OwGr5iAUAjbOQIrOjeawAAAAASUVORK5CYII=";
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

function applyClickThrough(clickThrough: boolean): void {
  if (!mainWindow) {
    return;
  }
  if (clickThrough) {
    mainWindow.setAlwaysOnTop(true, "screen-saver");
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
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
      applyClickThrough(saved.clickThrough);
    }
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
  ipcMain.handle("window:toggle-click-through", async () => {
    const current = await settingsService.read();
    const updated = await settingsService.save({ ...current, clickThrough: !current.clickThrough });
    applyClickThrough(updated.clickThrough);
    return updated.clickThrough;
  });
  ipcMain.handle("window:set-ignore-mouse-events", async (_event, ignore: boolean) => {
    if (!mainWindow) {
      return;
    }
    if (ignore) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
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
