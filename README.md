# SyncNest — Premium SQL Browser

A beautiful, high-performance desktop SQLite database browser designed for modern workflows. Built by **Sundan Sharma**.

## ✨ Key Features

- **📂 Local Database Discovery** — Automatically scans your system, iOS Simulators, and Android Emulators for SQLite files.
- **📊 Adaptive Data Views** — Switch between a high-density **Table View** and a MongoDB Compass-inspired **Document View** for nested JSON data.
- **🔍 Advanced SQL Editor** — Full syntax-highlighted editor with `Ctrl+Enter` execution support and multi-query history.
- **🔄 Auto-Updates** — Built-in SaaS-level update system that notifies you and prepares the latest version in the background.
- **🚀 CI/CD Release Pipeline** — Fully automated build and release system via GitHub Actions.
- **📤 Pro Exports** — One-click CSV export for any table or custom query result.
- **💎 Glassmorphism UI** — Stunning modern interface with interactive animations and a premium dark theme.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18, v20, or v22 (LTS recommended)
- Git (for release management)

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/Sundanpatyad/SyncNest.git
cd SyncNest

# Install dependencies
npm install

# Start development mode
npm start
```

## 📦 Automated Releases (SaaS Pipeline)

SyncNest uses a professional CI/CD pipeline. No manual builds are required on your local machine.

### Triggering a New Release
Official installers (`.exe` and `.dmg`) are built automatically when you push a version tag:

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Update feature X"
   git push origin module
   ```

2. **Tag and Push**:
   ```bash
   git tag v1.0.3
   git push origin v1.0.3
   ```

3. **Check the Build**: Head to your repository's **Actions** tab. GitHub will build the installers and automatically create a new **GitHub Release** with the downloads!

### Latest Download Links
- **Windows (.exe)**: `https://github.com/Sundanpatyad/SyncNest/releases/latest/download/SyncNest-Setup.exe`
- **macOS Apple Silicon (.dmg)**: `https://github.com/Sundanpatyad/SyncNest/releases/latest/download/SyncNest-arm64.dmg`
- **macOS Intel (.dmg)**: `https://github.com/Sundanpatyad/SyncNest/releases/latest/download/SyncNest-x64.dmg`
- **Linux**: `https://github.com/Sundanpatyad/SyncNest/releases/latest`

## 🔄 Auto-Update System

SyncNest is equipped with `electron-updater`. 

- **Check**: Every time the app starts, it checks for a newer version in your GitHub Releases.
- **Notify**: A toast alert informs you when an update is downloading.
- **Apply**: Once the download is complete, a prompt confirms the update will be applied on the next launch.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Core** | Electron.js |
| **Engine** | better-sqlite3 |
| **Styling** | Vanilla CSS (Glassmorphism) |
| **Automation** | GitHub Actions |
| **Updates** | electron-updater |
| **Packaging** | electron-builder |

## 📁 Project Structure

```text
SyncNest/
├── .github/workflows/ — GitHub Actions build pipeline
├── electron/          — Main process & Preload bridge
├── src/               — Frontend UI code
│   ├── index.html     — Entry point with glassmorphism UI
│   ├── js/            — UI Controller (app.js)
│   └── styles/        — Modern CSS design tokens
├── package.json       — Build & Publish configuration
└── README.md          — Project documentation
```

## 💡 Usage Tips

- **Search data**: Use the toolbar search to filter rows instantly across all columns.
- **Edit Inline**: Click any row in a table to open the editor modal.
- **SQL Studio**: Use the SQL Editor for complex joins and schema migrations.
- **RTL Support**: File paths in the local discovery view are handled with RTL protection to ensure clarity.

---
Created with ❤️ by **Sundan Sharma**