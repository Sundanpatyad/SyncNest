# How to Complete the Build Process (Windows `.exe` & Mac `.dmg`)

Because we need to bypass local Windows caching errors and compile a macOS application natively, we use **GitHub Actions** (GitHub's free cloud servers) to do the heavy lifting.

### Step 1: Push your code to GitHub
You need to send the code and the special `.github/workflows/build.yml` file to your repository so GitHub knows what to do.

Open your terminal and run these commands:
```bash
git add .
git commit -m "Add GitHub Actions build workflow"
git push origin main
```
*(If your primary branch is named `master` instead of `main` or if you are using `dev`, change the last command to `git push origin YOUR_BRANCH_NAME`)*

### Step 2: Watch the Cloud Build Process
1. Go to your repository page on **GitHub.com** in your browser.
2. Near the top of the page, click on the **Actions** tab.
3. You will see a new automated task running called **"Build Releases"** with a yellow spinning circle indicating it's actively processing.
4. Click on **"Build Releases"** to see what's happening. You will see two parallel jobs running: one creating the Windows `.exe` and the other creating the Mac `.dmg`.

### Step 3: Download your Installers!
1. The build process will take roughly **3 to 5 minutes**.
2. Once the yellow circle turns into a **green checkmark**, the build is complete!
3. Scroll down to the bottom of the summary page to the **"Artifacts"** section.
4. You will see two zip files available for download:
   - `syncnest-windows-latest-build` (Contains your `.exe`)
   - `syncnest-macos-latest-build` (Contains your `.dmg`)
5. Click them to download. Extract the ZIP files, and you have your fully packaged desktop installers ready to share!

**Moving Forward:** Every time you make updates to SyncNest and run `git push`, GitHub will automatically build fresh `.exe` and `.dmg` files for you in the background!
