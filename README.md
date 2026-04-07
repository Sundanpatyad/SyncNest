# SQL Browser — README

A beautiful, cross-platform desktop SQLite database browser built with Electron.js.

## ✨ Features

- **Open any SQLite file** — `.db`, `.sqlite`, `.sqlite3`, `.db3`
- **Table Explorer** — Sidebar listing all tables with row counts
- **Visual Data Grid** — Paginated, sortable, searchable table viewer
- **SQL Query Editor** — Full syntax-highlighted editor (CodeMirror)
- **CSV Export** — Export any table or query result
- **Recent Files** — Remembers recently opened databases
- **Drag & Drop** — Drop a `.db` file directly onto the app

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (included with Node.js)

### Install & Run

```bash
# Install dependencies
npm install

# Start the app in development mode
npm start
```

### Build Installers

```bash
# Build for your current platform
npm run build

# Build for Windows specifically
npm run build:win

# Build for macOS specifically
npm run build:mac
```

Installers are saved to the `build/` directory.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron.js |
| Database Engine | better-sqlite3 |
| SQL Editor | CodeMirror 5 |
| UI | Vanilla HTML/CSS/JS |
| Packaging | electron-builder |

## 📁 Project Structure

```
SQL_BRowser/
├── electron/
│   ├── main.js        — Electron main process
│   └── preload.js     — Secure IPC bridge
├── src/
│   ├── index.html     — Main app UI
│   ├── styles/
│   │   └── main.css   — Premium dark theme
│   └── js/
│       └── app.js     — UI controller
├── package.json
└── README.md
```

## 💡 Usage Tips

- **Run a selection**: Highlight SQL text and press `Ctrl+Enter` to run just that selection
- **Search data**: Use the search bar in the toolbar to filter table rows across all columns
- **Sort columns**: Click any column header to sort ascending/descending
- **Export**: Use the Export CSV button to save the current table or query result


<!-- ForIndatllLocally -->
xattr -cr /Applications/SyncNest.app