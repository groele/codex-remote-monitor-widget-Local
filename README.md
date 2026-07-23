# Codex Remote & Local Monitor Widget (v1.1.0)

> **Original Project / 原始开源项目**: [Xieyinmei/codex-remote-monitor-widget](https://github.com/Xieyinmei/codex-remote-monitor-widget)

[中文 README](#-codex-remote--local-monitor-widget-v110---中文说明) | [English README](#-codex-remote--local-monitor-widget-v110---english-guide)

---

## 🇨🇳 Codex Remote & Local Monitor Widget (v1.1.0) - 中文说明

> **开源致谢与说明**：本项目衍生并重构自开源项目 [Xieyinmei/codex-remote-monitor-widget](https://github.com/Xieyinmei/codex-remote-monitor-widget)。在此向原作者 [@Xieyinmei](https://github.com/Xieyinmei) 表示诚挚的感谢！
> 本项目在原项目的基础上进行了**深度架构重构与重点本地化检测增强**。现在无需复杂的远程 SSH 连接配置，即可全自动检测并实时监控**本地电脑 (Windows) 的 CPU、RAM 内存与 NVIDIA GPU 显卡**运行状态，结合优雅的现代毛玻璃悬浮挂件 UI，打造极致的桌面监控体验。

### ✨ 核心特性与本地化检测增强

#### 💻 1. 本地化硬件状态检测 (重点增强)
- **CPU 实时占用率**：精准采集本地 CPU 核心利用率，具备 3 级负载预警指示。
- **RAM 内存监控**：实时展示内存已用/总容量（GB）及占用百分比。
- **NVIDIA GPU 显卡状态**：
  - 智能扫描 Windows 系统 `PATH`、`NVSMI` 以及 `DriverStore` 驱动路径中的 `nvidia-smi` 可执行文件。
  - 自动读取 **GPU 核心利用率 (%)**、**显存使用/总容量 (MB)** 及 **GPU 实时温度 (°C)**。
  - 兼容各类 NVIDIA 桌面卡与移动端独立显卡。

#### 🚀 2. Codex 周限额与额度监控
- **全容错解析**：完美解析 OpenAI Codex API 的 `5小时限额` 与 `周限额` 数据。
- **网络波动防崩溃**：网络连通波动时自动启用上一次数据缓存，并呈现友好的网络重试提示。

#### 🧲 3. 屏幕边缘检测与磁力吸附算法
- **自由移动**：小组件支持在屏幕任意位置自由摆放。
- **动态 10% 磁力吸附**：当拖拽靠近屏幕左、右、上、下边缘距离小于屏幕尺寸的 10% 时，自动强力平滑吸附到边缘。
- **防越界保护 (Clamp)**：严格限制窗口不能被拖出显示器可视工作区外，防止窗口丢失。

#### 🎨 4. 极致毛玻璃质感 UI
- **单层透亮毛玻璃**：消除多余外边框遮罩，打造干净纯粹的悬浮质感。
- **双主题随心切**：支持 **暗黑亚克力毛玻璃** 与 **亮色水晶毛玻璃** 模式，一键随时切换。

#### 📐 5. 双模式与设置智能展开
- **迷你胶囊模式 (44px)**：缩小为精简横条，仅展示关键指标 Badge。
- **全量卡片模式 (360px)**：展开展示完整进度条与详细硬件数据。
- **设置智能展开**：在迷你模式下打开设置时，自动扩展为 360px 舒适大窗口，关闭后自动还原迷你状态。

#### ⚙️ 6. 便捷系统管理
- **开机自动启动 (Auto-Start)**：设置中可一键开启/关闭开机自启。
- **窗口始终置顶 (Always-On-Top)**：一键锁定置顶悬浮在所有窗口上方。
- **系统托盘**：包含全新设计的高清 App Icon，支持最小化至托盘与右键菜单控制。

---

### 🛠️ 安装与运行

#### 1. 使用一键安装包 (推荐)
直接下载并运行打包好的安装包：
- **[Codex Monitor Widget Setup 1.1.0.exe](./release/Codex%20Monitor%20Widget%20Setup%201.1.0.exe)**

#### 2. 本地开发与编译

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式 (Vite + Electron)
npm run dev

# 3. 执行类型检查与单元测试
npm run typecheck
npm run test

# 4. 打包 Windows 安装程序 (.exe)
npm run package:installer
```

---

## 🇬🇧 Codex Remote & Local Monitor Widget (v1.1.0) - English Guide

> **Acknowledgements & Project Notice**: This project is derived and enhanced from the open-source repository [Xieyinmei/codex-remote-monitor-widget](https://github.com/Xieyinmei/codex-remote-monitor-widget). We express our sincere gratitude to the original author [@Xieyinmei](https://github.com/Xieyinmei) for their great work!
> Building upon the original repository, this project introduces comprehensive architectural refactoring and **major enhancements for local hardware metrics detection**. Without requiring complex remote SSH setup, it automatically monitors **local Windows PC metrics (CPU, RAM, and NVIDIA GPU)** in real-time with an elegant frosted glass desktop overlay interface.

### ✨ Key Features & Enhancements

#### 💻 1. Local Hardware Metrics Monitoring (Major Highlight)
- **Local CPU Usage**: Real-time CPU core utilization percentage with 3-tier warning thresholds.
- **RAM Memory**: Live GB used / total capacity & memory pressure indicator.
- **NVIDIA GPU Detection**:
  - Automatically scans Windows system `PATH`, `NVSMI`, and `DriverStore` directories for `nvidia-smi`.
  - Live **GPU Core Utilization (%)**, **VRAM Used / Total (MB)**, and **GPU Temperature (°C)**.
  - Compatible with all NVIDIA desktop and laptop discrete graphics cards.

#### 🚀 2. Codex Quota & Rate Limit Monitoring
- **Robust Quota Normalization**: Fault-tolerant parsing for 5-hour and weekly quotas.
- **Network Glitch Resilience**: Retains cached metrics during temporary network disconnects with user-friendly retry notices.

#### 🧲 3. Screen Edge Snapping & Boundary Clamping
- **Free Dragging**: Drag the widget anywhere across multiple monitors.
- **10% Dynamic Magnetic Snapping**: Smoothly snaps to screen edges when dragged within 10% threshold of screen resolution.
- **Out-of-Bounds Clamping**: Prevents accidental dragging outside the screen work area.

#### 🎨 4. Frosted Glassmorphism UI
- **Single Layer Backdrop Blur**: Sleek acrylic frosted glass design without double blurred overlays.
- **Dual Themes**: Switch between **Dark Acrylic Glass** and **Light Crystal Glass** anytime.

#### 📐 5. Compact Pill Mode & Smart Window Auto-Expansion
- **Compact Bar (44px)**: Minimized horizontal bar with inline metrics badges.
- **Full View (360px)**: Expanded card view with progress bars.
- **Auto-Expanding Settings**: Opening settings in Compact mode automatically expands the window to 360px and restores it upon closing.

#### ⚙️ 6. System Integration & Auto-Start
- **Auto-Start on Boot**: Toggle launch on Windows startup in Settings.
- **Always-On-Top**: Pin widget above all windows.
- **System Tray**: High-DPI tray icon with right-click context menu controls.

---

### 🛠️ Installation & Build

#### 1. Pre-built Windows Installer (Recommended)
Download and run the installer:
- **[Codex Monitor Widget Setup 1.1.0.exe](./release/Codex%20Monitor%20Widget%20Setup%201.1.0.exe)**

#### 2. Build From Source

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (Vite + Electron)
npm run dev

# 3. Run typecheck & tests
npm run typecheck
npm run test

# 4. Package Windows NSIS Installer (.exe)
npm run package:installer
```

---

## 🙏 开源致谢与引用 / Acknowledgements & Credits

本项目遵循 MIT 开源协议，基于以下优秀的开源项目衍生开发，感谢原作者的无私贡献：
- **原始开源项目 (Original Project)**: [Xieyinmei/codex-remote-monitor-widget](https://github.com/Xieyinmei/codex-remote-monitor-widget)
- **原作者 GitHub (Original Author)**: [@Xieyinmei](https://github.com/Xieyinmei)

This project is licensed under the MIT License and is derived from the open-source repository above. Special thanks to the original author for their open-source contributions.

---

## 📄 License

[MIT License](./LICENSE)
