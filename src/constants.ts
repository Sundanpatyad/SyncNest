// Version-agnostic download links using GitHub's latest release redirect
// Upload files with consistent names (no version numbers) to each release:
//   - SyncNest-Setup.exe (Windows)
//   - SyncNest-arm64.dmg (Apple Silicon Mac)
//   - SyncNest-x64.dmg (Intel Mac)

export const DOWNLOAD_LINKS = {
  // Uses GitHub latest release redirect - no version number needed in URL
  // Just upload files with consistent naming to each release
  windows: "https://github.com/Sundanpatyad/SyncNest/releases/latest/download/SyncNest-Setup.exe",
  macos: "https://github.com/Sundanpatyad/SyncNest/releases/latest/download/SyncNest-arm64.dmg",
  macosIntel: "https://github.com/Sundanpatyad/SyncNest/releases/latest/download/SyncNest-x64.dmg",
  linux: "https://github.com/Sundanpatyad/SyncNest/releases/latest",
  // Fallback to releases page if specific file not found
  allReleases: "https://github.com/Sundanpatyad/SyncNest/releases",
} as const;
