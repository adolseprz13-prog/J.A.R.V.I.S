import React, { useCallback, useEffect, useState } from 'react';
import {
  Cpu,
  ListTodo,
  FolderKanban,
  Globe,
  Settings,
  Minus,
  X,
} from 'lucide-react';
import ChatPanel from './components/ChatPanel';
import TasksPanel from './components/TasksPanel';
import ProjectsPanel from './components/ProjectsPanel';
import WorkspacePanel from './components/WorkspacePanel';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [tab, setTab] = useState('chat');
  const [settings, setSettings] = useState({});
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [googleStatus, setGoogleStatus] = useState({ hasCredentials: false, isConnected: false, userEmail: '' });
  const [voiceTriggerCount, setVoiceTriggerCount] = useState(0);
  const [clock, setClock] = useState(new Date());
  const isMobile = Boolean(window.jarvis?.isMobile);

  const refreshAll = useCallback(async () => {
    const [s, t, p, g] = await Promise.all([
      window.jarvis.settings.get(),
      window.jarvis.tasks.list(),
      window.jarvis.projects.list(),
      window.jarvis.google.status(),
    ]);
    setSettings(s);
    setTasks(t);
    setProjects(p);
    setGoogleStatus(g);
  }, []);

  useEffect(() => {
    refreshAll();
    const offVoice = window.jarvis.onTriggerVoice(() => {
      setTab('chat');
      setVoiceTriggerCount((c) => c + 1);
    });
    const offData = window.jarvis.onDataUpdated(() => {
      refreshAll();
    });
    const timer = setInterval(() => setClock(new Date()), 15000);
    return () => {
      offVoice?.();
      offData?.();
      clearInterval(timer);
    };
  }, [refreshAll]);

  const handleUpdateSettings = async (partial) => {
    const updated = await window.jarvis.settings.update(partial);
    setSettings(updated);
  };

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completada').length;

  return (
    <div className="hud-shell">
      {/* Custom Stark Titlebar */}
      <header className="titlebar">
        <div className="titlebar-brand">
          <img src="./jarvis-icon.png" alt="J.A.R.V.I.S." className="titlebar-logo" />
          <span className="titlebar-title">J.A.R.V.I.S.</span>
          <span className="titlebar-sub">ASISTENTE PERSONAL</span>
        </div>

        <div className="titlebar-status">
          <span className="status-pill" title="Estado de Gemini AI">
            <span className={`status-dot ${settings?.geminiApiKey ? 'online' : 'warn'}`} />
            {settings?.geminiApiKey ? 'Gemini Activo' : 'Modo Local'}
          </span>
          <span className="status-pill" title="Estado de Google Workspace">
            <span className={`status-dot ${googleStatus?.isConnected ? 'online' : 'warn'}`} />
            {googleStatus?.isConnected ? 'Workspace OK' : 'Workspace Off'}
          </span>
          <span style={{ fontSize: 12, color: '#d6c7b8', fontFamily: 'var(--font-display)' }}>
            {clock.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isMobile && (
            <>
              <button className="win-btn" onClick={() => window.jarvis.window.minimizeHud()} title="Minimizar">
                <Minus size={15} />
              </button>
              <button className="win-btn close" onClick={() => window.jarvis.window.closeHud()} title="Ocultar al icono flotante">
                <X size={15} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="hud-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <button className={`nav-btn ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
            <Cpu size={17} /> J.A.R.V.I.S. Chat
          </button>
          <button className={`nav-btn ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
            <ListTodo size={17} /> Tareas
            {pendingTasksCount > 0 && <span className="nav-badge">{pendingTasksCount}</span>}
          </button>
          <button className={`nav-btn ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
            <FolderKanban size={17} /> Proyectos
            <span className="nav-badge">{projects.length}</span>
          </button>
          <button className={`nav-btn ${tab === 'workspace' ? 'active' : ''}`} onClick={() => setTab('workspace')}>
            <Globe size={17} /> Google Workspace
          </button>
          <button className={`nav-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
            <Settings size={17} /> Configuración
          </button>

          <div className="sidebar-footer">
            <strong>ATAJO RÁPIDO</strong>
            <div>Presiona <code>Ctrl+Shift+J</code> o haz clic en el icono flotante de J.A.R.V.I.S. en tu escritorio.</div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="main-content">
          {tab === 'chat' && (
            <ChatPanel
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onDataChanged={refreshAll}
              voiceTriggerCount={voiceTriggerCount}
            />
          )}
          {tab === 'tasks' && <TasksPanel tasks={tasks} projects={projects} onRefresh={refreshAll} />}
          {tab === 'projects' && <ProjectsPanel projects={projects} tasks={tasks} onRefresh={refreshAll} />}
          {tab === 'workspace' && (
            <WorkspacePanel googleStatus={googleStatus} onGoSettings={() => setTab('settings')} />
          )}
          {tab === 'settings' && (
            <SettingsPanel
              settings={settings}
              googleStatus={googleStatus}
              onUpdateSettings={handleUpdateSettings}
              onRefreshGoogle={refreshAll}
            />
          )}
        </main>
      </div>
    </div>
  );
}
