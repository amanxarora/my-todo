var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MyTodoPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_DATA = {
  categories: [
    { id: "cat-1", name: "Freelance Project 1", tasks: [] },
    { id: "cat-2", name: "Freelance Project 2", tasks: [] },
    { id: "cat-3", name: "College Subject 1", tasks: [] },
    { id: "cat-4", name: "College Subject 2", tasks: [] }
  ],
  scores: [],
  lastRolloverDate: ""
};
var DEFAULT_SETTINGS = {
  rolloverHour: 0,
  rolloverMinute: 0,
  archiveEnabled: false,
  themeColor: "#8a5cf5",
  sortOrder: "manual"
};
var CATEGORY_COLORS = [
  { label: "Default", value: "" },
  { label: "Purple", value: "#8a5cf5" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Orange", value: "#f97316" },
  { label: "Pink", value: "#ec4899" },
  { label: "Teal", value: "#14b8a6" }
];
var VIEW_TYPE = "my-todo-view";
var NOTES_FOLDER = "My Todo Notes";
var TAGS_NOTE = "My Todo Notes/_tags.md";
function toDisplayDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}
function todayIso() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function catTag(name, customTag) {
  if (customTag) return customTag.startsWith("#") ? customTag : "#" + customTag;
  return "#" + name.replace(/\s+/g, "-").toLowerCase();
}
function getLogicalDay(rolloverHour, rolloverMinute) {
  const now = /* @__PURE__ */ new Date();
  const rolloverMs = (rolloverHour * 60 + rolloverMinute) * 60 * 1e3;
  const nowMs = (now.getHours() * 60 + now.getMinutes()) * 60 * 1e3;
  if (nowMs < rolloverMs) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return prev.toISOString().split("T")[0];
  }
  return todayIso();
}
var TodoSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "My Todo Settings" });
    containerEl.createEl("p", { text: "Set the time when your day resets. Values are auto-clamped to valid range.", attr: { style: "color:var(--text-muted);font-size:13px;margin-bottom:16px;" } });
    let hourInput;
    let minuteInput;
    new import_obsidian.Setting(containerEl).setName("End of day time").setDesc("Hour (0-23) and minute (0-59).").addText((text) => {
      hourInput = text.inputEl;
      text.inputEl.type = "number";
      text.inputEl.min = "0";
      text.inputEl.max = "23";
      text.inputEl.style.width = "60px";
      text.inputEl.style.marginRight = "8px";
      text.inputEl.placeholder = "hr";
      text.setValue(String(this.plugin.settings.rolloverHour));
    }).addText((text) => {
      minuteInput = text.inputEl;
      text.inputEl.type = "number";
      text.inputEl.min = "0";
      text.inputEl.max = "59";
      text.inputEl.style.width = "60px";
      text.inputEl.style.marginRight = "8px";
      text.inputEl.placeholder = "min";
      text.setValue(String(this.plugin.settings.rolloverMinute));
    }).addButton((btn) => {
      btn.setButtonText("Save").setCta();
      btn.onClick(async () => {
        let h = parseInt(hourInput.value);
        let m = parseInt(minuteInput.value);
        if (isNaN(h)) h = 0;
        if (isNaN(m)) m = 0;
        h = Math.min(23, Math.max(0, h));
        m = Math.min(59, Math.max(0, m));
        hourInput.value = String(h);
        minuteInput.value = String(m);
        this.plugin.settings.rolloverHour = h;
        this.plugin.settings.rolloverMinute = m;
        await this.plugin.saveSettings();
        this.updatePreview(containerEl);
        new import_obsidian.Notice(`\u2713 Day reset time saved: ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      });
    });
    this.updatePreview(containerEl);
    new import_obsidian.Setting(containerEl).setName("Show archive section").setDesc("Display completed task archive inside the plugin. Off by default.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.archiveEnabled).onChange(async (val) => {
        this.plugin.settings.archiveEnabled = val;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Category Sort Order").setDesc("How should your categories be ordered? You can also pin up to 2 categories to the top.").addDropdown(
      (drop) => drop.addOption("manual", "Manual (Drag and Drop)").addOption("alpha-asc", "Alphabetical (A-Z)").addOption("alpha-desc", "Alphabetical (Z-A)").addOption("date-asc", "Date Created (Oldest First)").addOption("date-desc", "Date Created (Newest First)").setValue(this.plugin.settings.sortOrder).onChange(async (val) => {
        this.plugin.settings.sortOrder = val;
        await this.plugin.saveSettings();
        this.plugin.app.workspace.getLeavesOfType("my-todo-view").forEach((v) => {
          const view = v.view;
          if (view?.render) view.render();
        });
      })
    );
    containerEl.createEl("h3", { text: "Theme Color", attr: { style: 'margin-top:24px;margin-bottom:8px;font-family:"Century Gothic","AppleGothic","Trebuchet MS",sans-serif;' } });
    containerEl.createEl("p", { text: "Choose the accent color used throughout the plugin.", attr: { style: "color:var(--text-muted);font-size:13px;margin-bottom:12px;" } });
    const THEME_COLORS = [
      { label: "Purple", value: "#8a5cf5" },
      { label: "Blue", value: "#3b82f6" },
      { label: "Green", value: "#22c55e" },
      { label: "Teal", value: "#14b8a6" },
      { label: "Pink", value: "#ec4899" },
      { label: "Red", value: "#ef4444" },
      { label: "Orange", value: "#f97316" }
    ];
    const swatchWrap = containerEl.createDiv();
    swatchWrap.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;align-items:center;";
    THEME_COLORS.forEach((tc) => {
      const swatch = swatchWrap.createDiv();
      swatch.style.cssText = `width:28px;height:28px;border-radius:50%;background:${tc.value};cursor:pointer;border:3px solid ${this.plugin.settings.themeColor === tc.value ? "white" : "transparent"};transition:border-color 0.15s,transform 0.15s;box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
      swatch.title = tc.label;
      swatch.onclick = async () => {
        this.plugin.settings.themeColor = tc.value;
        await this.plugin.saveSettings();
        swatchWrap.querySelectorAll("div").forEach((s, i) => {
          s.s.style.borderColor = THEME_COLORS[i].value === tc.value ? "white" : "transparent";
        });
        this.plugin.app.workspace.getLeavesOfType("my-todo-view").forEach((v) => {
          const view = v.view;
          if (view?.render) {
            view.data = this.plugin.data;
            view.render();
          }
        });
        new import_obsidian.Notice(`Theme color set to ${tc.label}`);
      };
      swatchWrap.appendChild(swatch);
    });
  }
  updatePreview(containerEl) {
    const existing = containerEl.querySelector(".rollover-preview");
    if (existing) existing.remove();
    const h = String(this.plugin.settings.rolloverHour).padStart(2, "0");
    const m = String(this.plugin.settings.rolloverMinute).padStart(2, "0");
    containerEl.createEl("p", { text: `\u2713 Day resets at ${h}:${m}`, attr: { class: "rollover-preview", style: "color:#8a5cf5;font-size:13px;margin-top:8px;margin-bottom:16px;" } });
  }
};
var TodoView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.activeMenu = null;
    this.plugin = plugin;
    this.data = plugin.data;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "My Todo";
  }
  getIcon() {
    return "check-square";
  }
  async onOpen() {
    this.data = this.plugin.data;
    this.runDayRollover();
    this.render();
  }
  save() {
    this.plugin.data = this.data;
    this.updateScore();
    this.plugin.saveDataQueued(this.data);
  }
  // ─── Rollover ─────────────────────────────────────────────────────────────
  runDayRollover() {
    const { rolloverHour, rolloverMinute } = this.plugin.settings;
    const logicalDay = getLogicalDay(rolloverHour, rolloverMinute);
    if (this.data.lastRolloverDate === logicalDay) return;
    const prevDay = this.data.lastRolloverDate;
    if (prevDay) {
      const allTasks = this.data.categories.flatMap((c) => c.tasks);
      const dailyTasks = allTasks.filter((t) => t.inDaily);
      const planned = dailyTasks.reduce((s, t) => s + t.estimatedHours, 0);
      const completed = dailyTasks.filter((t) => t.completed).reduce((s, t) => s + t.estimatedHours, 0);
      const score = planned === 0 ? 0 : Math.round(completed / planned * 100);
      const existing = this.data.scores.find((s) => s.date === prevDay);
      if (existing) {
        existing.plannedHours = planned;
        existing.completedHours = completed;
        existing.score = score;
      } else this.data.scores.push({ date: prevDay, plannedHours: planned, completedHours: completed, score });
    }
    const currentMonth = logicalDay.slice(0, 7);
    this.data.scores = this.data.scores.filter((s) => s.date.startsWith(currentMonth));
    for (const cat of this.data.categories) cat.tasks = cat.tasks.filter((t) => !(t.inDaily && t.completed));
    for (const cat of this.data.categories) for (const task of cat.tasks) if (task.inDaily && !task.completed) task.inDaily = false;
    this.data.lastRolloverDate = logicalDay;
    this.save();
    new import_obsidian.Notice("\u{1F305} Day rolled over.");
  }
  updateScore() {
    const today = todayIso();
    const dailyTasks = this.getDailyTasks();
    const planned = dailyTasks.reduce((s, t) => s + t.estimatedHours, 0);
    const completed = dailyTasks.filter((t) => t.completed).reduce((s, t) => s + t.estimatedHours, 0);
    const score = planned === 0 ? 0 : Math.round(completed / planned * 100);
    const existing = this.data.scores.find((s) => s.date === today);
    if (existing) {
      existing.plannedHours = planned;
      existing.completedHours = completed;
      existing.score = score;
    } else this.data.scores.push({ date: today, plannedHours: planned, completedHours: completed, score });
  }
  getAllTasks() {
    return this.data.categories.flatMap((c) => c.tasks);
  }
  getWeeklyTasks() {
    return this.getAllTasks().filter((t) => t.inWeekly);
  }
  getDailyTasks() {
    return this.getAllTasks().filter((t) => t.inDaily);
  }
  getTaskById(id) {
    return this.getAllTasks().find((t) => t.id === id);
  }
  generateId() {
    return "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  }
  getOverdueStatus(task) {
    if (task.completed || !task.dueDate) return "none";
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - due.getTime()) / 864e5);
    if (diff >= 3) return "red";
    if (diff >= 1) return "orange";
    return "none";
  }
  // ─── Actions ──────────────────────────────────────────────────────────────
  toggleComplete(taskId) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    task.completed = !task.completed;
    task.completedDate = task.completed ? todayIso() : void 0;
    this.save();
    this.render();
  }
  toggleWeekly(taskId) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    task.inWeekly = !task.inWeekly;
    if (!task.inWeekly) task.inDaily = false;
    this.save();
    this.render();
  }
  toggleDaily(taskId) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    if (!task.inWeekly) {
      new import_obsidian.Notice("Add to Weekly first.");
      return;
    }
    task.inDaily = !task.inDaily;
    this.save();
    this.render();
  }
  addTask(categoryId, text, hours, dueDate) {
    const cat = this.data.categories.find((c) => c.id === categoryId);
    if (!cat) return;
    cat.tasks.push({ id: this.generateId(), text, estimatedHours: hours, dueDate, category: cat.name, inWeekly: false, inDaily: false, completed: false, createdDate: todayIso() });
    this.save();
    this.render();
  }
  editTask(taskId, text, hours, dueDate) {
    const task = this.getTaskById(taskId);
    if (!task) return;
    task.text = text;
    task.estimatedHours = hours;
    task.dueDate = dueDate;
    this.save();
    this.render();
  }
  deleteTask(taskId) {
    for (const cat of this.data.categories) cat.tasks = cat.tasks.filter((t) => t.id !== taskId);
    this.save();
    this.render();
  }
  addCategory(name) {
    this.data.categories.push({ id: "cat-" + Date.now(), name, tasks: [], createdDate: todayIso() });
    this.updateTagsNote();
    this.save();
    this.render();
  }
  deleteCategory(catId) {
    this.data.categories = this.data.categories.filter((c) => c.id !== catId);
    this.updateTagsNote();
    this.save();
    this.render();
  }
  renameTag(catId, newTag) {
    const cat = this.data.categories.find((c) => c.id === catId);
    if (!cat) return;
    const clean = newTag.trim().replace(/\s+/g, "-");
    cat.customTag = clean.startsWith("#") ? clean : "#" + clean;
    this.updateTagsNote();
    this.save();
    this.render();
  }
  renameCategory(catId, newName) {
    const cat = this.data.categories.find((c) => c.id === catId);
    if (!cat) return;
    cat.name = newName;
    cat.tasks.forEach((t) => t.category = newName);
    this.updateTagsNote();
    this.save();
    this.render();
  }
  setCategoryColor(catId, color) {
    const cat = this.data.categories.find((c) => c.id === catId);
    if (!cat) return;
    cat.color = color;
    this.save();
    this.render();
  }
  moveCategoryUp(catId) {
    const idx = this.data.categories.findIndex((c) => c.id === catId);
    if (idx <= 0) return;
    [this.data.categories[idx - 1], this.data.categories[idx]] = [this.data.categories[idx], this.data.categories[idx - 1]];
    this.save();
    this.render();
  }
  moveCategoryDown(catId) {
    const idx = this.data.categories.findIndex((c) => c.id === catId);
    if (idx >= this.data.categories.length - 1) return;
    [this.data.categories[idx + 1], this.data.categories[idx]] = [this.data.categories[idx], this.data.categories[idx + 1]];
    this.save();
    this.render();
  }
  // ─── Note creation ────────────────────────────────────────────────────────
  async updateTagsNote() {
    const { vault } = this.plugin.app;
    const tags = this.data.categories.map((c) => catTag(c.name, c.customTag)).join("\n");
    const content = `---
tags: [my-todo]
---

<!-- Auto-generated by My Todo plugin. Do not edit. -->

${tags}
`;
    try {
      await vault.createFolder(NOTES_FOLDER);
    } catch {
    }
    const existing = vault.getAbstractFileByPath(TAGS_NOTE);
    if (existing instanceof import_obsidian.TFile) await vault.modify(existing, content);
    else await vault.create(TAGS_NOTE, content);
  }
  async createCategoryNote(cat) {
    const { vault, workspace } = this.plugin.app;
    const tag = catTag(cat.name, cat.customTag);
    const taskList = cat.tasks.length > 0 ? cat.tasks.map((t) => `- [ ] ${t.text} (${t.estimatedHours}h)`).join("\n") : "_No tasks yet._";
    const content = `---
tags: [${tag.slice(1)}]
---

# ${cat.name}

${tag}

## Tasks

${taskList}
`;
    const safeName = cat.name.replace(/[\\/:*?"<>|.]/g, "-");
    const path = `${NOTES_FOLDER}/${safeName}.md`;
    try {
      await vault.createFolder(NOTES_FOLDER);
    } catch {
    }
    try {
      const existing = vault.getAbstractFileByPath(path);
      if (existing instanceof import_obsidian.TFile) {
        await vault.modify(existing, content);
        new import_obsidian.Notice(`Updated note: ${cat.name}`);
      } else {
        const file2 = await vault.create(path, content);
        new import_obsidian.Notice(`Created note: ${cat.name}`);
      }
      const leaf = workspace.getLeaf(true);
      const file = vault.getAbstractFileByPath(path);
      if (file instanceof import_obsidian.TFile) await leaf.openFile(file);
    } catch (e) {
      new import_obsidian.Notice("Could not create note: " + e);
    }
  }
  getAllVaultNotes() {
    return this.plugin.app.vault.getMarkdownFiles().map((f) => f.basename).sort();
  }
  closeActiveMenu() {
    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
  }
  // ─── Render ───────────────────────────────────────────────────────────────
  render() {
    this.data = this.plugin.data;
    const container = this.containerEl.children[1];
    container.empty();
    const tc = this.plugin.settings.themeColor || "#8a5cf5";
    const tcLight = tc + "20";
    const tcMid = tc + "40";
    const tcFaint = tc + "18";
    const tcFaint15 = tc + "15";
    container.setAttribute("style", `pointer-events:all !important; user-select:text !important; overflow-y:auto; --todo-tc:${tc}; --todo-tc-light:${tcLight}; --todo-tc-mid:${tcMid}; --todo-tc-faint:${tcFaint}; --todo-tc-faint15:${tcFaint15};`);
    container.onclick = (e) => {
      if (this.activeMenu && !this.activeMenu.contains(e.target)) this.closeActiveMenu();
    };
    const root = container.createDiv("my-todo-root");
    this.renderHeader(root);
    this.renderDaily(root);
    this.renderWeekly(root);
    this.renderCategories(root);
    this.renderHeatmap(root);
  }
  renderHeader(root) {
    const today = todayIso();
    const s = this.data.scores.find((x) => x.date === today);
    const planned = s?.plannedHours ?? 0;
    const completed = s?.completedHours ?? 0;
    const score = s?.score ?? 0;
    const { rolloverHour, rolloverMinute } = this.plugin.settings;
    const header = root.createDiv("todo-header");
    header.createEl("h1", { text: "My Todo" });
    header.createEl("span", { cls: "todo-score-badge", text: planned === 0 ? "No tasks today" : `${completed}h / ${planned}h \xB7 ${score}%` });
    header.createEl("span", { cls: "todo-rollover-info", text: `Resets ${String(rolloverHour).padStart(2, "0")}:${String(rolloverMinute).padStart(2, "0")}` });
  }
  renderDaily(root) {
    const card = root.createDiv("kanban-card");
    card.createEl("h1", { cls: "kanban-card-title", text: "Daily Todo" });
    const tasks = this.getDailyTasks();
    if (tasks.length === 0) card.createEl("p", { cls: "mytodo-empty", text: "No tasks for today. Add from Weekly." });
    else tasks.forEach((t) => this.renderTaskRow(card, t, "daily"));
  }
  renderWeekly(root) {
    const card = root.createDiv("kanban-card");
    card.createEl("h1", { cls: "kanban-card-title", text: "Weekly Todo" });
    const tasks = this.getWeeklyTasks();
    if (tasks.length === 0) card.createEl("p", { cls: "mytodo-empty", text: "No tasks this week. Add from Categories below." });
    else tasks.forEach((t) => this.renderTaskRow(card, t, "weekly"));
  }
  renderCategories(root) {
    const section = root.createDiv("todo-section");
    section.createEl("h1", { cls: "todo-section-title", text: "Categories" });
    const grid = section.createDiv("categories-kanban");
    let catsToRender = [...this.data.categories];
    if (this.plugin.settings.sortOrder === "alpha-asc") catsToRender.sort((a, b) => a.name.localeCompare(b.name));
    else if (this.plugin.settings.sortOrder === "alpha-desc") catsToRender.sort((a, b) => b.name.localeCompare(a.name));
    else if (this.plugin.settings.sortOrder === "date-asc") catsToRender.sort((a, b) => (a.createdDate || "").localeCompare(b.createdDate || ""));
    else if (this.plugin.settings.sortOrder === "date-desc") catsToRender.sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
    catsToRender.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    catsToRender.forEach((cat) => this.renderCategoryBlock(grid, cat));
    const addArea = section.createDiv("add-category-area");
    const addRow = addArea.createDiv("add-category-row");
    const inputWrap = addRow.createDiv("add-category-input-wrap");
    const nameInput = inputWrap.createEl("input", { type: "text", placeholder: "New category name or pick a note..." });
    const addBtn = addRow.createEl("button", { text: "+ Category", cls: "add-task-btn" });
    const dropdown = inputWrap.createDiv("notes-dropdown");
    dropdown.style.display = "none";
    const showDropdown = (filter) => {
      const notes = this.getAllVaultNotes().filter((n) => n.toLowerCase().includes(filter.toLowerCase()));
      dropdown.empty();
      if (notes.length === 0) {
        dropdown.style.display = "none";
        return;
      }
      notes.slice(0, 20).forEach((note) => {
        const item = dropdown.createDiv("notes-dropdown-item");
        item.setText(note);
        item.onclick = () => {
          nameInput.value = note;
          dropdown.style.display = "none";
        };
      });
      dropdown.style.display = "block";
    };
    nameInput.addEventListener("input", () => {
      if (nameInput.value.length > 0) showDropdown(nameInput.value);
      else dropdown.style.display = "none";
    });
    nameInput.addEventListener("blur", () => setTimeout(() => {
      dropdown.style.display = "none";
    }, 150));
    nameInput.addEventListener("focus", () => {
      if (nameInput.value.length > 0) showDropdown(nameInput.value);
    });
    addBtn.onclick = () => {
      const n = nameInput.value.trim();
      if (!n) return;
      this.addCategory(n);
      nameInput.value = "";
      dropdown.style.display = "none";
    };
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addBtn.click();
      if (e.key === "Escape") dropdown.style.display = "none";
    });
  }
  renderCategoryBlock(container, cat) {
    const block = container.createDiv("category-block");
    const catHdr = block.createDiv("category-header");
    if (cat.color) catHdr.style.borderBottomColor = (cat.color || (this.plugin.settings.themeColor || "#8a5cf5")) + "60";
    catHdr.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeActiveMenu();
      this.showCategoryMenu(block, cat, e);
    };
    const nameEl = catHdr.createEl("span", { cls: "category-name", text: (cat.pinned ? "\u2B50 " : "") + cat.name });
    if (cat.color) nameEl.style.color = cat.color;
    const tagEl = catHdr.createEl("span", { cls: "category-tag", text: catTag(cat.name, cat.customTag) });
    if (cat.color) {
      tagEl.style.color = cat.color;
      tagEl.style.background = cat.color + "18";
    }
    const menuBtn = catHdr.createEl("button", { cls: "cat-menu-btn", text: "\u22EF" });
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      this.closeActiveMenu();
      this.showCategoryMenu(block, cat);
    };
    const active = cat.tasks.filter((t) => !t.completed);
    const done = cat.tasks.filter((t) => t.completed);
    if (active.length === 0 && done.length === 0) block.createEl("p", { cls: "mytodo-empty", text: "No tasks yet." });
    active.forEach((t) => this.renderTaskRow(block, t, "category"));
    done.forEach((t) => this.renderTaskRow(block, t, "category"));
    const trigger = block.createDiv("add-task-trigger");
    trigger.setText("\uFF0B Add task");
    const form = block.createDiv("add-task-form");
    const row1 = form.createDiv("add-task-form-row");
    const textInput = row1.createEl("input", { type: "text", placeholder: "Task name...", cls: "task-input" });
    const row2 = form.createDiv("add-task-form-row");
    const hoursInput = row2.createEl("input", { type: "number", placeholder: "Hours", cls: "hours-input" });
    hoursInput.min = "0.25";
    hoursInput.step = "0.25";
    const dateInput = row2.createEl("input", { type: "date", cls: "date-input" });
    const actions = form.createDiv("add-task-form-actions");
    const cancelBtn = actions.createEl("button", { text: "Cancel", cls: "cancel-task-btn" });
    const addBtn = actions.createEl("button", { text: "Add", cls: "add-task-btn" });
    trigger.onclick = () => {
      trigger.style.display = "none";
      form.addClass("visible");
      textInput.focus();
    };
    cancelBtn.onclick = () => {
      form.removeClass("visible");
      trigger.style.display = "";
      textInput.value = "";
      hoursInput.value = "";
      dateInput.value = "";
    };
    const submit = () => {
      const text = textInput.value.trim();
      if (!text) return;
      this.addTask(cat.id, text, parseFloat(hoursInput.value) || 0.5, dateInput.value || void 0);
    };
    addBtn.onclick = submit;
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  }
  showCategoryMenu(block, cat, e) {
    const menu = block.createDiv("cat-dropdown");
    if (e) {
      const rect = block.getBoundingClientRect();
      menu.style.top = e.clientY - rect.top + "px";
      menu.style.left = e.clientX - rect.left + "px";
      menu.style.right = "auto";
    }
    this.activeMenu = menu;
    if (this.plugin.settings.sortOrder === "manual") {
      const up = menu.createDiv("cat-dropdown-item");
      up.setText("\u2191 Move up");
      up.onclick = () => {
        this.closeActiveMenu();
        this.moveCategoryUp(cat.id);
      };
      const down = menu.createDiv("cat-dropdown-item");
      down.setText("\u2193 Move down");
      down.onclick = () => {
        this.closeActiveMenu();
        this.moveCategoryDown(cat.id);
      };
      menu.createDiv("cat-dropdown-divider");
    }
    const pin = menu.createDiv("cat-dropdown-item");
    pin.setText(cat.pinned ? "Unpin category" : "\u2B50 Pin to top");
    pin.onclick = () => {
      this.closeActiveMenu();
      if (!cat.pinned && this.data.categories.filter((c) => c.pinned).length >= 2) {
        new import_obsidian.Notice("You can only pin up to 2 categories!");
        return;
      }
      cat.pinned = !cat.pinned;
      this.save();
      this.render();
    };
    menu.createDiv("cat-dropdown-divider");
    const rename = menu.createDiv("cat-dropdown-item");
    rename.setText("\u270E Rename");
    rename.onclick = () => {
      this.closeActiveMenu();
      const nameEl = block.querySelector(".category-name");
      if (!nameEl) return;
      const input = document.createElement("input");
      input.className = "cat-rename-input";
      input.value = cat.name;
      nameEl.replaceWith(input);
      input.focus();
      input.select();
      const confirm2 = () => {
        const n = input.value.trim();
        if (n && n !== cat.name) this.renameCategory(cat.id, n);
        else this.render();
      };
      input.addEventListener("blur", confirm2);
      input.addEventListener("keydown", (e2) => {
        if (e2.key === "Enter") confirm2();
        if (e2.key === "Escape") this.render();
      });
    };
    const createNote = menu.createDiv("cat-dropdown-item");
    createNote.setText("\u{1F4DD} Create note");
    createNote.onclick = () => {
      this.closeActiveMenu();
      this.createCategoryNote(cat);
    };
    const renameTag = menu.createDiv("cat-dropdown-item");
    renameTag.setText("\u{1F3F7} Rename tag");
    renameTag.onclick = () => {
      this.closeActiveMenu();
      const tagEl = block.querySelector(".category-tag");
      if (!tagEl) return;
      const input = document.createElement("input");
      input.className = "cat-rename-input";
      input.style.cssText = "font-size:11px;width:100%;";
      input.value = catTag(cat.name, cat.customTag);
      tagEl.replaceWith(input);
      input.focus();
      input.select();
      const confirmTag = () => {
        const n = input.value.trim();
        if (n) this.renameTag(cat.id, n);
        else this.render();
      };
      input.addEventListener("blur", confirmTag);
      input.addEventListener("keydown", (e2) => {
        if (e2.key === "Enter") confirmTag();
        if (e2.key === "Escape") this.render();
      });
    };
    menu.createDiv("cat-dropdown-divider");
    const colorLabel = menu.createDiv("cat-dropdown-item no-hover");
    colorLabel.setText("\u25CF Color");
    const swatches = menu.createDiv("color-swatches");
    CATEGORY_COLORS.forEach((c) => {
      const sw = swatches.createDiv("color-swatch");
      sw.style.background = c.value || "#555555";
      if (cat.color === c.value) sw.addClass("active");
      sw.title = c.label;
      sw.onclick = () => {
        this.closeActiveMenu();
        this.setCategoryColor(cat.id, c.value);
      };
    });
    menu.createDiv("cat-dropdown-divider");
    const del = menu.createDiv("cat-dropdown-item danger");
    del.setText("\u2715 Delete");
    del.onclick = () => {
      this.closeActiveMenu();
      if (confirm(`Delete "${cat.name}" and all its tasks?`)) this.deleteCategory(cat.id);
    };
  }
  renderTaskRow(container, task, context) {
    const overdue = this.getOverdueStatus(task);
    const row = container.createDiv(`todo-task${task.completed ? " completed" : ""}`);
    row.style.position = "relative";
    row.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeActiveMenu();
      this.showTaskMenu(row, task, context, e);
    };
    const left = row.createDiv("task-left");
    const checkbox = left.createDiv(`task-checkbox${task.completed ? " checked" : ""}`);
    checkbox.onclick = () => this.toggleComplete(task.id);
    const body = left.createDiv("task-body");
    const textEl = body.createEl("span", { cls: "task-text", text: task.text });
    if (!task.completed) {
      if (overdue === "orange") textEl.addClass("overdue-orange");
      if (overdue === "red") textEl.addClass("overdue-red");
    }
    const badges = body.createDiv("task-badges");
    badges.createEl("span", { cls: "task-hours", text: `${task.estimatedHours}h` });
    if (task.dueDate) {
      const dueEl = badges.createEl("span", { cls: "task-due", text: toDisplayDate(task.dueDate) });
      if (!task.completed) {
        if (overdue === "orange") dueEl.addClass("overdue-orange");
        if (overdue === "red") dueEl.addClass("overdue-red");
      }
    }
    if (context === "weekly" || context === "daily") {
      const taskCat = this.data.categories.find((c) => c.name === task.category);
      badges.createEl("span", { cls: "task-cat-tag", text: catTag(task.category, taskCat?.customTag) });
    }
    const actionsEl = row.createDiv("task-actions");
    if (context === "category") {
      const wb = actionsEl.createEl("button", { cls: `task-action-btn${task.inWeekly ? " active" : ""}`, text: task.inWeekly ? "\u2212W" : "+W" });
      wb.title = task.inWeekly ? "Remove from Weekly" : "Add to Weekly";
      wb.onclick = () => this.toggleWeekly(task.id);
      if (task.inWeekly) {
        const db = actionsEl.createEl("button", { cls: `task-action-btn${task.inDaily ? " active" : ""}`, text: task.inDaily ? "\u2212D" : "+D" });
        db.title = task.inDaily ? "Remove from Daily" : "Add to Daily";
        db.onclick = () => this.toggleDaily(task.id);
      }
    }
    if (context === "weekly") {
      const db = actionsEl.createEl("button", { cls: `task-action-btn${task.inDaily ? " active" : ""}`, text: task.inDaily ? "\u2212D" : "+D" });
      db.title = task.inDaily ? "Remove from Daily" : "Add to Daily";
      db.onclick = () => this.toggleDaily(task.id);
    }
    const dotBtn = actionsEl.createEl("button", { cls: "task-3dot-btn", text: "\u22EF" });
    dotBtn.onclick = (e) => {
      e.stopPropagation();
      this.closeActiveMenu();
      this.showTaskMenu(row, task, context);
    };
  }
  showTaskMenu(row, task, context, e) {
    const menu = document.createElement("div");
    menu.className = "task-dropdown";
    if (e) {
      const rect = row.getBoundingClientRect();
      menu.style.top = e.clientY - rect.top + "px";
      menu.style.left = e.clientX - rect.left + "px";
      menu.style.right = "auto";
    } else {
      menu.style.top = "28px";
      menu.style.right = "0px";
    }
    row.appendChild(menu);
    this.activeMenu = menu;
    const editItem = menu.createDiv("task-dropdown-item");
    editItem.setText("\u270E Edit");
    editItem.onclick = () => {
      this.closeActiveMenu();
      this.showTaskEditForm(row, task);
    };
    const completeItem = menu.createDiv("task-dropdown-item");
    completeItem.setText(task.completed ? "\u21A9 Mark incomplete" : "\u2713 Mark complete");
    completeItem.onclick = () => {
      this.closeActiveMenu();
      this.toggleComplete(task.id);
    };
    menu.createDiv("cat-dropdown-divider");
    const delItem = menu.createDiv("task-dropdown-item danger");
    delItem.setText("\u2715 Delete");
    delItem.onclick = () => {
      this.closeActiveMenu();
      this.deleteTask(task.id);
    };
  }
  showTaskEditForm(row, task) {
    const form = document.createElement("div");
    form.className = "task-edit-form";
    const r1 = form.createDiv("task-edit-row");
    const textInput = r1.createEl("input", { type: "text", cls: "edit-text" });
    textInput.value = task.text;
    const r2 = form.createDiv("task-edit-row");
    const hoursInput = r2.createEl("input", { type: "number", cls: "edit-hours" });
    hoursInput.value = String(task.estimatedHours);
    hoursInput.min = "0.25";
    hoursInput.step = "0.25";
    hoursInput.placeholder = "Hours";
    const dateInput = r2.createEl("input", { type: "date", cls: "edit-date" });
    if (task.dueDate) dateInput.value = task.dueDate;
    const actionsDiv = form.createDiv("task-edit-actions");
    const cancelBtn = actionsDiv.createEl("button", { text: "Cancel", cls: "cancel-task-btn" });
    const saveBtn = actionsDiv.createEl("button", { text: "Save", cls: "add-task-btn" });
    cancelBtn.onclick = () => {
      form.remove();
    };
    saveBtn.onclick = () => {
      const newText = textInput.value.trim();
      if (!newText) return;
      this.editTask(task.id, newText, parseFloat(hoursInput.value) || task.estimatedHours, dateInput.value || void 0);
      form.remove();
    };
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveBtn.click();
      if (e.key === "Escape") cancelBtn.click();
    });
    row.insertAdjacentElement("afterend", form);
    textInput.focus();
    textInput.select();
  }
  renderHeatmap(root) {
    const section = root.createDiv("heatmap-section");
    section.createEl("h1", { cls: "heatmap-section-title", text: "Productivity Heatmap" });
    const today = /* @__PURE__ */ new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = today.toLocaleString("default", { month: "long" });
    const todayDay = today.getDate();
    const monthLabel = section.createEl("p");
    monthLabel.setText(`${monthName} ${year}`);
    monthLabel.style.cssText = "font-size:11px;color:var(--text-muted);margin:0 0 4px 0;";
    const grid = section.createDiv("heatmap-grid");
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().split("T")[0];
      const scoreEntry = this.data.scores.find((s) => s.date === dateStr);
      const score = scoreEntry?.score ?? 0;
      const isFuture = day > todayDay;
      const cell = grid.createDiv("heatmap-cell");
      cell.style.background = isFuture ? "var(--background-modifier-border)" : this.scoreToColor(score);
      if (isFuture) cell.style.opacity = "0.3";
      if (day === todayDay) cell.style.outline = `2px solid ${this.plugin.settings.themeColor || "#8a5cf5"}`;
      cell.createDiv("heatmap-tooltip").setText(scoreEntry ? `${toDisplayDate(dateStr)}: ${score}%` : `${toDisplayDate(dateStr)}: no tasks`);
    }
    const legend = section.createDiv("heatmap-legend");
    legend.createEl("span", { text: "Less" });
    [0, 25, 50, 75, 100].forEach((v) => {
      const lc = legend.createDiv("legend-cell");
      lc.style.background = this.scoreToColor(v);
    });
    legend.createEl("span", { text: "More" });
  }
  scoreToColor(score) {
    if (score === 0) return "var(--background-secondary)";
    const hex = this.plugin.settings.themeColor || "#8a5cf5";
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${(0.15 + score / 100 * 0.85).toFixed(2)})`;
  }
};
var MyTodoPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.data = DEFAULT_DATA;
    this.settings = DEFAULT_SETTINGS;
    this._savePromise = null;
    this.lastSavedDataString = "";
  }
  async onload() {
    const saved = await this.loadData();
    this.data = { ...DEFAULT_DATA, ...saved, categories: saved?.categories ?? DEFAULT_DATA.categories, scores: saved?.scores ?? [], lastRolloverDate: saved?.lastRolloverDate ?? "" };
    this.settings = { ...DEFAULT_SETTINGS, ...saved?.settings ?? {} };
    if (!this.settings.themeColor) this.settings.themeColor = "#8a5cf5";
    this.registerView(VIEW_TYPE, (leaf) => new TodoView(leaf, this));
    this.addRibbonIcon("check-square", "My Todo", () => this.activateView());
    this.addCommand({ id: "open-my-todo", name: "Open My Todo", callback: () => this.activateView() });
    this.addSettingTab(new TodoSettingTab(this.app, this));
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((v) => {
          const view = v.view;
          if (view?.render) {
            view.data = this.data;
            view.render();
          }
        });
      })
    );
  }
  saveDataQueued(data) {
    const saveCall = async () => {
      await this.saveData(data);
    };
    if (!this._savePromise) {
      this._savePromise = saveCall();
    } else {
      this._savePromise = this._savePromise.then(saveCall).catch(saveCall);
    }
    return this._savePromise;
  }
  async saveSettings() {
    await this.saveDataQueued({ ...this.data, settings: this.settings });
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
};
