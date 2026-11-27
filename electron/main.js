const path = require('path');
const fs = require('fs');
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  screen,
  globalShortcut,
  shell,
  dialog,
  nativeImage,
} = require('electron');

const { Store } = require('./services/store');
const { GoogleWorkspaceService } = require('./services/googleWorkspace');
const { GeminiService } = require('./services/geminiService');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production' && !fs.existsSync(path.join(__dirname, '../dist/index.html'));

let widgetWin = null;
let hudWin = null;
let tray = null;
let isQuitting = false;

let store;
let googleWorkspace;
let geminiService;

function getIconPath() {
  const candidates = [
    path.join(__dirname, '../assets/jarvis-icon.png'),
    path.join(__dirname, '../public/jarvis-icon.png'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || '';
}

function getRendererUrl(mode) {
  const devServer = process.env.VITE_DEV_SERVER_URL || (isDev ? 'http://localhost:5173' : null);
  if (devServer) {
    return `${devServer}/?mode=${mode}`;
  }
  const indexPath = path.join(__dirname, '../dist/index.html');
  return `file://${indexPath.replace(/\\/g, '/')}?mode=${mode}`;
}

function createWidgetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winW = 104;
  const winH = 112;

  widgetWin = new BrowserWindow({
    width: winW,
    height: winH,
    x: width - winW - 28,
    y: height - winH - 28,
    title: '',
    frame: false,
    thickFrame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    focusable: false,
    icon: getIconPath() || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  widgetWin.setAlwaysOnTop(true, 'floating');
  widgetWin.setIgnoreMouseEvents(true, { forward: true });
  widgetWin.loadURL(getRendererUrl('widget'));

  // Lightweight cursor tracker so the coffee bean's eyes follow the mouse across the desktop
  let lastCx = -1;
  let lastCy = -1;
  const cursorTimer = setInterval(() => {
    if (!widgetWin || widgetWin.isDestroyed()) return;
    const pt = screen.getCursorScreenPoint();
    if (pt.x === lastCx && pt.y === lastCy) return;
    lastCx = pt.x;
    lastCy = pt.y;
    const bounds = widgetWin.getBounds();
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, dist / 240);
    const rx = (dx / dist) * scale;
    const ry = (dy / dist) * scale;
    widgetWin.webContents.send('jarvis:cursor', { rx, ry });
  }, 55);

  widgetWin.on('closed', () => {
    clearInterval(cursorTimer);
    widgetWin = null;
  });
}

function createHudWindow() {
  hudWin = new BrowserWindow({
    width: 1060,
    height: 700,
    minWidth: 820,
    minHeight: 560,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#f8f6f2',
    icon: getIconPath() || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  hudWin.loadURL(getRendererUrl('hud'));

  hudWin.on('show', () => {
    widgetWin?.webContents?.send('jarvis:hud-state', true);
  });

  hudWin.on('hide', () => {
    widgetWin?.webContents?.send('jarvis:hud-state', false);
  });

  hudWin.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      hudWin.hide();
    }
  });
}

function toggleHud(triggerVoice = false) {
  if (!hudWin) createHudWindow();
  if (hudWin.isVisible() && !triggerVoice) {
    hudWin.hide();
    return;
  }
  if (!hudWin.isVisible()) {
    hudWin.show();
  }
  if (hudWin.isMinimized()) {
    hudWin.restore();
  }
  hudWin.focus();
  if (triggerVoice) {
    hudWin.webContents.send('jarvis:trigger-voice');
  }
}

function createTray() {
  const iconPath = getIconPath();
  let trayIcon = nativeImage.createEmpty();
  if (iconPath) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  }
  tray = new Tray(trayIcon);
  tray.setToolTip('J.A.R.V.I.S. — Asistente Virtual');

  const buildMenu = () =>
    Menu.buildFromTemplate([
      { label: 'Abrir Panel J.A.R.V.I.S. (Ctrl+Shift+J)', click: () => toggleHud(false) },
      { label: 'Comando de Voz Rápido', click: () => toggleHud(true) },
      { type: 'separator' },
      {
        label: widgetWin && widgetWin.isVisible() ? 'Ocultar Icono de J.A.R.V.I.S.' : 'Mostrar Icono de J.A.R.V.I.S.',
        click: () => {
          if (!widgetWin) createWidgetWindow();
          else if (widgetWin.isVisible()) widgetWin.hide();
          else widgetWin.show();
        },
      },
      { type: 'separator' },
      {
        label: 'Salir de J.A.R.V.I.S.',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

  tray.on('click', () => toggleHud(false));
  tray.on('right-click', () => tray.popUpContextMenu(buildMenu()));
}

function registerIpc() {
  // Window controls
  ipcMain.handle('window:toggle-hud', () => toggleHud(false));
  ipcMain.handle('window:open-hud-voice', () => toggleHud(true));
  ipcMain.handle('window:minimize-hud', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || hudWin;
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });
  ipcMain.handle('window:close-hud', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || hudWin;
    if (win && !win.isDestroyed()) {
      win.hide();
    }
  });
  ipcMain.handle('window:open-external', (_, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      return shell.openExternal(url);
    }
  });

  ipcMain.on('window:move-widget', (_, { dx, dy }) => {
    if (!widgetWin || widgetWin.isDestroyed()) return;
    const b = widgetWin.getBounds();
    widgetWin.setBounds({ x: Math.round(b.x + dx), y: Math.round(b.y + dy), width: b.width, height: b.height }, false);
  });

  ipcMain.on('window:widget-ignore-mouse', (_, ignore) => {
    if (!widgetWin) return;
    widgetWin.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
  });

  ipcMain.on('window:show-widget-menu', () => {
    if (!widgetWin) return;
    const menu = Menu.buildFromTemplate([
      { label: 'Abrir Panel J.A.R.V.I.S.', click: () => toggleHud(false) },
      { label: 'Hablar con J.A.R.V.I.S.', click: () => toggleHud(true) },
      { type: 'separator' },
      { label: 'Ocultar Icono Flotante', click: () => widgetWin.hide() },
      {
        label: 'Salir',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    menu.popup({ window: widgetWin });
  });

  // Settings
  ipcMain.handle('settings:get', () => store.getSettings());
  ipcMain.handle('settings:update', (_, partial) => {
    const updated = store.updateSettings(partial);
    if (widgetWin && typeof partial.alwaysOnTopWidget === 'boolean') {
      widgetWin.setAlwaysOnTop(partial.alwaysOnTopWidget, 'floating');
    }
    return updated;
  });
  ipcMain.handle('settings:test-gemini', (_, { apiKey, model }) => geminiService.testConnection(apiKey, model));

  // Tasks
  ipcMain.handle('tasks:list', (_, filter) => store.getTasks(filter));
  ipcMain.handle('tasks:create', (_, input) => store.createTask(input));
  ipcMain.handle('tasks:update', (_, { id, updates }) => store.updateTask(id, updates));
  ipcMain.handle('tasks:delete', (_, id) => store.deleteTask(id));

  // Projects
  ipcMain.handle('projects:list', () => store.getProjects());
  ipcMain.handle('projects:create', (_, input) => store.createProject(input));
  ipcMain.handle('projects:update', (_, { id, updates }) => store.updateProject(id, updates));
  ipcMain.handle('projects:add-milestone', (_, { projectId, title }) => store.addMilestone(projectId, title));
  ipcMain.handle('projects:toggle-milestone', (_, { projectId, milestoneId }) =>
    store.toggleMilestone(projectId, milestoneId)
  );
  ipcMain.handle('projects:delete-milestone', (_, { projectId, milestoneId }) =>
    store.deleteMilestone(projectId, milestoneId)
  );
  ipcMain.handle('projects:delete', (_, id) => store.deleteProject(id));

  // Chat
  ipcMain.handle('chat:history', () => store.getChatHistory());
  ipcMain.handle('chat:clear', () => store.clearChatHistory());
  ipcMain.handle('chat:send', async (_, text) => {
    const res = await geminiService.chat(text);
    if (res.dataChanged && hudWin) {
      hudWin.webContents.send('jarvis:data-updated');
    }
    return res;
  });

  // Google Workspace
  ipcMain.handle('google:status', () => googleWorkspace.getStatus());
  ipcMain.handle('google:save-credentials', (_, jsonText) => googleWorkspace.saveCredentials(jsonText));
  ipcMain.handle('google:pick-credentials-file', async () => {
    const result = await dialog.showOpenDialog(hudWin || widgetWin, {
      title: 'Seleccionar credentials.json de Google Cloud',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths?.[0]) return null;
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    return googleWorkspace.saveCredentials(raw);
  });
  ipcMain.handle('google:connect', () => googleWorkspace.connect());
  ipcMain.handle('google:disconnect', () => googleWorkspace.disconnect());
  ipcMain.handle('google:gmail-list', (_, params) => googleWorkspace.gmailListMessages(params));
  ipcMain.handle('google:gmail-read', (_, id) => googleWorkspace.gmailReadMessage(id));
  ipcMain.handle('google:gmail-send', (_, payload) => googleWorkspace.gmailSendEmail(payload));
  ipcMain.handle('google:calendar-list', (_, params) => googleWorkspace.calendarListEvents(params));
  ipcMain.handle('google:calendar-create', (_, payload) => googleWorkspace.calendarCreateEvent(payload));
  ipcMain.handle('google:drive-search', (_, params) => googleWorkspace.driveSearchFiles(params));
  ipcMain.handle('google:docs-read', (_, documentId) => googleWorkspace.docsReadDocument(documentId));
  ipcMain.handle('google:docs-create', (_, payload) => googleWorkspace.docsCreateDocument(payload));
  ipcMain.handle('google:sheets-read', (_, params) => googleWorkspace.sheetsReadRange(params));
  ipcMain.handle('google:sheets-append', (_, params) => googleWorkspace.sheetsAppendRow(params));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => toggleHud(false));

  app.whenReady().then(() => {
    const userDataPath = app.getPath('userData');
    store = new Store(userDataPath);
    googleWorkspace = new GoogleWorkspaceService(userDataPath);
    geminiService = new GeminiService(store, googleWorkspace);

    registerIpc();
    createWidgetWindow();
    createHudWindow();
    createTray();

    globalShortcut.register('CommandOrControl+Shift+J', () => toggleHud(false));

    // Show HUD on first launch so user sees the interface right away
    setTimeout(() => {
      if (hudWin) hudWin.show();
    }, 600);
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
