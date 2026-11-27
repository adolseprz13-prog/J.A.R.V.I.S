// Standalone browser / Android Capacitor bridge so J.A.R.V.I.S. works natively on phones
// Each device stores its own private data in localStorage independently.

const STORAGE_KEY = 'jarvis_mobile_data_v1';
const APP_VERSION = '1.0.0';
const GITHUB_REPO = 'adolseprz13-prog/J.A.R.V.I.S';

const DEFAULT_MOBILE_DATA = {
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
      id: 'task-mobile-1',
      title: 'Configurar mi clave API de Gemini en Ajustes',
      description: 'Obtén tu clave gratuita en Google AI Studio para conversar con J.A.R.V.I.S.',
      priority: 'media',
      status: 'pendiente',
      dueDate: new Date().toISOString().slice(0, 10),
      projectId: 'proj-mobile-1',
      createdAt: new Date().toISOString(),
    },
  ],
  projects: [
    {
      id: 'proj-mobile-1',
      name: 'Mi Espacio J.A.R.V.I.S.',
      description: 'Tus proyectos y tareas se guardan de forma privada en este dispositivo.',
      priority: 'media',
      status: 'activo',
      progress: 50,
      deadline: '',
      color: '#1f7a4c',
      milestones: [
        { id: 'ms-m1', title: 'Instalar J.A.R.V.I.S. en Android', done: true },
        { id: 'ms-m2', title: 'Crear mis primeros proyectos y tareas', done: false },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
  chatHistory: [
    {
      id: 'msg-mobile-welcome',
      role: 'assistant',
      text: '¡Hola! Soy **J.A.R.V.I.S.** en tu dispositivo móvil. Toda tu información se guarda localmente de forma privada aquí, y puedes buscar actualizaciones directamente desde GitHub en **Configuración**.',
      timestamp: new Date().toISOString(),
      toolsUsed: [],
    },
  ],
};

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        settings: { ...DEFAULT_MOBILE_DATA.settings, ...(parsed.settings || {}) },
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_MOBILE_DATA.tasks,
        projects: Array.isArray(parsed.projects) ? parsed.projects : DEFAULT_MOBILE_DATA.projects,
        chatHistory: Array.isArray(parsed.chatHistory) ? parsed.chatHistory : DEFAULT_MOBILE_DATA.chatHistory,
      };
    }
  } catch (err) {
    console.warn('[WebBridge] Error loading data:', err);
  }
  const initial = JSON.parse(JSON.stringify(DEFAULT_MOBILE_DATA));
  saveData(initial);
  return initial;
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[WebBridge] Error saving data:', err);
  }
}

function recalcProgress(project) {
  if (Array.isArray(project.milestones) && project.milestones.length > 0) {
    const done = project.milestones.filter((m) => m.done).length;
    project.progress = Math.round((done / project.milestones.length) * 100);
  }
  return project;
}

const GEMINI_TOOLS = [
  {
    name: 'list_tasks',
    description: 'Lista las tareas pendientes, en progreso o completadas.',
    parameters: { type: 'OBJECT', properties: { status: { type: 'STRING' } } },
  },
  {
    name: 'create_task',
    description: 'Crea una nueva tarea pendiente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        description: { type: 'STRING' },
        priority: { type: 'STRING' },
        dueDate: { type: 'STRING' },
        projectId: { type: 'STRING' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Actualiza el estado, prioridad o título de una tarea.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING' },
        title: { type: 'STRING' },
        status: { type: 'STRING' },
        priority: { type: 'STRING' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_projects',
    description: 'Lista todos los proyectos con su avance, prioridad e hitos.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'create_project',
    description: 'Crea un nuevo proyecto con hitos iniciales.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING' },
        description: { type: 'STRING' },
        priority: { type: 'STRING' },
        milestones: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['name'],
    },
  },
];

