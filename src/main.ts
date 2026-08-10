import { Notice, Plugin, WorkspaceLeaf, ItemView, PluginSettingTab, App, Setting, TFile } from 'obsidian';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
	id: string;
	text: string;
	estimatedHours: number;
	dueDate?: string;
	category: string;
	categoryId?: string;
	inWeekly: boolean;
	inDaily: boolean;
	completed: boolean;
	completedDate?: string;
	createdDate: string;
}

interface Category {
	id: string;
	name: string;
	color?: string;
	customTag?: string;
	pinned?: boolean;
	createdDate?: string;
	tasks: Task[];
}

interface DayScore {
	date: string;
	plannedHours: number;
	completedHours: number;
	score: number;
}

interface TodoData {
	categories: Category[];
	scores: DayScore[];
	lastRolloverDate: string;
}

interface TodoSettings {
	rolloverHour: number;
	rolloverMinute: number;
	archiveEnabled: boolean;
	themeColor: string;
	sortOrder: 'manual' | 'alpha-asc' | 'alpha-desc' | 'date-asc' | 'date-desc';
}

const DEFAULT_DATA: TodoData = {
	categories: [
		{ id: 'cat-1', name: 'Freelance Project 1', tasks: [] },
		{ id: 'cat-2', name: 'Freelance Project 2', tasks: [] },
		{ id: 'cat-3', name: 'College Subject 1', tasks: [] },
		{ id: 'cat-4', name: 'College Subject 2', tasks: [] },
	],
	scores: [],
	lastRolloverDate: '',
};

const DEFAULT_SETTINGS: TodoSettings = {
	rolloverHour: 0,
	rolloverMinute: 0,
	archiveEnabled: false,
	themeColor: '#8a5cf5',
	sortOrder: 'manual',
};

const CATEGORY_COLORS = [
	{ label: 'Default', value: '' },
	{ label: 'Purple', value: '#8a5cf5' },
	{ label: 'Blue', value: '#3b82f6' },
	{ label: 'Green', value: '#22c55e' },
	{ label: 'Orange', value: '#f97316' },
	{ label: 'Pink', value: '#ec4899' },
	{ label: 'Teal', value: '#14b8a6' },
];

const VIEW_TYPE = 'my-todo-view';
const NOTES_FOLDER = 'My Todo Notes';
const TAGS_NOTE = 'My Todo Notes/_tags.md';

function toDisplayDate(isoDate: string): string {
	if (!isoDate) return '';
	const [y, m, d] = isoDate.split('-');
	return `${d}-${m}-${y}`;
}

function toIsoDate(input: string): string {
	if (!input) return '';
	if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
	const parts = input.split('-');
	if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
	return '';
}

