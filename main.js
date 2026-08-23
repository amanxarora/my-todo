var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b ||= {})
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

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
  if (!isoDate)
    return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}
function localIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayIso() {
  return localIso(/* @__PURE__ */ new Date());
}
function catTag(name, customTag) {
  if (customTag)
    return customTag.startsWith("#") ? customTag : "#" + customTag;
  return "#" + name.replace(/\s+/g, "-").toLowerCase();
}
function getLogicalDay(rolloverHour, rolloverMinute) {
  const now = /* @__PURE__ */ new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  if (currentHour < rolloverHour || currentHour === rolloverHour && currentMinute < rolloverMinute) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return localIso(prev);
  }
  return todayIso();
}
var ConfirmModal = class extends import_obsidian.Modal {
  constructor(app, message, onConfirm) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("p", { text: this.message });
    const actions = contentEl.createDiv("modal-button-container");
    const cancelBtn = actions.createEl("button", { text: "Cancel" });
    cancelBtn.onclick = () => this.close();
    const confirmBtn = actions.createEl("button", { text: "Delete", cls: "mod-warning" });
    confirmBtn.onclick = () => {
      this.close();
      this.onConfirm();
    };
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
var TodoSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("My Todo Settings").setHeading();
    containerEl.createEl("p", { text: "Set the time when your day resets. Values are auto-clamped to valid range.", attr: { style: "color:var(--text-muted);font-size:13px;margin-bottom:16px;" } });
    let hourInput;
    let minuteInput;
    const saveTimeSettings = () => __async(this, null, function* () {
      let h = parseInt(hourInput.value);
      let m = parseInt(minuteInput.value);
      if (isNaN(h))
        h = 0;
      if (isNaN(m))
        m = 0;
      h = Math.min(23, Math.max(0, h));
      m = Math.min(59, Math.max(0, m));
      hourInput.value = String(h);
      minuteInput.value = String(m);
      if (this.plugin.settings.rolloverHour !== h || this.plugin.settings.rolloverMinute !== m) {
        this.plugin.settings.rolloverHour = h;
        this.plugin.settings.rolloverMinute = m;
        yield this.plugin.saveSettings();
        this.updatePreview(containerEl);
      }
    });
    new import_obsidian.Setting(containerEl).setName("End of day time").setDesc("Hour (0-23) and minute (0-59). Saves automatically on change or blur.").addText((text) => {
      hourInput = text.inputEl;
      text.inputEl.type = "number";
      text.inputEl.min = "0";
      text.inputEl.max = "23";
      text.inputEl.addClass("todo-time-input");
      text.inputEl.placeholder = "hr";
      text.setValue(String(this.plugin.settings.rolloverHour));
      text.onChange(() => saveTimeSettings());
      text.inputEl.addEventListener("blur", () => saveTimeSettings());
    }).addText((text) => {
      minuteInput = text.inputEl;
      text.inputEl.type = "number";
      text.inputEl.min = "0";
      text.inputEl.max = "59";
      text.inputEl.addClass("todo-time-input");
      text.inputEl.placeholder = "min";
      text.setValue(String(this.plugin.settings.rolloverMinute));
      text.onChange(() => saveTimeSettings());
      text.inputEl.addEventListener("blur", () => saveTimeSettings());
    });
    this.updatePreview(containerEl);
    new import_obsidian.Setting(containerEl).setName("Show archive section").setDesc("Display completed task archive inside the plugin. Off by default.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.archiveEnabled).onChange((val) => __async(this, null, function* () {
        this.plugin.settings.archiveEnabled = val;
        yield this.plugin.saveSettings();
      }))
    );
    new import_obsidian.Setting(containerEl).setName("Category Sort Order").setDesc("How should your categories be ordered? You can also pin up to 2 categories to the top.").addDropdown(
      (drop) => drop.addOption("manual", "Manual (Drag and Drop)").addOption("alpha-asc", "Alphabetical (A-Z)").addOption("alpha-desc", "Alphabetical (Z-A)").addOption("date-asc", "Date Created (Oldest First)").addOption("date-desc", "Date Created (Newest First)").setValue(this.plugin.settings.sortOrder).onChange((val) => __async(this, null, function* () {
        this.plugin.settings.sortOrder = val;
        yield this.plugin.saveSettings();
        this.plugin.app.workspace.getLeavesOfType("my-todo-view").forEach((v) => {
          const view = v.view;
          if (view == null ? void 0 : view.render)
            view.render();
        });
      }))
    );
    new import_obsidian.Setting(containerEl).setName("Theme Color").setDesc("Choose the accent color used throughout the plugin.").setHeading();
    const THEME_COLORS = [
      { label: "Purple", value: "#8a5cf5" },
      { label: "Blue", value: "#3b82f6" },
      { label: "Green", value: "#22c55e" },
      { label: "Teal", value: "#14b8a6" },
      { label: "Pink", value: "#ec4899" },
      { label: "Red", value: "#ef4444" },
      { label: "Orange", value: "#f97316" }
    ];
    const swatchWrap = containerEl.createDiv("todo-swatch-wrap");
    THEME_COLORS.forEach((tc) => {
      const swatch = swatchWrap.createDiv(`todo-swatch${this.plugin.settings.themeColor === tc.value ? " is-active" : ""}`);
      swatch.style.setProperty("--swatch-color", tc.value);
      swatch.title = tc.label;
      swatch.onclick = () => __async(this, null, function* () {
        this.plugin.settings.themeColor = tc.value;
        yield this.plugin.saveSettings();
        swatchWrap.querySelectorAll(".todo-swatch").forEach((s, i) => {
          s.classList.toggle("is-active", THEME_COLORS[i].value === tc.value);
        });
        this.plugin.app.workspace.getLeavesOfType("my-todo-view").forEach((v) => {
          const view = v.view;
          if (view == null ? void 0 : view.render) {
            view.data = this.plugin.data;
            view.render();
          }
        });
        new import_obsidian.Notice(`Theme color set to ${tc.label}`);
      });
      swatchWrap.appendChild(swatch);
    });
  }
  updatePreview(containerEl) {
    const existing = containerEl.querySelector(".rollover-preview");
    if (existing)
      existing.remove();
    const h = String(this.plugin.settings.rolloverHour).padStart(2, "0");
    const m = String(this.plugin.settings.rolloverMinute).padStart(2, "0");
    containerEl.createEl("p", { text: `\u2713 Day resets at ${h}:${m}`, cls: "rollover-preview" });
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
  onOpen() {
    return __async(this, null, function* () {
      this.data = this.plugin.data;
      yield this.runDayRollover();
      this.render();
      this.registerDomEvent(document, "click", (e) => {
        if (this.activeMenu && !this.activeMenu.contains(e.target)) {
          this.closeActiveMenu();
        }
      });
      const container = this.containerEl.children[1];
      this.registerDomEvent(container, "scroll", () => {
        const btn = container.querySelector(".todo-back-to-top");
        if (btn) {
          btn.classList.toggle("is-visible", container.scrollTop > 150);
          btn.classList.toggle("is-hidden", container.scrollTop <= 150);
        }
      });
    });
  }
  save(skipUpdateScore = false) {
    this.plugin.data = this.data;
    if (!skipUpdateScore)
      this.updateScore();
    this.plugin.saveDataQueued(__spreadProps(__spreadValues({}, this.data), { settings: this.plugin.settings }));
  }
  // ─── Rollover ─────────────────────────────────────────────────────────────
  archiveCompletedTasksToNote(tasks) {
    return __async(this, null, function* () {
      const { vault } = this.plugin.app;
      const dateStr = todayIso();
      const lines = tasks.map((t) => {
        const catObj = this.data.categories.find((c) => c.id === t.categoryId);
        const tagStr = catTag(t.category, catObj == null ? void 0 : catObj.customTag);
        return `- [x] ${t.text} (${t.estimatedHours}h) - ${tagStr} [completed: ${t.completedDate || dateStr}]`;
      }).join("\n");
      const archivePath = `${NOTES_FOLDER}/Archive.md`;
      const content = `
### Rollover ${toDisplayDate(dateStr)}
${lines}
`;
      try {
        yield vault.createFolder(NOTES_FOLDER);
      } catch (e) {
      }
      try {
        const existing = vault.getAbstractFileByPath(archivePath);
        if (existing instanceof import_obsidian.TFile) {
          const currentContent = yield vault.read(existing);
          yield vault.modify(existing, currentContent + content);
        } else {
          const header = `---
tags: [my-todo-archive]
---

# Completed Tasks Archive
`;
          yield vault.create(archivePath, header + content);
        }
      } catch (e) {
        new import_obsidian.Notice("Failed to archive tasks: " + e);
      }
    });
  }
  runDayRollover() {
    return __async(this, null, function* () {
      const { rolloverHour, rolloverMinute } = this.plugin.settings;
      const logicalDay = getLogicalDay(rolloverHour, rolloverMinute);
      if (this.data.lastRolloverDate === logicalDay)
        return;
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
        } else
          this.data.scores.push({ date: prevDay, plannedHours: planned, completedHours: completed, score });
      }
      if (this.plugin.settings.archiveEnabled) {
        const completedTasks = this.data.categories.flatMap((c) => c.tasks).filter((t) => t.completed);
        if (completedTasks.length > 0) {
          yield this.archiveCompletedTasksToNote(completedTasks);
        }
      }
      for (const cat of this.data.categories)
        cat.tasks = cat.tasks.filter((t) => !t.completed);
      for (const cat of this.data.categories)
        for (const task of cat.tasks)
          if (task.inDaily && !task.completed)
            task.inDaily = false;
      this.data.lastRolloverDate = logicalDay;
      this.save(true);
      new import_obsidian.Notice("\u{1F305} Day rolled over.");
    });
  }
  updateScore() {
    const { rolloverHour, rolloverMinute } = this.plugin.settings;
    const today = getLogicalDay(rolloverHour, rolloverMinute);
    const dailyTasks = this.getDailyTasks();
    const planned = dailyTasks.reduce((s, t) => s + t.estimatedHours, 0);
    const completed = dailyTasks.filter((t) => t.completed).reduce((s, t) => s + t.estimatedHours, 0);
    const score = planned === 0 ? 0 : Math.round(completed / planned * 100);
    const existing = this.data.scores.find((s) => s.date === today);
    if (existing) {
      existing.plannedHours = planned;
      existing.completedHours = completed;
      existing.score = score;
    } else
      this.data.scores.push({ date: today, plannedHours: planned, completedHours: completed, score });
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
    if (task.completed || !task.dueDate)
      return "none";
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = task.dueDate.split("-").map(Number);
    const due = new Date(y, m - 1, d, 0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - due.getTime()) / 864e5);
    if (diff >= 3)
      return "red";
    if (diff >= 1)
      return "orange";
    return "none";
  }
  // ─── Actions ──────────────────────────────────────────────────────────────
  toggleComplete(taskId) {
    const task = this.getTaskById(taskId);
    if (!task)
      return;
    task.completed = !task.completed;
    task.completedDate = task.completed ? todayIso() : void 0;
    this.save();
    this.render();
  }
  toggleWeekly(taskId) {
    const task = this.getTaskById(taskId);
    if (!task)
      return;
    task.inWeekly = !task.inWeekly;
    if (!task.inWeekly)
      task.inDaily = false;
    this.save();
    this.render();
  }
  toggleDaily(taskId) {
    const task = this.getTaskById(taskId);
    if (!task)
      return;
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
    if (!cat)
      return;
    cat.tasks.push({ id: this.generateId(), text, estimatedHours: hours, dueDate, category: cat.name, categoryId: cat.id, inWeekly: false, inDaily: false, completed: false, createdDate: todayIso() });
    this.save();
    this.render();
  }
  editTask(taskId, text, hours, dueDate) {
    const task = this.getTaskById(taskId);
    if (!task)
      return;
    task.text = text;
    task.estimatedHours = hours;
    task.dueDate = dueDate;
    this.save();
    this.render();
  }
  deleteTask(taskId) {
    for (const cat of this.data.categories)
      cat.tasks = cat.tasks.filter((t) => t.id !== taskId);
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
    if (!cat)
      return;
    const clean = newTag.trim().replace(/\s+/g, "-");
    cat.customTag = clean.startsWith("#") ? clean : "#" + clean;
    this.updateTagsNote();
    this.save();
    this.render();
  }
  renameCategory(catId, newName) {
    const cat = this.data.categories.find((c) => c.id === catId);
    if (!cat)
      return;
    cat.name = newName;
    cat.tasks.forEach((t) => t.category = newName);
    this.updateTagsNote();
    this.save();
    this.render();
  }
  setCategoryColor(catId, color) {
    const cat = this.data.categories.find((c) => c.id === catId);
    if (!cat)
      return;
    cat.color = color;
    this.save();
    this.render();
  }
  moveCategoryUp(catId) {
    const idx = this.data.categories.findIndex((c) => c.id === catId);
    if (idx <= 0)
      return;
    [this.data.categories[idx - 1], this.data.categories[idx]] = [this.data.categories[idx], this.data.categories[idx - 1]];
    this.save();
    this.render();
  }
  moveCategoryDown(catId) {
    const idx = this.data.categories.findIndex((c) => c.id === catId);
    if (idx >= this.data.categories.length - 1)
      return;
    [this.data.categories[idx + 1], this.data.categories[idx]] = [this.data.categories[idx], this.data.categories[idx + 1]];
    this.save();
    this.render();
  }
  // ─── Note creation ────────────────────────────────────────────────────────
  updateTagsNote() {
    return __async(this, null, function* () {
      const { vault } = this.plugin.app;
      const tags = this.data.categories.map((c) => catTag(c.name, c.customTag)).join("\n");
      const content = `---
tags: [my-todo]
---

<!-- Auto-generated by My Todo plugin. Do not edit. -->

${tags}
`;
      try {
        yield vault.createFolder(NOTES_FOLDER);
      } catch (e) {
      }
      const existing = vault.getAbstractFileByPath(TAGS_NOTE);
      if (existing instanceof import_obsidian.TFile)
        yield vault.modify(existing, content);
      else
        yield vault.create(TAGS_NOTE, content);
    });
  }
  createCategoryNote(cat) {
    return __async(this, null, function* () {
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
        yield vault.createFolder(NOTES_FOLDER);
      } catch (e) {
      }
      try {
        const existing = vault.getAbstractFileByPath(path);
        if (existing instanceof import_obsidian.TFile) {
          yield vault.modify(existing, content);
          new import_obsidian.Notice(`Updated note: ${cat.name}`);
        } else {
          const file2 = yield vault.create(path, content);
          new import_obsidian.Notice(`Created note: ${cat.name}`);
        }
        const leaf = workspace.getLeaf(true);
        const file = vault.getAbstractFileByPath(path);
        if (file instanceof import_obsidian.TFile)
          yield leaf.openFile(file);
      } catch (e) {
        new import_obsidian.Notice("Could not create note: " + e);
      }
    });
  }
  getAllVaultNotes() {
    return this.plugin.app.vault.getMarkdownFiles().map((f) => f.basename).sort();
  }
  closeActiveMenu() {
    if (this.activeMenu) {
      if (this.activeMenu.parentNode)
        this.activeMenu.parentNode.removeChild(this.activeMenu);
      this.activeMenu = null;
    }
  }
  // ─── Render ───────────────────────────────────────────────────────────────
  render() {
    this.data = this.plugin.data;
    const container = this.containerEl.children[1];
    if (container.querySelector("input:focus"))
      return;
    const scrollTop = container.scrollTop;
    container.empty();
    const tc = this.plugin.settings.themeColor || "#8a5cf5";
    const tcLight = tc + "20";
    const tcMid = tc + "40";
    const tcFaint = tc + "18";
    const tcFaint15 = tc + "15";
    container.addClass("my-todo-root-container");
    container.style.setProperty("--todo-tc", tc);
    container.style.setProperty("--todo-tc-light", tcLight);
    container.style.setProperty("--todo-tc-mid", tcMid);
    container.style.setProperty("--todo-tc-faint", tcFaint);
    container.style.setProperty("--todo-tc-faint15", tcFaint15);
    const root = container.createDiv("my-todo-root");
    this.renderHeader(root);
    this.renderDaily(root);
    this.renderWeekly(root);
    this.renderCategories(root);
    this.renderHeatmap(root);
    const backToTop = container.createEl("button", { cls: `todo-back-to-top ${scrollTop > 150 ? "is-visible" : "is-hidden"}`, text: "\u25B2" });
    backToTop.title = "Back to top";
    backToTop.onclick = () => {
      container.scrollTo({ top: 0, behavior: "smooth" });
    };
    container.scrollTop = scrollTop;
  }
  renderHeader(root) {
    var _a, _b, _c;
    const { rolloverHour, rolloverMinute } = this.plugin.settings;
    const today = getLogicalDay(rolloverHour, rolloverMinute);
    const s = this.data.scores.find((x) => x.date === today);
    const planned = (_a = s == null ? void 0 : s.plannedHours) != null ? _a : 0;
    const completed = (_b = s == null ? void 0 : s.completedHours) != null ? _b : 0;
    const score = (_c = s == null ? void 0 : s.score) != null ? _c : 0;
    const header = root.createDiv("todo-header");
    header.createEl("h1", { text: "My Todo" });
    header.createEl("span", { cls: "todo-score-badge", text: planned === 0 ? "No tasks today" : `${completed}h / ${planned}h \xB7 ${score}%` });
    header.createEl("span", { cls: "todo-rollover-info", text: `Resets ${String(rolloverHour).padStart(2, "0")}:${String(rolloverMinute).padStart(2, "0")}` });
  }
  renderDaily(root) {
    const card = root.createDiv("kanban-card");
    card.createEl("h1", { cls: "kanban-card-title", text: "Daily Todo" });
    const tasks = this.getDailyTasks();
    if (tasks.length === 0)
      card.createEl("p", { cls: "mytodo-empty", text: "No tasks for today. Add from Weekly." });
    else
      tasks.forEach((t) => this.renderTaskRow(card, t, "daily"));
  }
  renderWeekly(root) {
    const card = root.createDiv("kanban-card");
    card.createEl("h1", { cls: "kanban-card-title", text: "Weekly Todo" });
    const tasks = this.getWeeklyTasks();
    if (tasks.length === 0)
      card.createEl("p", { cls: "mytodo-empty", text: "No tasks this week. Add from Categories below." });
    else
      tasks.forEach((t) => this.renderTaskRow(card, t, "weekly"));
  }
  renderCategories(root) {
    const section = root.createDiv("todo-section");
    section.createEl("h1", { cls: "todo-section-title", text: "Categories" });
    const grid = section.createDiv("categories-kanban");
    let catsToRender = [...this.data.categories];
    if (this.plugin.settings.sortOrder === "alpha-asc")
      catsToRender.sort((a, b) => a.name.localeCompare(b.name));
    else if (this.plugin.settings.sortOrder === "alpha-desc")
      catsToRender.sort((a, b) => b.name.localeCompare(a.name));
    else if (this.plugin.settings.sortOrder === "date-asc")
      catsToRender.sort((a, b) => (a.createdDate || "").localeCompare(b.createdDate || ""));
    else if (this.plugin.settings.sortOrder === "date-desc")
      catsToRender.sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
    catsToRender.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    catsToRender.forEach((cat) => this.renderCategoryBlock(grid, cat));
    const addArea = section.createDiv("add-category-area");
    const addRow = addArea.createDiv("add-category-row");
    const inputWrap = addRow.createDiv("add-category-input-wrap");
    const nameInput = inputWrap.createEl("input", { type: "text", placeholder: "New category name or pick a note..." });
    const addBtn = addRow.createEl("button", { text: "+ Category", cls: "add-task-btn" });
    const dropdown = inputWrap.createDiv("notes-dropdown is-hidden");
    const showDropdown = (filter) => {
      const notes = this.getAllVaultNotes().filter((n) => n.toLowerCase().includes(filter.toLowerCase()));
      dropdown.empty();
      if (notes.length === 0) {
        dropdown.addClass("is-hidden");
        dropdown.removeClass("is-visible");
        return;
      }
      notes.slice(0, 20).forEach((note) => {
        const item = dropdown.createDiv("notes-dropdown-item");
        item.setText(note);
        item.onclick = () => {
          nameInput.value = note;
          dropdown.addClass("is-hidden");
          dropdown.removeClass("is-visible");
        };
      });
      dropdown.addClass("is-visible");
      dropdown.removeClass("is-hidden");
    };
    nameInput.addEventListener("input", () => {
      if (nameInput.value.length > 0)
        showDropdown(nameInput.value);
      else {
        dropdown.addClass("is-hidden");
        dropdown.removeClass("is-visible");
      }
    });
    nameInput.addEventListener("blur", () => window.setTimeout(() => {
      dropdown.addClass("is-hidden");
      dropdown.removeClass("is-visible");
    }, 150));
    nameInput.addEventListener("focus", () => {
      if (nameInput.value.length > 0)
        showDropdown(nameInput.value);
    });
    addBtn.onclick = () => {
      const n = nameInput.value.trim();
      if (!n)
        return;
      this.addCategory(n);
      nameInput.value = "";
      dropdown.addClass("is-hidden");
      dropdown.removeClass("is-visible");
    };
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        addBtn.click();
      if (e.key === "Escape") {
        dropdown.addClass("is-hidden");
        dropdown.removeClass("is-visible");
      }
    });
  }
  renderCategoryBlock(container, cat) {
    const block = container.createDiv("category-block");
    block.setAttribute("data-category-id", cat.id);
    const catHdr = block.createDiv("category-header");
    if (cat.color)
      catHdr.style.borderBottomColor = (cat.color || (this.plugin.settings.themeColor || "#8a5cf5")) + "60";
    catHdr.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeActiveMenu();
      this.showCategoryMenu(block, cat, e);
    };
    const nameEl = catHdr.createEl("span", { cls: "category-name", text: (cat.pinned ? "\u2B50 " : "") + cat.name });
    if (cat.color)
      nameEl.style.color = cat.color;
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
    if (active.length === 0 && done.length === 0)
      block.createEl("p", { cls: "mytodo-empty", text: "No tasks yet." });
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
    const todayBtn = row2.createEl("button", { text: "Today", cls: "date-shortcut-btn" });
    todayBtn.type = "button";
    todayBtn.onclick = (e) => {
      e.preventDefault();
      dateInput.value = todayIso();
    };
    const tomorrowBtn = row2.createEl("button", { text: "Tomorrow", cls: "date-shortcut-btn" });
    tomorrowBtn.type = "button";
    tomorrowBtn.onclick = (e) => {
      e.preventDefault();
      const tomorrow = /* @__PURE__ */ new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.value = localIso(tomorrow);
    };
    const actions = form.createDiv("add-task-form-actions");
    const cancelBtn = actions.createEl("button", { text: "Cancel", cls: "cancel-task-btn" });
    const addBtn = actions.createEl("button", { text: "Add", cls: "add-task-btn" });
    trigger.onclick = () => {
      trigger.addClass("is-hidden");
      form.addClass("visible");
      textInput.focus();
    };
    cancelBtn.onclick = () => {
      form.removeClass("visible");
      trigger.removeClass("is-hidden");
      textInput.value = "";
      hoursInput.value = "";
      dateInput.value = "";
    };
    const submit = () => {
      const text = textInput.value.trim();
      if (!text)
        return;
      this.addTask(cat.id, text, parseFloat(hoursInput.value) || 0.5, dateInput.value || void 0);
    };
    addBtn.onclick = submit;
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        submit();
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
      if (!nameEl)
        return;
      const input = createEl("input", { cls: "cat-rename-input", value: cat.name });
      nameEl.replaceWith(input);
      input.focus();
      input.select();
      const saveRename = () => {
        const n = input.value.trim();
        if (n && n !== cat.name)
          this.renameCategory(cat.id, n);
        else
          this.render();
      };
      input.addEventListener("blur", saveRename);
      input.addEventListener("keydown", (e2) => {
        if (e2.key === "Enter")
          saveRename();
        if (e2.key === "Escape")
          this.render();
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
      if (!tagEl)
        return;
      const input = createEl("input", { cls: "cat-rename-input cat-tag-rename-input", value: catTag(cat.name, cat.customTag) });
      tagEl.replaceWith(input);
      input.focus();
      input.select();
      const confirmTag = () => {
        const n = input.value.trim();
        if (n)
          this.renameTag(cat.id, n);
        else
          this.render();
      };
      input.addEventListener("blur", confirmTag);
      input.addEventListener("keydown", (e2) => {
        if (e2.key === "Enter")
          confirmTag();
        if (e2.key === "Escape")
          this.render();
      });
    };
    menu.createDiv("cat-dropdown-divider");
    const colorLabel = menu.createDiv("cat-dropdown-item no-hover");
    colorLabel.setText("\u25CF Color");
    const swatches = menu.createDiv("color-swatches");
    CATEGORY_COLORS.forEach((c) => {
      const sw = swatches.createDiv("color-swatch");
      sw.style.background = c.value || "#555555";
      if (cat.color === c.value)
        sw.addClass("active");
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
      new ConfirmModal(this.plugin.app, `Delete "${cat.name}" and all its tasks?`, () => this.deleteCategory(cat.id)).open();
    };
  }
  renderTaskRow(container, task, context) {
    const overdue = this.getOverdueStatus(task);
    const row = container.createDiv(`todo-task${task.completed ? " completed" : ""}`);
    row.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeActiveMenu();
      this.showTaskMenu(row, task, context, e);
    };
    if (context === "weekly" || context === "daily") {
      row.ondblclick = () => {
        const catObj = this.data.categories.find((c) => c.id === task.categoryId);
        if (!catObj)
          return;
        const block = document.querySelector(`.category-block[data-category-id="${catObj.id}"]`);
        if (block) {
          block.scrollIntoView({ behavior: "smooth", block: "center" });
          block.classList.add("highlight-flash");
          window.setTimeout(() => block.classList.remove("highlight-flash"), 1200);
        }
      };
    }
    const left = row.createDiv("task-left");
    const checkbox = left.createDiv(`task-checkbox${task.completed ? " checked" : ""}`);
    checkbox.onclick = () => this.toggleComplete(task.id);
    const body = left.createDiv("task-body");
    const textEl = body.createEl("span", { cls: "task-text", text: task.text });
    if (!task.completed) {
      if (overdue === "orange")
        textEl.addClass("overdue-orange");
      if (overdue === "red")
        textEl.addClass("overdue-red");
    }
    const badges = body.createDiv("task-badges");
    badges.createEl("span", { cls: "task-hours", text: `${task.estimatedHours}h` });
    if (task.dueDate) {
      const dueEl = badges.createEl("span", { cls: "task-due", text: toDisplayDate(task.dueDate) });
      if (!task.completed) {
        if (overdue === "orange")
          dueEl.addClass("overdue-orange");
        if (overdue === "red")
          dueEl.addClass("overdue-red");
      }
    }
    if (context === "weekly" || context === "daily") {
      const taskCat = this.data.categories.find((c) => c.id === task.categoryId);
      const displayName = taskCat ? taskCat.name : task.category;
      const tagEl = badges.createEl("span", { cls: "task-cat-tag", text: catTag(displayName, taskCat == null ? void 0 : taskCat.customTag) });
      tagEl.onclick = (e) => {
        e.stopPropagation();
        const block = document.querySelector(`.category-block[data-category-id="${taskCat == null ? void 0 : taskCat.id}"]`);
        if (block) {
          block.scrollIntoView({ behavior: "smooth", block: "center" });
          block.classList.add("highlight-flash");
          window.setTimeout(() => block.classList.remove("highlight-flash"), 1200);
        }
      };
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
      this.showTaskMenu(row, task, context, e);
    };
  }
  showTaskMenu(row, task, context, e) {
    const menu = createEl("div", { cls: "task-dropdown" });
    menu.style.position = "fixed";
    menu.style.zIndex = "99999";
    if (e) {
      menu.style.top = Math.min(e.clientY, window.innerHeight - 160) + "px";
      menu.style.left = Math.min(e.clientX, window.innerWidth - 160) + "px";
    } else {
      const rect = row.getBoundingClientRect();
      menu.style.top = Math.min(rect.bottom, window.innerHeight - 160) + "px";
      menu.style.left = Math.min(rect.right - 150, window.innerWidth - 160) + "px";
    }
    document.body.appendChild(menu);
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
    var _a;
    if ((_a = row.nextElementSibling) == null ? void 0 : _a.classList.contains("task-edit-form"))
      return;
    const form = createEl("div", { cls: "task-edit-form" });
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
    if (task.dueDate)
      dateInput.value = task.dueDate;
    const actionsDiv = form.createDiv("task-edit-actions");
    const cancelBtn = actionsDiv.createEl("button", { text: "Cancel", cls: "cancel-task-btn" });
    const saveBtn = actionsDiv.createEl("button", { text: "Save", cls: "add-task-btn" });
    cancelBtn.onclick = () => {
      form.remove();
    };
    saveBtn.onclick = () => {
      const newText = textInput.value.trim();
      if (!newText)
        return;
      this.editTask(task.id, newText, parseFloat(hoursInput.value) || task.estimatedHours, dateInput.value || void 0);
      form.remove();
    };
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        saveBtn.click();
      if (e.key === "Escape")
        cancelBtn.click();
    });
    row.insertAdjacentElement("afterend", form);
    textInput.focus();
    textInput.select();
  }
  renderHeatmap(root) {
    var _a;
    const section = root.createDiv("heatmap-section");
    section.createEl("h1", { cls: "heatmap-section-title", text: "Productivity Heatmap" });
    const logicalDayStr = getLogicalDay(this.plugin.settings.rolloverHour, this.plugin.settings.rolloverMinute);
    const [y, m, d] = logicalDayStr.split("-").map(Number);
    const today = new Date(y, m - 1, d);
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = today.toLocaleString("default", { month: "long" });
    const todayDay = today.getDate();
    const monthLabel = section.createEl("p", { cls: "heatmap-month-label", text: `${monthName} ${year}` });
    const grid = section.createDiv("heatmap-grid");
    for (let day = 1; day <= daysInMonth; day++) {
      const d2 = new Date(year, month, day);
      const dateStr = localIso(d2);
      const scoreEntry = this.data.scores.find((s) => s.date === dateStr);
      const score = (_a = scoreEntry == null ? void 0 : scoreEntry.score) != null ? _a : 0;
      const isFuture = day > todayDay;
      const cell = grid.createDiv(`heatmap-cell${isFuture ? " is-future" : ""}${day === todayDay ? " is-today" : ""}`);
      cell.style.backgroundColor = isFuture ? "var(--background-modifier-border)" : this.scoreToColor(score);
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
    if (score === 0)
      return "var(--background-secondary)";
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
    this._saveTimeout = null;
    this._pendingSaveData = null;
    this._pendingSaveResolvers = [];
  }
  onload() {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const saved = yield this.loadData();
      this.data = __spreadProps(__spreadValues(__spreadValues({}, DEFAULT_DATA), saved), { categories: (_a = saved == null ? void 0 : saved.categories) != null ? _a : DEFAULT_DATA.categories, scores: (_b = saved == null ? void 0 : saved.scores) != null ? _b : [], lastRolloverDate: (_c = saved == null ? void 0 : saved.lastRolloverDate) != null ? _c : "" });
      for (const cat of this.data.categories) {
        for (const task of cat.tasks) {
          if (!task.categoryId) {
            task.categoryId = cat.id;
          }
        }
      }
      this.settings = __spreadValues(__spreadValues({}, DEFAULT_SETTINGS), (_d = saved == null ? void 0 : saved.settings) != null ? _d : {});
      if (!this.settings.themeColor)
        this.settings.themeColor = "#8a5cf5";
      this.registerView(VIEW_TYPE, (leaf) => new TodoView(leaf, this));
      this.addRibbonIcon("check-square", "My Todo", () => this.activateView());
      this.addCommand({ id: "open", name: "Open", callback: () => this.activateView() });
      this.addSettingTab(new TodoSettingTab(this.app, this));
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", () => {
          this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((v) => {
            const view = v.view;
            if (view == null ? void 0 : view.render) {
              view.data = this.data;
              view.render();
            }
          });
        })
      );
      this.registerInterval(window.setInterval(() => {
        this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((v) => {
          const view = v.view;
          if (view == null ? void 0 : view.runDayRollover)
            view.runDayRollover();
        });
      }, 6e4));
    });
  }
  saveDataQueued(data) {
    return new Promise((resolve) => {
      this._pendingSaveData = data;
      this._pendingSaveResolvers.push(resolve);
      if (this._saveTimeout) {
        window.clearTimeout(this._saveTimeout);
      }
      this._saveTimeout = window.setTimeout(() => {
        this._saveTimeout = null;
        const dataToSave = this._pendingSaveData;
        const resolvers = this._pendingSaveResolvers;
        this._pendingSaveResolvers = [];
        const saveCall = () => __async(this, null, function* () {
          yield this.saveData(dataToSave);
          resolvers.forEach((r) => r());
        });
        if (!this._savePromise) {
          this._savePromise = saveCall();
        } else {
          this._savePromise = this._savePromise.then(saveCall).catch(saveCall);
        }
      }, 1e3);
    });
  }
  saveSettings() {
    return __async(this, null, function* () {
      yield this.saveDataQueued(__spreadProps(__spreadValues({}, this.data), { settings: this.settings }));
    });
  }
  onunload() {
    return __async(this, null, function* () {
      if (this._saveTimeout) {
        window.clearTimeout(this._saveTimeout);
        this._saveTimeout = null;
      }
      if (this._pendingSaveData) {
        yield this.saveData(this._pendingSaveData);
        this._pendingSaveResolvers.forEach((r) => r());
        this._pendingSaveResolvers = [];
        this._pendingSaveData = null;
      }
    });
  }
  activateView() {
    return __async(this, null, function* () {
      var _a;
      const { workspace } = this.app;
      let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
      if (!leaf) {
        leaf = (_a = workspace.getRightLeaf(false)) != null ? _a : workspace.getLeaf(true);
        yield leaf.setViewState({ type: VIEW_TYPE, active: true });
      }
      workspace.revealLeaf(leaf);
    });
  }
};
