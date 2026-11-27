const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DATA = {
  settings: {
    userName: 'Señor',
    geminiApiKey: '',
    geminiModel: 'gemini-3.8-flash',
    voiceEnabled: true,
    voiceRate: 1.05,
    voiceName: '',
    alwaysOnTopWidget: true,
  },
  tasks: [
    {
      id: 'task-welcome-1',
      title: 'Configurar clave API de Gemini en Ajustes',
      description: 'Obtén una clave gratuita en Google AI Studio para activar el cerebro de J.A.R.V.I.S.',
      priority: 'alta',
      status: 'pendiente',
      dueDate: new Date().toISOString().slice(0, 10),
      projectId: 'proj-welcome-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-welcome-2',
      title: 'Conectar cuenta de Google Workspace (Gmail, Calendar, Drive)',
      description: 'Carga tu archivo credentials.json en la pestaña Configuración.',
      priority: 'media',
      status: 'pendiente',
      dueDate: new Date().toISOString().slice(0, 10),
      projectId: 'proj-welcome-1',
      createdAt: new Date().toISOString(),
    },
  ],
  projects: [
    {
      id: 'proj-welcome-1',
      name: 'Puesta en marcha de J.A.R.V.I.S.',
      description: 'Configuración inicial de tu asistente personal de escritorio estilo Iron Man.',
      status: 'activo',
      progress: 33,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      color: '#00e5ff',
      milestones: [
        { id: 'ms-1', title: 'Instalar interfaz HUD e icono flotante de Iron Man', done: true },
        { id: 'ms-2', title: 'Activar API de Gemini y comandos de voz', done: false },
        { id: 'ms-3', title: 'Sincronizar Gmail, Calendar, Drive, Docs y Sheets', done: false },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
  chatHistory: [
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: 'Sistemas en línea. Soy **J.A.R.V.I.S.**, su asistente virtual personal. Puedo gestionar sus tareas pendientes, supervisar el avance de sus proyectos y conectarme a su Google Workspace (Gmail, Calendar, Drive, Docs y Sheets). ¿En qué trabajaremos hoy?',
      timestamp: new Date().toISOString(),
      toolsUsed: [],
    },
  ],
};

class Store {
  constructor(userDataPath) {
    this.dataPath = path.join(userDataPath, 'jarvis-data.json');
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const raw = fs.readFileSync(this.dataPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const mergedSettings = { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) };
        if (mergedSettings.geminiModel === 'gemini-2.5-flash' || mergedSettings.geminiModel === 'gemini-2.5-pro') {
          mergedSettings.geminiModel = 'gemini-3.8-flash';
        }
        return {
          settings: mergedSettings,
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_DATA.tasks,
          projects: Array.isArray(parsed.projects) ? parsed.projects : DEFAULT_DATA.projects,
          chatHistory: Array.isArray(parsed.chatHistory) ? parsed.chatHistory : DEFAULT_DATA.chatHistory,
        };
      }
    } catch (err) {
      console.error('[Store] Error loading data:', err);
    }
    const initial = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this._save(initial);
    return initial;
  }

  _save(dataToSave = this.data) {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempPath = `${this.dataPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dataPath);
    } catch (err) {
      console.error('[Store] Error saving data:', err);
    }
  }

  // Settings
  getSettings() {
    return { ...this.data.settings };
  }

  updateSettings(partial) {
    this.data.settings = { ...this.data.settings, ...partial };
    this._save();
    return this.getSettings();
  }

  // Tasks
  getTasks(filter = {}) {
    let tasks = [...this.data.tasks];
    if (filter.status && filter.status !== 'todas') {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter.priority && filter.priority !== 'todas') {
      tasks = tasks.filter((t) => t.priority === filter.priority);
    }
    if (filter.projectId) {
      tasks = tasks.filter((t) => t.projectId === filter.projectId);
    }
    return tasks;
  }

  createTask(input) {
    const task = {
      id: `task-${crypto.randomUUID().slice(0, 8)}`,
      title: String(input.title || 'Nueva tarea').trim(),
      description: String(input.description || '').trim(),
      priority: ['alta', 'media', 'baja'].includes(input.priority) ? input.priority : 'media',
      status: ['pendiente', 'en_progreso', 'completada'].includes(input.status) ? input.status : 'pendiente',
      dueDate: input.dueDate || '',
      projectId: input.projectId || '',
      attachments: Array.isArray(input.attachments) ? input.attachments : [],
      createdAt: new Date().toISOString(),
    };
    this.data.tasks.unshift(task);
    this._save();
    return task;
  }

  updateTask(id, updates) {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates, id };
    this._save();
    return this.data.tasks[idx];
  }

  deleteTask(id) {
    const before = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    this._save();
    return this.data.tasks.length < before;
  }

  // Projects
  getProjects() {
    return this.data.projects.map((p) => ({
      ...p,
      priority: ['alta', 'media', 'baja'].includes(p.priority) ? p.priority : 'media',
    }));
  }

  _recalcProgress(project) {
    if (Array.isArray(project.milestones) && project.milestones.length > 0) {
      const done = project.milestones.filter((m) => m.done).length;
      project.progress = Math.round((done / project.milestones.length) * 100);
    }
    return project;
  }

  createProject(input) {
    const milestones = Array.isArray(input.milestones)
      ? input.milestones.map((m) =>
          typeof m === 'string'
            ? { id: `ms-${crypto.randomUUID().slice(0, 6)}`, title: m, done: false }
            : { id: m.id || `ms-${crypto.randomUUID().slice(0, 6)}`, title: m.title, done: !!m.done }
        )
      : [];

    const project = {
      id: `proj-${crypto.randomUUID().slice(0, 8)}`,
      name: String(input.name || 'Nuevo proyecto').trim(),
      description: String(input.description || '').trim(),
      priority: ['alta', 'media', 'baja'].includes(input.priority) ? input.priority : 'media',
      status: ['activo', 'pausado', 'completado'].includes(input.status) ? input.status : 'activo',
      progress: typeof input.progress === 'number' ? Math.min(100, Math.max(0, input.progress)) : 0,
      deadline: input.deadline || '',
      color: input.color || '#00e5ff',
      milestones,
      createdAt: new Date().toISOString(),
    };
    this._recalcProgress(project);
    this.data.projects.unshift(project);
    this._save();
    return project;
  }

  updateProject(id, updates) {
    const idx = this.data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const updated = { ...this.data.projects[idx], ...updates, id };
    if (updates.milestones) {
      this._recalcProgress(updated);
    }
    this.data.projects[idx] = updated;
    this._save();
    return updated;
  }

  addMilestone(projectId, title) {
    const project = this.data.projects.find((p) => p.id === projectId);
    if (!project) return null;
    project.milestones = project.milestones || [];
    project.milestones.push({
      id: `ms-${crypto.randomUUID().slice(0, 6)}`,
      title: String(title || '').trim(),
      done: false,
      attachments: [],
    });
    this._recalcProgress(project);
    this._save();
    return project;
  }

  toggleMilestone(projectId, milestoneId) {
    const project = this.data.projects.find((p) => p.id === projectId);
    if (!project) return null;
    const ms = (project.milestones || []).find((m) => m.id === milestoneId);
    if (!ms) return null;
    ms.done = !ms.done;
    this._recalcProgress(project);
    this._save();
    return project;
  }

  deleteMilestone(projectId, milestoneId) {
    const project = this.data.projects.find((p) => p.id === projectId);
    if (!project) return null;
    project.milestones = (project.milestones || []).filter((m) => m.id !== milestoneId);
    this._recalcProgress(project);
    this._save();
    return project;
  }

  deleteProject(id) {
    const before = this.data.projects.length;
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    this._save();
    return this.data.projects.length < before;
  }

  // Chat history
  getChatHistory() {
    return [...this.data.chatHistory];
  }

  appendChatMessage(msg) {
    const entry = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      role: msg.role,
      text: msg.text,
      toolsUsed: msg.toolsUsed || [],
      timestamp: new Date().toISOString(),
    };
    this.data.chatHistory.push(entry);
    if (this.data.chatHistory.length > 80) {
      this.data.chatHistory = this.data.chatHistory.slice(-80);
    }
    this._save();
    return entry;
  }

  clearChatHistory() {
    this.data.chatHistory = [DEFAULT_DATA.chatHistory[0]];
    this._save();
    return this.getChatHistory();
  }
}

module.exports = { Store };
