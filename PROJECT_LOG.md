# My Todo — Project & Development Log

This document preserves architectural knowledge, feature history, release procedures, and directory submission tracking for the **My Todo** Obsidian plugin.

---

## 1. Project Metadata & Configuration

* **Plugin ID:** `my-todo`
* **Current Version:** `1.2.0`
* **Platforms Supported:** Desktop, Mobile (Android & iOS) (`"isDesktopOnly": false`)
* **Repository:** `https://github.com/amanxarora/my-todo`
* **Local Data Path:** `.obsidian/plugins/my-todo/data.json`
* **Archived Tasks Note:** `My Todo Notes/Archive.md`
* **Auto-generated Tags Note:** `My Todo Notes/_tags.md`

---

## 2. Core Architecture & Design Decisions

### Data Model & Category ID Migration
* Tasks are stored inside `cat.tasks[]` with fields: `id`, `text`, `estimatedHours`, `dueDate`, `category`, `categoryId`, `inWeekly`, `inDaily`, `completed`, `completedDate`, `createdDate`.
* **Collision Safety:** All lookups, badge generation, and category highlighting use `task.categoryId` rather than string matching `task.category` to prevent name collisions.
* Backward compatibility is preserved via an automated startup migration in `onload()`.

### Zero-Memory Completed Task Archiving
* When `archiveEnabled` is toggled on, day rollover (`runDayRollover()`) does not inflate `data.json`.
* Instead, it formats completed tasks as markdown check items and appends them to `My Todo Notes/Archive.md`.

### View Rendering & Scroll Preservation
* The view rebuilds via `TodoView.render()`.
* Viewport jumping is prevented by capturing `container.scrollTop` before `container.empty()` and synchronously restoring it after DOM construction.

### Auto-Saving Settings
* Settings tab changes (including "End of day time" inputs) trigger `saveDataQueued()` on input `change` or `blur`, with a 1000ms debounce.
* `onunload()` flushes any pending saves to prevent data loss upon app exit.

---

## 3. UI & Mobile Optimizations

1. **Responsive Viewport (<550px):**
   * Categories collapse from 2-column grid to 1-column.
   * Root padding decreases to `16px 12px` to maximize usable screen real estate.
   * Checkbox touch target size increases to `18px` for reliable finger tapping.
2. **Category Board Navigation:**
   * **Desktop:** Double-clicking anywhere on a task row in Weekly/Daily views scrolls down and flashes the parent category.
   * **Mobile & Desktop:** Single-clicking the category badge tag (`.task-cat-tag`) triggers the exact same scroll-to-view action.
3. **Date Quick Buttons:**
   * "Today" and "Tomorrow" buttons in the add-task form allow 1-tap due-date assignment.
4. **Floating Back-to-Top:**
   * Scroll listener on container dynamically shows `button.todo-back-to-top` when scrolled past `150px`, smoothly scrolling back to top on tap.

---

## 4. Release & Publishing Pipeline

### Build Command
```powershell
npm run build
```
Compiles TypeScript using esbuild, outputs `main.js`, and syncs `main.js`, `manifest.json`, and `styles.css` directly to the active test vault.

### Publishing a New Version
1. Bump version numbers identically across:
   * `manifest.json`
   * `package.json`
   * `versions.json`
2. Run `npm run build`.
3. Commit and tag:
   ```powershell
   git add manifest.json package.json versions.json src/main.ts main.js styles.css
   git commit -m "Release X.Y.Z: ..."
   git tag -a X.Y.Z -m "Version X.Y.Z"
   git push origin master --tags
   ```
4. Create/Update GitHub Release with compilation assets:
   ```powershell
   gh release create X.Y.Z main.js manifest.json styles.css --title "Version X.Y.Z" --notes "Release notes..."
   ```

---

## 5. Community Directory Submission Status

To appear in the official in-app Obsidian Community Plugins browser:
* **Target Repo:** `obsidianmd/obsidian-releases`
* **Fork & Branch:** `amanxarora/obsidian-releases` (`add-my-todo` branch)
* **Entry in `community-plugins.json`:**
  ```json
  {
    "id": "my-todo",
    "name": "My Todo",
    "author": "Aman Arora",
    "description": "Sorting based personal todo system with categories, weekly and daily planning",
    "repo": "amanxarora/my-todo"
  }
  ```
* **Direct PR Submission Link:**
  [https://github.com/obsidianmd/obsidian-releases/compare/master...amanxarora:obsidian-releases:add-my-todo?expand=1](https://github.com/obsidianmd/obsidian-releases/compare/master...amanxarora:obsidian-releases:add-my-todo?expand=1)

---

## 6. Mobile Cloud Sync Guidelines

* Obsidian stores plugin state in `.obsidian/plugins/my-todo/data.json`.
* When using cloud storage like Google Drive on Android, third-party sync apps (such as DriveSync or FolderSync) must have **"Sync hidden files/folders"** enabled so `.obsidian` is not skipped during synchronization.
