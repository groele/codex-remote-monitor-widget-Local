import { Cpu, Gauge, HardDrive, MonitorCog, Pin, PinOff, RefreshCw, Settings, X, Zap } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { QuotaWindow, Settings as WidgetSettings, WidgetSnapshot } from "../shared/types";

type Tone = "green" | "blue" | "yellow" | "red" | "gray";

const emptySnapshot: WidgetSnapshot = {
  codex: null,
  local: null,
  updatedAt: Date.now(),
  errors: []
};

export function App() {
  const [snapshot, setSnapshot] = useState<WidgetSnapshot>(emptySnapshot);
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");

  useEffect(() => {
    void window.monitorWidget.readSnapshot().then(setSnapshot);
    void window.monitorWidget.readSettings().then((value) => {
      setSettings(value);
    });
    const unsubscribeSnapshot = window.monitorWidget.onSnapshotUpdated(setSnapshot);
    const unsubscribeSettings = window.monitorWidget.onOpenSettings(() => setShowSettings(true));
    return () => {
      unsubscribeSnapshot();
      unsubscribeSettings();
    };
  }, []);

  const local = snapshot.local;
  const hasGpu = Boolean(local?.gpus.length);

  async function refresh() {
    setRefreshing(true);
    try {
      setSnapshot(await window.monitorWidget.refreshSnapshot());
    } finally {
      setRefreshing(false);
    }
  }

  async function togglePin() {
    if (!settings) {
      return;
    }
    const isPinned = await window.monitorWidget.toggleAlwaysOnTop();
    setSettings({ ...settings, alwaysOnTop: isPinned });
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!settings) {
      return;
    }
    const saved = await window.monitorWidget.saveSettings(settings);
    setSettings(saved);
    setShowSettings(false);
    setConnectionMessage("设置已保存");
    void refresh();
  }

  return (
    <main className="shell">
      <section className="widget">
        <header className="titlebar">
          <div className="brand">
            <span className="brand-mark">
              <MonitorCog size={16} />
            </span>
            <span>Codex</span>
          </div>
          <div className="updated-container">
            <span className="pulse-dot" />
            <span className="updated">{formatTime(snapshot.updatedAt)}</span>
          </div>
          <div className="actions">
            <button
              title={settings?.alwaysOnTop ? "取消置顶" : "窗口置顶"}
              className={`icon-button ${settings?.alwaysOnTop ? "active" : ""}`}
              onClick={togglePin}
            >
              {settings?.alwaysOnTop ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            <button title="刷新" className="icon-button" onClick={refresh} disabled={isRefreshing}>
              <RefreshCw size={14} className={isRefreshing ? "spin" : ""} />
            </button>
            <button title="设置" className="icon-button" onClick={() => setShowSettings(true)}>
              <Settings size={14} />
            </button>
            <button title="隐藏至托盘" className="icon-button" onClick={() => void window.monitorWidget.closeWindow()}>
              <X size={14} />
            </button>
          </div>
        </header>

        <div className="content">
          {(settings?.showCodexQuota ?? true) && (
            <>
              <QuotaRow title={snapshot.codex?.shortWindow?.label ?? "5小时"} window={snapshot.codex?.shortWindow} />
              <QuotaRow title={snapshot.codex?.longWindow?.label ?? "周限额"} window={snapshot.codex?.longWindow} />
            </>
          )}

          {(settings?.showCodexQuota ?? true) &&
            ((settings?.showCpu ?? true) || (settings?.showRam ?? true) || (settings?.showGpu ?? true)) && (
              <div className="divider" />
            )}

          {(settings?.showCpu ?? true) && (
            <MetricRow
              icon={<Cpu size={15} />}
              title="CPU"
              value={local?.cpuPercent == null ? "N/A" : `${local.cpuPercent.toFixed(1)}%`}
              subtitle={local?.hostname ? `本地 (${local.hostname})` : "本地电脑"}
              percent={local?.cpuPercent ?? 0}
              tone={getUsageTone(local?.cpuPercent ?? 0, "green")}
            />
          )}
          {(settings?.showRam ?? true) && (
            <MetricRow
              icon={<HardDrive size={15} />}
              title="RAM"
              value={local?.ram ? `${local.ram.usedPercent.toFixed(1)}%` : "N/A"}
              subtitle={
                local?.ram
                  ? `${(local.ram.usedMb / 1024).toFixed(1)} / ${(local.ram.totalMb / 1024).toFixed(1)} GB`
                  : "等待数据"
              }
              percent={local?.ram?.usedPercent ?? 0}
              tone={getUsageTone(local?.ram?.usedPercent ?? 0, "blue")}
            />
          )}
          {(settings?.showGpu ?? true) && (
            <MetricRow
              icon={<Zap size={15} />}
              title="GPU"
              value={hasGpu && local!.gpus[0].utilizationPercent != null ? `${local!.gpus[0].utilizationPercent}%` : "N/A"}
              subtitle={gpuSubtitle(local)}
              percent={hasGpu ? local!.gpus[0].utilizationPercent ?? 0 : 0}
              tone={hasGpu ? getUsageTone(local!.gpus[0].utilizationPercent ?? 0, "blue") : "gray"}
            />
          )}
        </div>

        {snapshot.errors.length > 0 && <div className="status-line">{snapshot.errors[0]}</div>}
      </section>

      {showSettings && settings && (
        <section className="settings-panel">
          <form onSubmit={saveSettings}>
            <header>
              <strong>设置</strong>
              <button title="关闭设置" type="button" className="icon-button" onClick={() => setShowSettings(false)}>
                <X size={14} />
              </button>
            </header>
            <label>
              <span>刷新间隔(秒)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.refreshIntervalSec}
                onChange={(event) =>
                  setSettings({ ...settings, refreshIntervalSec: Number(event.target.value) })
                }
              />
            </label>
            <label className="toggle-label">
              <span>窗口始终置顶</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.alwaysOnTop}
                  onChange={(event) => setSettings({ ...settings, alwaysOnTop: event.target.checked })}
                />
                <span className="slider" />
              </label>
            </label>

            <div className="modules-group">
              <div className="modules-group-title">显示模块</div>
              <label className="toggle-label">
                <span>Codex 限额</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.showCodexQuota}
                    onChange={(event) => setSettings({ ...settings, showCodexQuota: event.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </label>
              <label className="toggle-label">
                <span>CPU 监控</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.showCpu}
                    onChange={(event) => setSettings({ ...settings, showCpu: event.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </label>
              <label className="toggle-label">
                <span>RAM 内存</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.showRam}
                    onChange={(event) => setSettings({ ...settings, showRam: event.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </label>
              <label className="toggle-label">
                <span>GPU 显卡</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.showGpu}
                    onChange={(event) => setSettings({ ...settings, showGpu: event.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </label>
            </div>

            <footer>
              <button type="submit" className="primary">
                保存
              </button>
            </footer>
            {connectionMessage && <p className="connection-message">{connectionMessage}</p>}
          </form>
        </section>
      )}
    </main>
  );
}

function QuotaRow({ title, window }: { title: string; window: QuotaWindow | null | undefined }) {
  const percent = window?.remainingPercent ?? 0;
  return (
    <MetricRow
      icon={<Gauge size={15} />}
      title={title}
      value={window ? `剩余 ${percent}%` : "未连接"}
      subtitle={window?.resetsAt ? formatReset(window.resetsAt) : "等待 Codex 数据"}
      percent={percent}
      tone="green"
    />
  );
}

function MetricRow({
  icon,
  title,
  value,
  subtitle,
  percent,
  tone
}: {
  icon: JSX.Element;
  title: string;
  value: string;
  subtitle: string;
  percent: number;
  tone: Tone;
}) {
  const clampPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="metric-row">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div className="metric-main">
        <div className="metric-top">
          <span className="metric-title">{title}</span>
          <span className={`badge ${tone}`}>{value}</span>
        </div>
        <div className="metric-bottom">
          <div className="progress-track">
            <div className={`progress-bar ${tone}`} style={{ width: `${clampPercent}%` }} />
          </div>
          <span className="subtitle-text">{subtitle}</span>
        </div>
      </div>
    </div>
  );
}

function getUsageTone(percent: number, defaultTone: "green" | "blue"): Tone {
  if (percent >= 85) {
    return "red";
  }
  if (percent >= 70) {
    return "yellow";
  }
  return defaultTone;
}

function gpuSubtitle(local: WidgetSnapshot["local"]): string {
  if (!local) {
    return "等待本地状态";
  }
  const gpu = local.gpus[0];
  if (!gpu) {
    return "未检测到 NVIDIA GPU";
  }
  const memory =
    gpu.memoryUsedMb == null || gpu.memoryTotalMb == null ? "显存 N/A" : `${gpu.memoryUsedMb}/${gpu.memoryTotalMb} MB`;
  const temp = gpu.temperatureC == null ? "温度 N/A" : `${gpu.temperatureC}°C`;
  return `${memory} · ${temp}`;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(timestamp);
}

function formatReset(timestamp: number): string {
  const millis = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(millis);
}
