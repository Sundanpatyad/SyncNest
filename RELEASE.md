# Release Instructions

## Automated Release with GitHub Actions

### Method 1: Tag-based Release (Recommended)

1. **Update version in package.json:**
   ```bash
   # Update version number (e.g., 1.0.0 → 1.0.1)
   npm version patch  # or minor/major
   ```

2. **Commit and push changes:**
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.1"
   git push origin main
   ```

3. **Create and push tag:**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

4. **GitHub Actions will automatically:**
   - Build for Windows (.exe), macOS (.dmg), and Linux (.AppImage, .deb)
   - Create a GitHub release with all artifacts
   - Generate release notes

### Method 2: Manual Workflow Dispatch

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Build and Release** workflow
4. Click **Run workflow**
5. Enter version number (e.g., 1.0.1)
6. Click **Run workflow**

## What Gets Built

- **Windows:** SyncNest Setup 1.0.1.exe
- **macOS:** SyncNest-1.0.1.dmg  
- **Linux:** SyncNest-1.0.1.AppImage, syncnest_1.0.1_amd64.deb

## Requirements

- GitHub repository must have **Actions** enabled
- No additional secrets needed (uses built-in GITHUB_TOKEN)
- Make sure your package.json version matches the tag version

## Local Testing

Before releasing, you can test the build locally:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

The built files will be in the `dist-electron/` directory.