async function callGeminiRest(apiKey, primaryModel, body) {
  const models = [
    primaryModel || 'gemini-3.8-flash',
    primaryModel === 'gemini-3.8-flash' ? 'gemini-3.8-flash-lite' : 'gemini-3.8-flash',
    'gemini-3.8-pro',
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  let lastErr;
  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (res.ok) return json;
    lastErr = new Error(json?.error?.message || `HTTP ${res.status}`);
    if (res.status === 503 || res.status === 429 || res.status === 404) {
      continue;
    }
    throw lastErr;
  }
  throw lastErr || new Error('Error al conectar con Gemini API');
}

export async function checkGithubUpdate() {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    if (res.status === 404) {
      return {
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        hasUpdate: false,
        downloadUrl: `https://github.com/${GITHUB_REPO}/releases`,
        releaseNotes: 'Aún no se ha publicado una release de APK en GitHub.',
      };
    }
    throw new Error(`No se pudo consultar GitHub (HTTP ${res.status})`);
  }
  const rel = await res.json();
  const apkAsset = (rel.assets || []).find((a) => a.name?.toLowerCase().endsWith('.apk'));
  const latestTag = rel.tag_name || rel.name || APP_VERSION;
  const installedTag = localStorage.getItem('jarvis_installed_tag') || APP_VERSION;
  return {
    currentVersion: installedTag,
    latestVersion: latestTag,
    hasUpdate: latestTag !== installedTag,
    downloadUrl: apkAsset?.browser_download_url || rel.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
    releaseNotes: rel.body || '',
    publishedAt: rel.published_at || '',
  };
}

