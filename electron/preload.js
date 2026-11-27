const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  window: {
    toggleHud: () => ipcRenderer.invoke('window:toggle-hud'),
    openHudVoice: () => ipcRenderer.invoke('window:open-hud-voice'),
    minimizeHud: () => ipcRenderer.invoke('window:minimize-hud'),
    closeHud: () => ipcRenderer.invoke('window:close-hud'),
    moveWidget: (dx, dy) => ipcRenderer.send('window:move-widget', { dx, dy }),
    setWidgetIgnoreMouse: (ignore) => ipcRenderer.send('window:widget-ignore-mouse', ignore),
    showWidgetMenu: () => ipcRenderer.send('window:show-widget-menu'),
    openExternal: (url) => ipcRenderer.invoke('window:open-external', url),
  },
  onTriggerVoice: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('jarvis:trigger-voice', handler);
    return () => ipcRenderer.removeListener('jarvis:trigger-voice', handler);
  },
  onDataUpdated: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('jarvis:data-updated', handler);
    return () => ipcRenderer.removeListener('jarvis:data-updated', handler);
  },
  onCursorMove: (cb) => {
    const handler = (_, pos) => cb(pos);
    ipcRenderer.on('jarvis:cursor', handler);
    return () => ipcRenderer.removeListener('jarvis:cursor', handler);
  },
  onHudState: (cb) => {
    const handler = (_, isOpen) => cb(isOpen);
    ipcRenderer.on('jarvis:hud-state', handler);
    return () => ipcRenderer.removeListener('jarvis:hud-state', handler);
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (partial) => ipcRenderer.invoke('settings:update', partial),
    testGemini: (apiKey, model) => ipcRenderer.invoke('settings:test-gemini', { apiKey, model }),
  },
  tasks: {
    list: (filter) => ipcRenderer.invoke('tasks:list', filter),
    create: (input) => ipcRenderer.invoke('tasks:create', input),
    update: (id, updates) => ipcRenderer.invoke('tasks:update', { id, updates }),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (input) => ipcRenderer.invoke('projects:create', input),
    update: (id, updates) => ipcRenderer.invoke('projects:update', { id, updates }),
    addMilestone: (projectId, title) => ipcRenderer.invoke('projects:add-milestone', { projectId, title }),
    toggleMilestone: (projectId, milestoneId) =>
      ipcRenderer.invoke('projects:toggle-milestone', { projectId, milestoneId }),
    deleteMilestone: (projectId, milestoneId) =>
      ipcRenderer.invoke('projects:delete-milestone', { projectId, milestoneId }),
    delete: (id) => ipcRenderer.invoke('projects:delete', id),
  },
  chat: {
    history: () => ipcRenderer.invoke('chat:history'),
    send: (text) => ipcRenderer.invoke('chat:send', text),
    clear: () => ipcRenderer.invoke('chat:clear'),
  },
  google: {
    status: () => ipcRenderer.invoke('google:status'),
    saveCredentials: (jsonText) => ipcRenderer.invoke('google:save-credentials', jsonText),
    pickCredentialsFile: () => ipcRenderer.invoke('google:pick-credentials-file'),
    connect: () => ipcRenderer.invoke('google:connect'),
    disconnect: () => ipcRenderer.invoke('google:disconnect'),
    gmailList: (params) => ipcRenderer.invoke('google:gmail-list', params),
    gmailRead: (id) => ipcRenderer.invoke('google:gmail-read', id),
    gmailSend: (payload) => ipcRenderer.invoke('google:gmail-send', payload),
    calendarList: (params) => ipcRenderer.invoke('google:calendar-list', params),
    calendarCreate: (payload) => ipcRenderer.invoke('google:calendar-create', payload),
    driveSearch: (params) => ipcRenderer.invoke('google:drive-search', params),
    docsRead: (documentId) => ipcRenderer.invoke('google:docs-read', documentId),
    docsCreate: (payload) => ipcRenderer.invoke('google:docs-create', payload),
    sheetsRead: (params) => ipcRenderer.invoke('google:sheets-read', params),
    sheetsAppend: (params) => ipcRenderer.invoke('google:sheets-append', params),
  },
});