function localIso(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayIso(): string {
	return localIso(new Date());
}

function catTag(name: string, customTag?: string): string {
	if (customTag) return customTag.startsWith('#') ? customTag : '#' + customTag;
	return '#' + name.replace(/\s+/g, '-').toLowerCase();
}

function getLogicalDay(rolloverHour: number, rolloverMinute: number): string {
	const now = new Date();
	const currentHour = now.getHours();
	const currentMinute = now.getMinutes();
	if (currentHour < rolloverHour || (currentHour === rolloverHour && currentMinute < rolloverMinute)) {
		const prev = new Date(now);
		prev.setDate(prev.getDate() - 1);
		return localIso(prev);
	}
	return todayIso();
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

class TodoSettingTab extends PluginSettingTab {
	plugin: MyTodoPlugin;

	constructor(app: App, plugin: MyTodoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'My Todo Settings' });

		// End of day time
		containerEl.createEl('p', { text: 'Set the time when your day resets. Values are auto-clamped to valid range.', attr: { style: 'color:var(--text-muted);font-size:13px;margin-bottom:16px;' } });

		let hourInput: HTMLInputElement;
		let minuteInput: HTMLInputElement;

		const saveTimeSettings = async () => {
			let h = parseInt(hourInput.value); let m = parseInt(minuteInput.value);
			if (isNaN(h)) h = 0; if (isNaN(m)) m = 0;
			h = Math.min(23, Math.max(0, h)); m = Math.min(59, Math.max(0, m));
			hourInput.value = String(h); minuteInput.value = String(m);
			
			if (this.plugin.settings.rolloverHour !== h || this.plugin.settings.rolloverMinute !== m) {
				this.plugin.settings.rolloverHour = h; this.plugin.settings.rolloverMinute = m;
				await this.plugin.saveSettings();
				this.updatePreview(containerEl);
			}
		};

		new Setting(containerEl)
			.setName('End of day time')
			.setDesc('Hour (0-23) and minute (0-59). Saves automatically on change or blur.')
			.addText(text => {
				hourInput = text.inputEl;
				text.inputEl.type = 'number'; text.inputEl.min = '0'; text.inputEl.max = '23';
				text.inputEl.style.width = '60px'; text.inputEl.style.marginRight = '8px';
				text.inputEl.placeholder = 'hr';
				text.setValue(String(this.plugin.settings.rolloverHour));
				text.onChange(() => saveTimeSettings());
				text.inputEl.addEventListener('blur', () => saveTimeSettings());
			})
			.addText(text => {
				minuteInput = text.inputEl;
				text.inputEl.type = 'number'; text.inputEl.min = '0'; text.inputEl.max = '59';
				text.inputEl.style.width = '60px'; text.inputEl.style.marginRight = '8px';
				text.inputEl.placeholder = 'min';
				text.setValue(String(this.plugin.settings.rolloverMinute));
				text.onChange(() => saveTimeSettings());
				text.inputEl.addEventListener('blur', () => saveTimeSettings());
			});

		this.updatePreview(containerEl);

		// Archive toggle
		new Setting(containerEl)
			.setName('Show archive section')
			.setDesc('Display completed task archive inside the plugin. Off by default.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.archiveEnabled)
				.onChange(async (val) => {
					this.plugin.settings.archiveEnabled = val;
					await this.plugin.saveSettings();
				})
			);

		// Category Sorting
		new Setting(containerEl)
			.setName('Category Sort Order')
			.setDesc('How should your categories be ordered? You can also pin up to 2 categories to the top.')
			.addDropdown(drop => drop
				.addOption('manual', 'Manual (Drag and Drop)')
				.addOption('alpha-asc', 'Alphabetical (A-Z)')
				.addOption('alpha-desc', 'Alphabetical (Z-A)')
				.addOption('date-asc', 'Date Created (Oldest First)')
				.addOption('date-desc', 'Date Created (Newest First)')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (val: any) => {
					this.plugin.settings.sortOrder = val;
					await this.plugin.saveSettings();
					this.plugin.app.workspace.getLeavesOfType('my-todo-view').forEach(v => {
						const view = v.view as any;
						if (view?.render) view.render();
					});
				})
			);

		// Theme color
		containerEl.createEl('h3', { text: 'Theme Color', attr: { style: 'margin-top:24px;margin-bottom:8px;font-family:"Century Gothic","AppleGothic","Trebuchet MS",sans-serif;' } });
		containerEl.createEl('p', { text: 'Choose the accent color used throughout the plugin.', attr: { style: 'color:var(--text-muted);font-size:13px;margin-bottom:12px;' } });

		const THEME_COLORS = [
			{ label: 'Purple', value: '#8a5cf5' },
			{ label: 'Blue', value: '#3b82f6' },
			{ label: 'Green', value: '#22c55e' },
			{ label: 'Teal', value: '#14b8a6' },
			{ label: 'Pink', value: '#ec4899' },
			{ label: 'Red', value: '#ef4444' },
			{ label: 'Orange', value: '#f97316' },
		];

		const swatchWrap = containerEl.createDiv();
		swatchWrap.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;align-items:center;';

		THEME_COLORS.forEach(tc => {
			const swatch = swatchWrap.createDiv();
			swatch.style.cssText = `width:28px;height:28px;border-radius:50%;background:${tc.value};cursor:pointer;border:3px solid ${this.plugin.settings.themeColor === tc.value ? 'white' : 'transparent'};transition:border-color 0.15s,transform 0.15s;box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
			swatch.title = tc.label;
			swatch.onclick = async () => {
				this.plugin.settings.themeColor = tc.value;
				await this.plugin.saveSettings();
				// Re-render all swatches
				swatchWrap.querySelectorAll('div').forEach((s: HTMLElement, i: number) => {
					s.style.borderColor = THEME_COLORS[i].value === tc.value ? 'white' : 'transparent';
				});
				// Re-render plugin view if open
				this.plugin.app.workspace.getLeavesOfType('my-todo-view').forEach(v => {
					const view = v.view as any;
					if (view?.render) { view.data = this.plugin.data; view.render(); }
				});
				new Notice(`Theme color set to ${tc.label}`);
			};
			swatchWrap.appendChild(swatch);
		});
	}

	updatePreview(containerEl: HTMLElement) {
		const existing = containerEl.querySelector('.rollover-preview');
		if (existing) existing.remove();
		const h = String(this.plugin.settings.rolloverHour).padStart(2, '0');
		const m = String(this.plugin.settings.rolloverMinute).padStart(2, '0');
		containerEl.createEl('p', { text: `✓ Day resets at ${h}:${m}`, attr: { class: 'rollover-preview', style: 'color:#8a5cf5;font-size:13px;margin-top:8px;margin-bottom:16px;' } });
	}
}

// ─── View ─────────────────────────────────────────────────────────────────────

class TodoView extends ItemView {
	plugin: MyTodoPlugin;
	data: TodoData;
	private activeMenu: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: MyTodoPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.data = plugin.data;
	}

	getViewType() { return VIEW_TYPE; }
	getDisplayText() { return 'My Todo'; }
	getIcon() { return 'check-square'; }

	async onOpen() {
		this.data = this.plugin.data;
		await this.runDayRollover();
		this.render();
		this.registerDomEvent(document, 'click', (e: MouseEvent) => {
			if (this.activeMenu && !this.activeMenu.contains(e.target as Node)) {
				this.closeActiveMenu();
			}
		});

		const container = this.containerEl.children[1] as HTMLElement;
		this.registerDomEvent(container, 'scroll', () => {
			const btn = container.querySelector('.todo-back-to-top') as HTMLElement;
			if (btn) {
				btn.style.display = container.scrollTop > 150 ? 'flex' : 'none';
			}
		});
	}

	save(skipUpdateScore = false) { this.plugin.data = this.data; if (!skipUpdateScore) this.updateScore(); this.plugin.saveDataQueued({ ...this.data, settings: this.plugin.settings }); }

	// ─── Rollover ─────────────────────────────────────────────────────────────
	async archiveCompletedTasksToNote(tasks: Task[]) {
		const { vault } = this.plugin.app;
		const dateStr = todayIso();
		const lines = tasks.map(t => {
			const catObj = this.data.categories.find(c => c.id === t.categoryId);
			const tagStr = catTag(t.category, catObj?.customTag);
			return `- [x] ${t.text} (${t.estimatedHours}h) - ${tagStr} [completed: ${t.completedDate || dateStr}]`;
		}).join('\n');

		const archivePath = `${NOTES_FOLDER}/Archive.md`;
		const content = `\n### Rollover ${toDisplayDate(dateStr)}\n${lines}\n`;

		try {
			await vault.createFolder(NOTES_FOLDER);
		} catch { }

		try {
			const existing = vault.getAbstractFileByPath(archivePath);
			if (existing instanceof TFile) {
				const currentContent = await vault.read(existing);
				await vault.modify(existing, currentContent + content);
			} else {
				const header = `---\ntags: [my-todo-archive]\n---\n\n# Completed Tasks Archive\n`;
				await vault.create(archivePath, header + content);
			}
		} catch (e) {
			new Notice('Failed to archive tasks: ' + e);
		}
	}

	async runDayRollover() {
		const { rolloverHour, rolloverMinute } = this.plugin.settings;
		const logicalDay = getLogicalDay(rolloverHour, rolloverMinute);
		if (this.data.lastRolloverDate === logicalDay) return;

		const prevDay = this.data.lastRolloverDate;
		if (prevDay) {
			const allTasks = this.data.categories.flatMap(c => c.tasks);
			const dailyTasks = allTasks.filter(t => t.inDaily);
			const planned = dailyTasks.reduce((s, t) => s + t.estimatedHours, 0);
			const completed = dailyTasks.filter(t => t.completed).reduce((s, t) => s + t.estimatedHours, 0);
			const score = planned === 0 ? 0 : Math.round((completed / planned) * 100);
			const existing = this.data.scores.find(s => s.date === prevDay);
			if (existing) { existing.plannedHours = planned; existing.completedHours = completed; existing.score = score; }
			else this.data.scores.push({ date: prevDay, plannedHours: planned, completedHours: completed, score });
		}

		if (this.plugin.settings.archiveEnabled) {
			const completedTasks = this.data.categories.flatMap(c => c.tasks).filter(t => t.completed);
			if (completedTasks.length > 0) {
				await this.archiveCompletedTasksToNote(completedTasks);
			}
		}

		for (const cat of this.data.categories) cat.tasks = cat.tasks.filter(t => !t.completed);
		for (const cat of this.data.categories) for (const task of cat.tasks) if (task.inDaily && !task.completed) task.inDaily = false;

		this.data.lastRolloverDate = logicalDay;
		this.save(true);
		new Notice('🌅 Day rolled over.');
	}

	updateScore() {
		const { rolloverHour, rolloverMinute } = this.plugin.settings;
		const today = getLogicalDay(rolloverHour, rolloverMinute);
		const dailyTasks = this.getDailyTasks();
		const planned = dailyTasks.reduce((s, t) => s + t.estimatedHours, 0);
		const completed = dailyTasks.filter(t => t.completed).reduce((s, t) => s + t.estimatedHours, 0);
		const score = planned === 0 ? 0 : Math.round((completed / planned) * 100);
		const existing = this.data.scores.find(s => s.date === today);
		if (existing) { existing.plannedHours = planned; existing.completedHours = completed; existing.score = score; }
		else this.data.scores.push({ date: today, plannedHours: planned, completedHours: completed, score });
	}

	getAllTasks(): Task[] { return this.data.categories.flatMap(c => c.tasks); }
	getWeeklyTasks(): Task[] { return this.getAllTasks().filter(t => t.inWeekly); }
	getDailyTasks(): Task[] { return this.getAllTasks().filter(t => t.inDaily); }
	getTaskById(id: string): Task | undefined { return this.getAllTasks().find(t => t.id === id); }
	generateId(): string { return 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }

	getOverdueStatus(task: Task): 'none' | 'orange' | 'red' {
		if (task.completed || !task.dueDate) return 'none';
		const today = new Date(); today.setHours(0, 0, 0, 0);
		const [y, m, d] = task.dueDate.split('-').map(Number);
		const due = new Date(y, m - 1, d, 0, 0, 0, 0);
		const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
		if (diff >= 3) return 'red';
		if (diff >= 1) return 'orange';
		return 'none';
	}

	// ─── Actions ──────────────────────────────────────────────────────────────
	toggleComplete(taskId: string) {
		const task = this.getTaskById(taskId);
		if (!task) return;
		task.completed = !task.completed;
		task.completedDate = task.completed ? todayIso() : undefined;
		// Tasks are no longer deleted immediately upon completion.
		// They will persist with a strikethrough and be purged during the next rollover.
		this.save(); this.render();
	}

	toggleWeekly(taskId: string) {
		const task = this.getTaskById(taskId);
		if (!task) return;
		task.inWeekly = !task.inWeekly;
		if (!task.inWeekly) task.inDaily = false;
		this.save(); this.render();
	}

	toggleDaily(taskId: string) {
		const task = this.getTaskById(taskId);
		if (!task) return;
		if (!task.inWeekly) { new Notice('Add to Weekly first.'); return; }
		task.inDaily = !task.inDaily;
		this.save(); this.render();
	}

	addTask(categoryId: string, text: string, hours: number, dueDate?: string) {
		const cat = this.data.categories.find(c => c.id === categoryId);
		if (!cat) return;
		cat.tasks.push({ id: this.generateId(), text, estimatedHours: hours, dueDate, category: cat.name, categoryId: cat.id, inWeekly: false, inDaily: false, completed: false, createdDate: todayIso() });
		this.save(); this.render();
	}

	editTask(taskId: string, text: string, hours: number, dueDate?: string) {
		const task = this.getTaskById(taskId);
		if (!task) return;
		task.text = text; task.estimatedHours = hours; task.dueDate = dueDate;
		this.save(); this.render();
	}

	deleteTask(taskId: string) {
		for (const cat of this.data.categories) cat.tasks = cat.tasks.filter(t => t.id !== taskId);
		this.save(); this.render();
	}

	addCategory(name: string) {
		this.data.categories.push({ id: 'cat-' + Date.now(), name, tasks: [], createdDate: todayIso() });
		this.updateTagsNote();
		this.save(); this.render();
	}

	deleteCategory(catId: string) {
		this.data.categories = this.data.categories.filter(c => c.id !== catId);
		this.updateTagsNote();
		this.save(); this.render();
	}

	renameTag(catId: string, newTag: string) {
		const cat = this.data.categories.find(c => c.id === catId);
		if (!cat) return;
		// Normalize: ensure starts with #, no spaces
		const clean = newTag.trim().replace(/\s+/g, '-');
		cat.customTag = clean.startsWith('#') ? clean : '#' + clean;
		// Update category field on all tasks so badges reflect new tag
		// (category name unchanged, only display tag changes)
		this.updateTagsNote();
		this.save(); this.render();
	}

	renameCategory(catId: string, newName: string) {
		const cat = this.data.categories.find(c => c.id === catId);
		if (!cat) return;
		cat.name = newName; cat.tasks.forEach(t => t.category = newName);
		this.updateTagsNote();
		this.save(); this.render();
	}

	setCategoryColor(catId: string, color: string) {
		const cat = this.data.categories.find(c => c.id === catId);
		if (!cat) return;
		cat.color = color; this.save(); this.render();
	}

	moveCategoryUp(catId: string) {
		const idx = this.data.categories.findIndex(c => c.id === catId);
		if (idx <= 0) return;
		[this.data.categories[idx - 1], this.data.categories[idx]] = [this.data.categories[idx], this.data.categories[idx - 1]];
		this.save(); this.render();
	}

	moveCategoryDown(catId: string) {
		const idx = this.data.categories.findIndex(c => c.id === catId);
		if (idx >= this.data.categories.length - 1) return;
		[this.data.categories[idx + 1], this.data.categories[idx]] = [this.data.categories[idx], this.data.categories[idx + 1]];
		this.save(); this.render();
	}

	// ─── Note creation ────────────────────────────────────────────────────────
	async updateTagsNote() {
		const { vault } = this.plugin.app;
		const tags = this.data.categories.map(c => catTag(c.name, c.customTag)).join('\n');
		const content = `---\ntags: [my-todo]\n---\n\n<!-- Auto-generated by My Todo plugin. Do not edit. -->\n\n${tags}\n`;
		try {
			await vault.createFolder(NOTES_FOLDER);
		} catch { }
		const existing = vault.getAbstractFileByPath(TAGS_NOTE);
		if (existing instanceof TFile) await vault.modify(existing, content);
		else await vault.create(TAGS_NOTE, content);
	}

	async createCategoryNote(cat: Category) {
		const { vault, workspace } = this.plugin.app;
		const tag = catTag(cat.name, cat.customTag);
		const taskList = cat.tasks.length > 0
			? cat.tasks.map(t => `- [ ] ${t.text} (${t.estimatedHours}h)`).join('\n')
			: '_No tasks yet._';
		const content = `---\ntags: [${tag.slice(1)}]\n---\n\n# ${cat.name}\n\n${tag}\n\n## Tasks\n\n${taskList}\n`;
		const safeName = cat.name.replace(/[\\/:*?"<>|.]/g, '-');
		const path = `${NOTES_FOLDER}/${safeName}.md`;
		try { await vault.createFolder(NOTES_FOLDER); } catch { }
		try {
			const existing = vault.getAbstractFileByPath(path);
			if (existing instanceof TFile) {
				await vault.modify(existing, content);
				new Notice(`Updated note: ${cat.name}`);
			} else {
				const file = await vault.create(path, content);
				new Notice(`Created note: ${cat.name}`);
			}
			const leaf = workspace.getLeaf(true);
			const file = vault.getAbstractFileByPath(path);
			if (file instanceof TFile) await leaf.openFile(file);
		} catch (e) {
			new Notice('Could not create note: ' + e);
		}
	}

	getAllVaultNotes(): string[] {
		return this.plugin.app.vault.getMarkdownFiles().map(f => f.basename).sort();
	}

	closeActiveMenu() {
		if (this.activeMenu) {
			if (this.activeMenu.parentNode) this.activeMenu.parentNode.removeChild(this.activeMenu);
			this.activeMenu = null;
		}
	}

	// ─── Render ───────────────────────────────────────────────────────────────
	render() {
		this.data = this.plugin.data;
		const container = this.containerEl.children[1] as HTMLElement;
		if (container.querySelector('input:focus')) return; // Prevent focus stealing on re-render
		
		const scrollTop = container.scrollTop;

		container.empty();
		const tc = this.plugin.settings.themeColor || '#8a5cf5';
		const tcLight = tc + '20';
		const tcMid = tc + '40';
		const tcFaint = tc + '18';
		const tcFaint15 = tc + '15';
		container.style.pointerEvents = 'all';
		container.style.userSelect = 'text';
		container.style.overflowY = 'auto';
		container.style.setProperty('--todo-tc', tc);
		container.style.setProperty('--todo-tc-light', tcLight);
		container.style.setProperty('--todo-tc-mid', tcMid);
		container.style.setProperty('--todo-tc-faint', tcFaint);
		container.style.setProperty('--todo-tc-faint15', tcFaint15);
		const root = container.createDiv('my-todo-root');
		this.renderHeader(root);
		this.renderDaily(root);
		this.renderWeekly(root);
		this.renderCategories(root);
		this.renderHeatmap(root);

		// Add floating Back to Top button
		const backToTop = container.createEl('button', { cls: 'todo-back-to-top', text: '▲' });
		backToTop.title = 'Back to top';
		backToTop.style.display = scrollTop > 150 ? 'flex' : 'none';
		backToTop.onclick = () => {
			container.scrollTo({ top: 0, behavior: 'smooth' });
		};

		container.scrollTop = scrollTop;
	}

	renderHeader(root: HTMLElement) {
		const { rolloverHour, rolloverMinute } = this.plugin.settings;
		const today = getLogicalDay(rolloverHour, rolloverMinute);
		const s = this.data.scores.find(x => x.date === today);
		const planned = s?.plannedHours ?? 0; const completed = s?.completedHours ?? 0; const score = s?.score ?? 0;
		const header = root.createDiv('todo-header');
		header.createEl('h1', { text: 'My Todo' });
		header.createEl('span', { cls: 'todo-score-badge', text: planned === 0 ? 'No tasks today' : `${completed}h / ${planned}h · ${score}%` });
		header.createEl('span', { cls: 'todo-rollover-info', text: `Resets ${String(rolloverHour).padStart(2, '0')}:${String(rolloverMinute).padStart(2, '0')}` });
	}

	renderDaily(root: HTMLElement) {
		const card = root.createDiv('kanban-card');
		card.createEl('h1', { cls: 'kanban-card-title', text: 'Daily Todo' });
		const tasks = this.getDailyTasks();
		if (tasks.length === 0) card.createEl('p', { cls: 'mytodo-empty', text: 'No tasks for today. Add from Weekly.' });
		else tasks.forEach(t => this.renderTaskRow(card, t, 'daily'));
	}

	renderWeekly(root: HTMLElement) {
		const card = root.createDiv('kanban-card');
		card.createEl('h1', { cls: 'kanban-card-title', text: 'Weekly Todo' });
		const tasks = this.getWeeklyTasks();
		if (tasks.length === 0) card.createEl('p', { cls: 'mytodo-empty', text: 'No tasks this week. Add from Categories below.' });
		else tasks.forEach(t => this.renderTaskRow(card, t, 'weekly'));
	}

	renderCategories(root: HTMLElement) {
		const section = root.createDiv('todo-section');
		section.createEl('h1', { cls: 'todo-section-title', text: 'Categories' });
		const grid = section.createDiv('categories-kanban');

		let catsToRender = [...this.data.categories];
		if (this.plugin.settings.sortOrder === 'alpha-asc') catsToRender.sort((a, b) => a.name.localeCompare(b.name));
		else if (this.plugin.settings.sortOrder === 'alpha-desc') catsToRender.sort((a, b) => b.name.localeCompare(a.name));
		else if (this.plugin.settings.sortOrder === 'date-asc') catsToRender.sort((a, b) => (a.createdDate || '').localeCompare(b.createdDate || ''));
		else if (this.plugin.settings.sortOrder === 'date-desc') catsToRender.sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''));
		catsToRender.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

		catsToRender.forEach(cat => this.renderCategoryBlock(grid, cat));

		// Add category with dropdown
		const addArea = section.createDiv('add-category-area');
		const addRow = addArea.createDiv('add-category-row');
		const inputWrap = addRow.createDiv('add-category-input-wrap');
		const nameInput = inputWrap.createEl('input', { type: 'text', placeholder: 'New category name or pick a note...' });
		const addBtn = addRow.createEl('button', { text: '+ Category', cls: 'add-task-btn' });

		// Notes dropdown
		const dropdown = inputWrap.createDiv('notes-dropdown');
		dropdown.style.display = 'none';

		const showDropdown = (filter: string) => {
			const notes = this.getAllVaultNotes().filter(n => n.toLowerCase().includes(filter.toLowerCase()));
			dropdown.empty();
			if (notes.length === 0) { dropdown.style.display = 'none'; return; }
			notes.slice(0, 20).forEach(note => {
				const item = dropdown.createDiv('notes-dropdown-item');
				item.setText(note);
				item.onclick = () => { nameInput.value = note; dropdown.style.display = 'none'; };
			});
			dropdown.style.display = 'block';
		};

		nameInput.addEventListener('input', () => { if (nameInput.value.length > 0) showDropdown(nameInput.value); else dropdown.style.display = 'none'; });
		nameInput.addEventListener('blur', () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
		nameInput.addEventListener('focus', () => { if (nameInput.value.length > 0) showDropdown(nameInput.value); });

		addBtn.onclick = () => {
			const n = nameInput.value.trim();
			if (!n) return;
			this.addCategory(n);
			nameInput.value = '';
			dropdown.style.display = 'none';
		};
		nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); if (e.key === 'Escape') dropdown.style.display = 'none'; });
	}

	renderCategoryBlock(container: HTMLElement, cat: Category) {
		const block = container.createDiv('category-block');
		block.setAttribute('data-category-id', cat.id);
		const catHdr = block.createDiv('category-header');
		if (cat.color) catHdr.style.borderBottomColor = (cat.color || (this.plugin.settings.themeColor || '#8a5cf5')) + '60';

		catHdr.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); this.closeActiveMenu(); this.showCategoryMenu(block, cat, e); };

		const nameEl = catHdr.createEl('span', { cls: 'category-name', text: (cat.pinned ? '⭐ ' : '') + cat.name });
		if (cat.color) nameEl.style.color = cat.color;

		const tagEl = catHdr.createEl('span', { cls: 'category-tag', text: catTag(cat.name, cat.customTag) });
		if (cat.color) { tagEl.style.color = cat.color; tagEl.style.background = cat.color + '18'; }

		const menuBtn = catHdr.createEl('button', { cls: 'cat-menu-btn', text: '⋯' });
		menuBtn.onclick = (e) => { e.stopPropagation(); this.closeActiveMenu(); this.showCategoryMenu(block, cat); };

		const active = cat.tasks.filter(t => !t.completed);
		const done = cat.tasks.filter(t => t.completed);
		if (active.length === 0 && done.length === 0) block.createEl('p', { cls: 'mytodo-empty', text: 'No tasks yet.' });
		active.forEach(t => this.renderTaskRow(block, t, 'category'));
		done.forEach(t => this.renderTaskRow(block, t, 'category'));

		// Collapsed add form with date picker
		const trigger = block.createDiv('add-task-trigger');
		trigger.setText('＋ Add task');
		const form = block.createDiv('add-task-form');
		const row1 = form.createDiv('add-task-form-row');
		const textInput = row1.createEl('input', { type: 'text', placeholder: 'Task name...', cls: 'task-input' });
		const row2 = form.createDiv('add-task-form-row');
		const hoursInput = row2.createEl('input', { type: 'number', placeholder: 'Hours', cls: 'hours-input' });
		hoursInput.min = '0.25'; hoursInput.step = '0.25';
		const dateInput = row2.createEl('input', { type: 'date', cls: 'date-input' });
		
		const todayBtn = row2.createEl('button', { text: 'Today', cls: 'date-shortcut-btn' });
		todayBtn.type = 'button';
		todayBtn.onclick = (e) => {
			e.preventDefault();
			dateInput.value = todayIso();
		};

		const tomorrowBtn = row2.createEl('button', { text: 'Tomorrow', cls: 'date-shortcut-btn' });
		tomorrowBtn.type = 'button';
		tomorrowBtn.onclick = (e) => {
			e.preventDefault();
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			dateInput.value = localIso(tomorrow);
		};

		const actions = form.createDiv('add-task-form-actions');
		const cancelBtn = actions.createEl('button', { text: 'Cancel', cls: 'cancel-task-btn' });
		const addBtn = actions.createEl('button', { text: 'Add', cls: 'add-task-btn' });

		trigger.onclick = () => { trigger.style.display = 'none'; form.addClass('visible'); textInput.focus(); };
		cancelBtn.onclick = () => { form.removeClass('visible'); trigger.style.display = ''; textInput.value = ''; hoursInput.value = ''; dateInput.value = ''; };
		const submit = () => {
			const text = textInput.value.trim();
			if (!text) return;
			// dateInput.value is already ISO format yyyy-mm-dd from native date picker
			this.addTask(cat.id, text, parseFloat(hoursInput.value) || 0.5, dateInput.value || undefined);
		};
		addBtn.onclick = submit;
		textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
	}

	showCategoryMenu(block: HTMLElement, cat: Category, e?: MouseEvent) {
		const menu = block.createDiv('cat-dropdown');
		if (e) {
			const rect = block.getBoundingClientRect();
			menu.style.top = (e.clientY - rect.top) + 'px';
			menu.style.left = (e.clientX - rect.left) + 'px';
			menu.style.right = 'auto';
		}
		this.activeMenu = menu;

		if (this.plugin.settings.sortOrder === 'manual') {
			const up = menu.createDiv('cat-dropdown-item'); up.setText('↑ Move up');
			up.onclick = () => { this.closeActiveMenu(); this.moveCategoryUp(cat.id); };
			const down = menu.createDiv('cat-dropdown-item'); down.setText('↓ Move down');
			down.onclick = () => { this.closeActiveMenu(); this.moveCategoryDown(cat.id); };
			menu.createDiv('cat-dropdown-divider');
		}

		const pin = menu.createDiv('cat-dropdown-item');
		pin.setText(cat.pinned ? 'Unpin category' : '⭐ Pin to top');
		pin.onclick = () => {
			this.closeActiveMenu();
			if (!cat.pinned && this.data.categories.filter(c => c.pinned).length >= 2) {
				new Notice('You can only pin up to 2 categories!');
				return;
			}
			cat.pinned = !cat.pinned;
			this.save(); this.render();
		};
		menu.createDiv('cat-dropdown-divider');

		const rename = menu.createDiv('cat-dropdown-item'); rename.setText('✎ Rename');
		rename.onclick = () => {
			this.closeActiveMenu();
			const nameEl = block.querySelector('.category-name') as HTMLElement;
			if (!nameEl) return;
			const input = document.createElement('input');
			input.className = 'cat-rename-input'; input.value = cat.name;
			nameEl.replaceWith(input); input.focus(); input.select();
			const confirm = () => { const n = input.value.trim(); if (n && n !== cat.name) this.renameCategory(cat.id, n); else this.render(); };
			input.addEventListener('blur', confirm);
			input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') this.render(); });
		};

		const createNote = menu.createDiv('cat-dropdown-item'); createNote.setText('📝 Create note');
		createNote.onclick = () => { this.closeActiveMenu(); this.createCategoryNote(cat); };

		const renameTag = menu.createDiv('cat-dropdown-item'); renameTag.setText('🏷 Rename tag');
		renameTag.onclick = () => {
			this.closeActiveMenu();
			const tagEl = block.querySelector('.category-tag') as HTMLElement;
			if (!tagEl) return;
			const input = document.createElement('input');
			input.className = 'cat-rename-input';
			input.style.cssText = 'font-size:11px;width:100%;';
			input.value = catTag(cat.name, cat.customTag);
			tagEl.replaceWith(input);
			input.focus(); input.select();
			const confirmTag = () => {
				const n = input.value.trim();
				if (n) this.renameTag(cat.id, n);
				else this.render();
			};
			input.addEventListener('blur', confirmTag);
			input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmTag(); if (e.key === 'Escape') this.render(); });
		};

		menu.createDiv('cat-dropdown-divider');

		const colorLabel = menu.createDiv('cat-dropdown-item no-hover'); colorLabel.setText('● Color');
		const swatches = menu.createDiv('color-swatches');
		CATEGORY_COLORS.forEach(c => {
			const sw = swatches.createDiv('color-swatch');
			sw.style.background = c.value || '#555555';
			if (cat.color === c.value) sw.addClass('active');
			sw.title = c.label; sw.onclick = () => { this.closeActiveMenu(); this.setCategoryColor(cat.id, c.value); };
		});

		menu.createDiv('cat-dropdown-divider');
		const del = menu.createDiv('cat-dropdown-item danger'); del.setText('✕ Delete');
		del.onclick = () => { this.closeActiveMenu(); if (confirm(`Delete "${cat.name}" and all its tasks?`)) this.deleteCategory(cat.id); };
	}

	renderTaskRow(container: HTMLElement, task: Task, context: 'daily' | 'weekly' | 'category') {
		const overdue = this.getOverdueStatus(task);
		const row = container.createDiv(`todo-task${task.completed ? ' completed' : ''}`);
		row.style.position = 'relative';
		row.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); this.closeActiveMenu(); this.showTaskMenu(row, task, context, e); };
		
		if (context === 'weekly' || context === 'daily') {
			row.ondblclick = () => {
				const catObj = this.data.categories.find(c => c.id === task.categoryId);
				if (!catObj) return;
				
				// Assumes contentEl is accessible or we can query within the document.
				// Since we are in the plugin view, querying the DOM is fine.
				const block = document.querySelector(`.category-block[data-category-id="${catObj.id}"]`);
				if (block) {
					block.scrollIntoView({ behavior: 'smooth', block: 'center' });
					block.classList.add('highlight-flash');
					setTimeout(() => block.classList.remove('highlight-flash'), 1200);
				}
			};
		}

		const left = row.createDiv('task-left');
		const checkbox = left.createDiv(`task-checkbox${task.completed ? ' checked' : ''}`);
		checkbox.onclick = () => this.toggleComplete(task.id);

		const body = left.createDiv('task-body');
		const textEl = body.createEl('span', { cls: 'task-text', text: task.text });
		if (!task.completed) {
			if (overdue === 'orange') textEl.addClass('overdue-orange');
			if (overdue === 'red') textEl.addClass('overdue-red');
		}

		const badges = body.createDiv('task-badges');
		badges.createEl('span', { cls: 'task-hours', text: `${task.estimatedHours}h` });
		if (task.dueDate) {
			const dueEl = badges.createEl('span', { cls: 'task-due', text: toDisplayDate(task.dueDate) });
			if (!task.completed) {
				if (overdue === 'orange') dueEl.addClass('overdue-orange');
				if (overdue === 'red') dueEl.addClass('overdue-red');
			}
		}
		// Show category tag in weekly and daily
		if (context === 'weekly' || context === 'daily') {
			// find customTag for this task's category
			const taskCat = this.data.categories.find(c => c.id === task.categoryId);
			const displayName = taskCat ? taskCat.name : task.category;
			badges.createEl('span', { cls: 'task-cat-tag', text: catTag(displayName, taskCat?.customTag) });
		}

		const actionsEl = row.createDiv('task-actions');

		if (context === 'category') {
			const wb = actionsEl.createEl('button', { cls: `task-action-btn${task.inWeekly ? ' active' : ''}`, text: task.inWeekly ? '−W' : '+W' });
			wb.title = task.inWeekly ? 'Remove from Weekly' : 'Add to Weekly';
			wb.onclick = () => this.toggleWeekly(task.id);
			if (task.inWeekly) {
				const db = actionsEl.createEl('button', { cls: `task-action-btn${task.inDaily ? ' active' : ''}`, text: task.inDaily ? '−D' : '+D' });
				db.title = task.inDaily ? 'Remove from Daily' : 'Add to Daily';
				db.onclick = () => this.toggleDaily(task.id);
			}
		}
		if (context === 'weekly') {
			const db = actionsEl.createEl('button', { cls: `task-action-btn${task.inDaily ? ' active' : ''}`, text: task.inDaily ? '−D' : '+D' });
			db.title = task.inDaily ? 'Remove from Daily' : 'Add to Daily';
			db.onclick = () => this.toggleDaily(task.id);
		}

		// 3-dot menu for all contexts
		const dotBtn = actionsEl.createEl('button', { cls: 'task-3dot-btn', text: '⋯' });
		dotBtn.onclick = (e) => { e.stopPropagation(); this.closeActiveMenu(); this.showTaskMenu(row, task, context, e); };
	}

	showTaskMenu(row: HTMLElement, task: Task, context: 'daily' | 'weekly' | 'category', e?: MouseEvent) {
		const menu = document.createElement('div');
		menu.className = 'task-dropdown';
		menu.style.position = 'fixed';
		menu.style.zIndex = '99999';
		if (e) {
			menu.style.top = Math.min(e.clientY, window.innerHeight - 160) + 'px';
			menu.style.left = Math.min(e.clientX, window.innerWidth - 160) + 'px';
		} else {
			const rect = row.getBoundingClientRect();
			menu.style.top = Math.min(rect.bottom, window.innerHeight - 160) + 'px';
			menu.style.left = Math.min(rect.right - 150, window.innerWidth - 160) + 'px';
		}
		document.body.appendChild(menu);
		this.activeMenu = menu;

		// Edit
		const editItem = menu.createDiv('task-dropdown-item'); editItem.setText('✎ Edit');
		editItem.onclick = () => {
			this.closeActiveMenu();
			this.showTaskEditForm(row, task);
		};

		// Mark complete / incomplete
		const completeItem = menu.createDiv('task-dropdown-item');
		completeItem.setText(task.completed ? '↩ Mark incomplete' : '✓ Mark complete');
		completeItem.onclick = () => { this.closeActiveMenu(); this.toggleComplete(task.id); };

		menu.createDiv('cat-dropdown-divider');

		// Delete
		const delItem = menu.createDiv('task-dropdown-item danger'); delItem.setText('✕ Delete');
		delItem.onclick = () => { this.closeActiveMenu(); this.deleteTask(task.id); };
	}

	showTaskEditForm(row: HTMLElement, task: Task) {
		if (row.nextElementSibling?.classList.contains('task-edit-form')) return; // Prevent duplication
		// Insert edit form right below the task row
		const form = document.createElement('div');
		form.className = 'task-edit-form';

		const r1 = form.createDiv('task-edit-row');
		const textInput = r1.createEl('input', { type: 'text', cls: 'edit-text' });
		textInput.value = task.text;

		const r2 = form.createDiv('task-edit-row');
		const hoursInput = r2.createEl('input', { type: 'number', cls: 'edit-hours' });
		hoursInput.value = String(task.estimatedHours); hoursInput.min = '0.25'; hoursInput.step = '0.25';
		hoursInput.placeholder = 'Hours';
		const dateInput = r2.createEl('input', { type: 'date', cls: 'edit-date' });
		if (task.dueDate) dateInput.value = task.dueDate;

		const actionsDiv = form.createDiv('task-edit-actions');
		const cancelBtn = actionsDiv.createEl('button', { text: 'Cancel', cls: 'cancel-task-btn' });
		const saveBtn = actionsDiv.createEl('button', { text: 'Save', cls: 'add-task-btn' });

		cancelBtn.onclick = () => { form.remove(); };
		saveBtn.onclick = () => {
			const newText = textInput.value.trim();
			if (!newText) return;
			this.editTask(task.id, newText, parseFloat(hoursInput.value) || task.estimatedHours, dateInput.value || undefined);
			form.remove();
		};
		textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); if (e.key === 'Escape') cancelBtn.click(); });

		row.insertAdjacentElement('afterend', form);
		textInput.focus(); textInput.select();
	}

	renderHeatmap(root: HTMLElement) {
		const section = root.createDiv('heatmap-section');
		section.createEl('h1', { cls: 'heatmap-section-title', text: 'Productivity Heatmap' });

		const logicalDayStr = getLogicalDay(this.plugin.settings.rolloverHour, this.plugin.settings.rolloverMinute);
		const [y, m, d] = logicalDayStr.split('-').map(Number);
		const today = new Date(y, m - 1, d);
		const year = today.getFullYear(); const month = today.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const monthName = today.toLocaleString('default', { month: 'long' });
		const todayDay = today.getDate();

		const monthLabel = section.createEl('p');
		monthLabel.setText(`${monthName} ${year}`);
		monthLabel.style.cssText = 'font-size:11px;color:var(--text-muted);margin:0 0 4px 0;';

		const grid = section.createDiv('heatmap-grid');
		for (let day = 1; day <= daysInMonth; day++) {
			const d = new Date(year, month, day);
			const dateStr = localIso(d);
			const scoreEntry = this.data.scores.find(s => s.date === dateStr);
			const score = scoreEntry?.score ?? 0;
			const isFuture = day > todayDay;

			const cell = grid.createDiv('heatmap-cell');
			cell.style.background = isFuture ? 'var(--background-modifier-border)' : this.scoreToColor(score);
			if (isFuture) cell.style.opacity = '0.3';
			if (day === todayDay) cell.style.outline = `2px solid ${this.plugin.settings.themeColor || '#8a5cf5'}`;
			cell.createDiv('heatmap-tooltip').setText(scoreEntry ? `${toDisplayDate(dateStr)}: ${score}%` : `${toDisplayDate(dateStr)}: no tasks`);
		}

		const legend = section.createDiv('heatmap-legend');
		legend.createEl('span', { text: 'Less' });
		[0, 25, 50, 75, 100].forEach(v => { const lc = legend.createDiv('legend-cell'); lc.style.background = this.scoreToColor(v); });
		legend.createEl('span', { text: 'More' });
	}

	scoreToColor(score: number): string {
		if (score === 0) return 'var(--background-secondary)';
		const hex = this.plugin.settings.themeColor || '#8a5cf5';
		const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${(0.15 + (score / 100) * 0.85).toFixed(2)})`;
	}
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default class MyTodoPlugin extends Plugin {
	data: TodoData = DEFAULT_DATA;
	settings: TodoSettings = DEFAULT_SETTINGS;
	private _savePromise: Promise<void> | null = null;
	private _saveTimeout: number | null = null;
	private _pendingSaveData: any = null;
	private _pendingSaveResolvers: (() => void)[] = [];

	async onload() {
		const saved = await this.loadData();
		this.data = { ...DEFAULT_DATA, ...saved, categories: saved?.categories ?? DEFAULT_DATA.categories, scores: saved?.scores ?? [], lastRolloverDate: saved?.lastRolloverDate ?? '' };
		
		// Run categoryId migration
		for (const cat of this.data.categories) {
			for (const task of cat.tasks) {
				if (!task.categoryId) {
					task.categoryId = cat.id;
				}
			}
		}

		this.settings = { ...DEFAULT_SETTINGS, ...(saved?.settings ?? {}) };
		if (!this.settings.themeColor) this.settings.themeColor = '#8a5cf5';

		this.registerView(VIEW_TYPE, (leaf) => new TodoView(leaf, this));
		this.addRibbonIcon('check-square', 'My Todo', () => this.activateView());
		this.addCommand({ id: 'open-my-todo', name: 'Open My Todo', callback: () => this.activateView() });
		this.addSettingTab(new TodoSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(v => {
					const view = v.view as TodoView;
					if (view?.render) { view.data = this.data; view.render(); }
				});
			})
		);

		// Periodic rollover check — guarantees state freshness when Obsidian stays open overnight
		this.registerInterval(window.setInterval(() => {
			this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(v => {
				const view = v.view as TodoView;
				if (view?.runDayRollover) view.runDayRollover();
			});
		}, 60_000));
	}

	saveDataQueued(data: any): Promise<void> {
		return new Promise<void>((resolve) => {
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

				const saveCall = async () => {
					await this.saveData(dataToSave);
					resolvers.forEach(r => r());
				};

				if (!this._savePromise) {
					this._savePromise = saveCall();
				} else {
					this._savePromise = this._savePromise.then(saveCall).catch(saveCall);
				}
			}, 1000);
		});
	}

	async saveSettings() { await this.saveDataQueued({ ...this.data, settings: this.settings }); }
	async onunload() {
		if (this._saveTimeout) {
			window.clearTimeout(this._saveTimeout);
			this._saveTimeout = null;
		}
		if (this._pendingSaveData) {
			await this.saveData(this._pendingSaveData);
			this._pendingSaveResolvers.forEach(r => r());
			this._pendingSaveResolvers = [];
			this._pendingSaveData = null;
		}
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
}