export function installWebBridgeIfNeeded() {
  if (window.jarvis) {
    // Running inside Electron desktop — attach GitHub updater helper
    window.jarvis.isMobile = false;
    window.jarvis.checkGithubUpdate = checkGithubUpdate;
    return;
  }

  let data = loadData();
  const dataListeners = new Set();
  const notifyData = () => dataListeners.forEach((cb) => cb());

  const executeTool = (name, args = {}) => {
    if (name === 'list_tasks') {
      return args.status && args.status !== 'todas'
        ? data.tasks.filter((t) => t.status === args.status)
        : data.tasks;
    }
    if (name === 'create_task') {
      const task = {
        id: uid('task'),
        title: String(args.title || 'Nueva tarea').trim(),
        description: String(args.description || '').trim(),
        priority: ['alta', 'media', 'baja'].includes(args.priority) ? args.priority : 'media',
        status: 'pendiente',
        dueDate: args.dueDate || '',
        projectId: args.projectId || '',
        createdAt: new Date().toISOString(),
      };
      data.tasks.unshift(task);
      saveData(data);
      notifyData();
      return task;
    }
    if (name === 'update_task') {
      const idx = data.tasks.findIndex((t) => t.id === args.id);
      if (idx === -1) return { error: 'Tarea no encontrada' };
      data.tasks[idx] = { ...data.tasks[idx], ...args, id: args.id };
      saveData(data);
      notifyData();
      return data.tasks[idx];
    }
    if (name === 'list_projects') {
      return data.projects;
    }
    if (name === 'create_project') {
      const milestones = Array.isArray(args.milestones)
        ? args.milestones.map((m) => ({ id: uid('ms'), title: String(m), done: false }))
        : [];
      const proj = recalcProgress({
        id: uid('proj'),
        name: String(args.name || 'Nuevo proyecto').trim(),
        description: String(args.description || '').trim(),
        priority: ['alta', 'media', 'baja'].includes(args.priority) ? args.priority : 'media',
        status: 'activo',
        progress: 0,
        deadline: '',
        color: '#1f7a4c',
        milestones,
        createdAt: new Date().toISOString(),
      });
      data.projects.unshift(proj);
      saveData(data);
      notifyData();
      return proj;
    }
    return { error: `Herramienta no disponible en móvil: ${name}` };
  };

  window.jarvis = {
    isMobile: true,
    checkGithubUpdate,
    window: {
      toggleHud: async () => {},
      openHudVoice: async () => {},
      minimizeHud: async () => {},
      closeHud: async () => {},
      moveWidget: () => {},
      setWidgetIgnoreMouse: () => {},
      showWidgetMenu: () => {},
      openExternal: async (url) => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      },
    },
    onTriggerVoice: () => () => {},
    onDataUpdated: (cb) => {
      dataListeners.add(cb);
      return () => dataListeners.delete(cb);
    },
    onCursorMove: () => () => {},
    onHudState: () => () => {},
    settings: {
      get: async () => ({ ...data.settings }),
      update: async (partial) => {
        data.settings = { ...data.settings, ...partial };
        saveData(data);
        return { ...data.settings };
      },
      testGemini: async (apiKey, model) => {
        if (!apiKey || !apiKey.trim()) throw new Error('Ingresa una clave de API de Gemini.');
        const res = await callGeminiRest(apiKey.trim(), model, {
          contents: [{ role: 'user', parts: [{ text: 'Responde solo con: "Núcleo J.A.R.V.I.S. móvil en línea."' }] }],
        });
        const reply = res?.candidates?.[0]?.content?.parts?.[0]?.text || 'Núcleo J.A.R.V.I.S. en línea.';
        return { ok: true, reply };
      },
    },
    tasks: {
      list: async () => [...data.tasks],
      create: async (input) => {
        const task = {
          id: uid('task'),
          title: String(input.title || 'Nueva tarea').trim(),
          description: String(input.description || '').trim(),
          priority: ['alta', 'media', 'baja'].includes(input.priority) ? input.priority : 'media',
          status: ['pendiente', 'en_progreso', 'completada'].includes(input.status) ? input.status : 'pendiente',
          dueDate: input.dueDate || '',
          projectId: input.projectId || '',
          createdAt: new Date().toISOString(),
        };
        data.tasks.unshift(task);
        saveData(data);
        return task;
      },
      update: async (id, updates) => {
        const idx = data.tasks.findIndex((t) => t.id === id);
        if (idx === -1) return null;
        data.tasks[idx] = { ...data.tasks[idx], ...updates, id };
        saveData(data);
        return data.tasks[idx];
      },
      delete: async (id) => {
        data.tasks = data.tasks.filter((t) => t.id !== id);
        saveData(data);
        return true;
      },
    },
    projects: {
      list: async () =>
        data.projects.map((p) => ({ ...p, priority: ['alta', 'media', 'baja'].includes(p.priority) ? p.priority : 'media' })),
      create: async (input) => {
        const milestones = Array.isArray(input.milestones)
          ? input.milestones.map((m) =>
              typeof m === 'string' ? { id: uid('ms'), title: m, done: false } : { id: m.id || uid('ms'), title: m.title, done: !!m.done }
            )
          : [];
        const proj = recalcProgress({
          id: uid('proj'),
          name: String(input.name || 'Nuevo proyecto').trim(),
          description: String(input.description || '').trim(),
          priority: ['alta', 'media', 'baja'].includes(input.priority) ? input.priority : 'media',
          status: ['activo', 'pausado', 'completado'].includes(input.status) ? input.status : 'activo',
          progress: typeof input.progress === 'number' ? input.progress : 0,
          deadline: input.deadline || '',
          color: '#1f7a4c',
          milestones,
          createdAt: new Date().toISOString(),
        });
        data.projects.unshift(proj);
        saveData(data);
        return proj;
      },
      update: async (id, updates) => {
        const idx = data.projects.findIndex((p) => p.id === id);
        if (idx === -1) return null;
        const updated = { ...data.projects[idx], ...updates, id };
        if (updates.milestones) recalcProgress(updated);
        data.projects[idx] = updated;
        saveData(data);
        return updated;
      },
      addMilestone: async (projectId, title) => {
        const p = data.projects.find((x) => x.id === projectId);
        if (!p) return null;
        p.milestones = p.milestones || [];
        p.milestones.push({ id: uid('ms'), title: String(title || '').trim(), done: false });
        recalcProgress(p);
        saveData(data);
        return p;
      },
      toggleMilestone: async (projectId, milestoneId) => {
        const p = data.projects.find((x) => x.id === projectId);
        const ms = p?.milestones?.find((m) => m.id === milestoneId);
        if (!ms) return null;
        ms.done = !ms.done;
        recalcProgress(p);
        saveData(data);
        return p;
      },
      deleteMilestone: async (projectId, milestoneId) => {
        const p = data.projects.find((x) => x.id === projectId);
        if (!p) return null;
        p.milestones = (p.milestones || []).filter((m) => m.id !== milestoneId);
        recalcProgress(p);
        saveData(data);
        return p;
      },
      delete: async (id) => {
        data.projects = data.projects.filter((p) => p.id !== id);
        saveData(data);
        return true;
      },
    },
    chat: {
      history: async () => [...data.chatHistory],
      clear: async () => {
        data.chatHistory = [DEFAULT_MOBILE_DATA.chatHistory[0]];
        saveData(data);
        return [...data.chatHistory];
      },
      send: async (text) => {
        data.chatHistory.push({ id: uid('msg'), role: 'user', text, timestamp: new Date().toISOString(), toolsUsed: [] });
        const apiKey = (data.settings.geminiApiKey || '').trim();
        const toolsUsed = [];
        let replyText = '';

        if (!apiKey) {
          const match = text.match(/^(?:crea|agrega|añade|nueva)\s+tarea\s*:?\s*(.+)/i);
          if (match) {
            const task = executeTool('create_task', { title: match[1].trim() });
            toolsUsed.push('create_task');
            replyText = `He creado la tarea **"${task.title}"** en tu dispositivo.`;
          } else {
            replyText = `Modo local activo. Agrega tu clave gratuita de **Gemini API** en **Configuración** para conversar con inteligencia artificial completa, o escribe \`crea tarea: ...\` para agregar tareas rápidas.`;
          }
        } else {
          try {
            const contents = data.chatHistory.slice(-12).map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.text }],
            }));
            const systemInstruction = {
              parts: [
                {
                  text: `Eres J.A.R.V.I.S., asistente virtual personal de ${data.settings.userName || 'Señor'} en Android. Hablas en español, eres amable, ágil y preciso. Usa las herramientas disponibles para gestionar tareas y proyectos cuando te lo pidan.`,
                },
              ],
            };

            for (let turn = 0; turn < 4; turn++) {
              const res = await callGeminiRest(apiKey, data.settings.geminiModel, {
                systemInstruction,
                contents,
                tools: [{ functionDeclarations: GEMINI_TOOLS }],
              });
              const cand = res?.candidates?.[0]?.content;
              const calls = (cand?.parts || []).filter((p) => p.functionCall);
              if (calls.length > 0) {
                contents.push(cand);
                const responses = calls.map((c) => {
                  toolsUsed.push(c.functionCall.name);
                  const result = executeTool(c.functionCall.name, c.functionCall.args || {});
                  return { functionResponse: { name: c.functionCall.name, response: { result } } };
                });
                contents.push({ role: 'user', parts: responses });
              } else {
                replyText = (cand?.parts || []).map((p) => p.text || '').join('') || 'Listo.';
                break;
              }
            }
          } catch (err) {
            replyText = `Error al conectar con Gemini: **${err.message || err}**`;
          }
        }

        const msg = {
          id: uid('msg'),
          role: 'assistant',
          text: replyText,
          toolsUsed: [...new Set(toolsUsed)],
          timestamp: new Date().toISOString(),
        };
        data.chatHistory.push(msg);
        saveData(data);
        return { message: msg, dataChanged: toolsUsed.length > 0 };
      },
    },
    google: {
      status: async () => ({ hasCredentials: false, isConnected: false, userEmail: '', mobileMode: true }),
      saveCredentials: async () => {
        throw new Error('La vinculación OAuth local de Google Workspace está disponible en la versión de PC.');
      },
      pickCredentialsFile: async () => null,
      connect: async () => {
        throw new Error('Usa los accesos directos de Gmail, Calendar y Drive en la pestaña Workspace en móvil.');
      },
      disconnect: async () => ({ hasCredentials: false, isConnected: false, userEmail: '' }),
    },
  };
}
