import { contextBridge, ipcRenderer } from "electron";
import type { RendererApi, Settings, WidgetSnapshot } from "../shared/types";

const api: RendererApi = {
  readSettings: () => ipcRenderer.invoke("settings:read"),
  saveSettings: (settings: Settings) => ipcRenderer.invoke("settings:save", settings),
  readSnapshot: () => ipcRenderer.invoke("snapshot:read"),
  refreshSnapshot: () => ipcRenderer.invoke("snapshot:refresh"),
  openSettings: () => ipcRenderer.invoke("settings:open"),
  closeSettings: () => ipcRenderer.invoke("settings:close"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggle-always-on-top"),
  toggleCompactMode: () => ipcRenderer.invoke("window:toggle-compact-mode"),
  onSnapshotUpdated: (callback: (snapshot: WidgetSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: WidgetSnapshot) => callback(snapshot);
    ipcRenderer.on("snapshot:updated", listener);
    return () => ipcRenderer.off("snapshot:updated", listener);
  },
  onOpenSettings: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("settings:open", listener);
    return () => ipcRenderer.off("settings:open", listener);
  }
};

contextBridge.exposeInMainWorld("monitorWidget", api);


