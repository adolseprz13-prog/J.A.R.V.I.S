import React, { useEffect, useState } from 'react';
import { Settings, Key, Globe, Volume2, Upload, CheckCircle2, ExternalLink, Unlink, RefreshCw, Download } from 'lucide-react';

export default function SettingsPanel({ settings, googleStatus, onUpdateSettings, onRefreshGoogle }) {
  const [userName, setUserName] = useState(settings?.userName || 'Señor');
  const [apiKey, setApiKey] = useState(settings?.geminiApiKey || '');
  const [model, setModel] = useState(settings?.geminiModel || 'gemini-3.8-flash');
  const [voiceEnabled, setVoiceEnabled] = useState(settings?.voiceEnabled ?? true);
  const [voiceRate, setVoiceRate] = useState(settings?.voiceRate || 1.05);
  const [voiceName, setVoiceName] = useState(settings?.voiceName || '');
  const [voices, setVoices] = useState([]);

  const [testMsg, setTestMsg] = useState('');
  const [googleMsg, setGoogleMsg] = useState('');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateMsg, setUpdateMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCheckUpdate = async () => {
    setBusy(true);
    setUpdateMsg('Consultando última versión en GitHub...');
    try {
      const info = await window.jarvis.checkGithubUpdate();
      setUpdateInfo(info);
      setUpdateMsg(
        info.hasUpdate
          ? `🆕 Nueva versión disponible: ${info.latestVersion}`
          : `✅ Estás al día (${info.latestVersion}).`
      );
    } catch (err) {
      setUpdateMsg(`❌ ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setUserName(settings?.userName || 'Señor');
    setApiKey(settings?.geminiApiKey || '');
    setModel(settings?.geminiModel || 'gemini-3.8-flash');
    setVoiceEnabled(settings?.voiceEnabled ?? true);
    setVoiceRate(settings?.voiceRate || 1.05);
    setVoiceName(settings?.voiceName || '');
  }, [settings]);

  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis) {
        const list = window.speechSynthesis.getVoices();
        setVoices(list.filter((v) => v.lang?.toLowerCase().startsWith('es') || list.length < 15));
      }
    };
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleSaveGeneral = async () => {
    await onUpdateSettings({
      userName,
      geminiApiKey: apiKey.trim(),
      geminiModel: model,
      voiceEnabled,
      voiceRate: Number(voiceRate),
      voiceName,
    });
    setTestMsg('✅ Configuración guardada correctamente.');
  };

  const handleTestGemini = async () => {
    setBusy(true);
    setTestMsg('Probando conexión con Gemini...');
    try {
      const res = await window.jarvis.settings.testGemini(apiKey, model);
      await onUpdateSettings({ geminiApiKey: apiKey.trim(), geminiModel: model });
      setTestMsg(`✅ ${res.reply}`);
    } catch (err) {
      setTestMsg(`❌ Error: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const handlePickCredentials = async () => {
    setGoogleMsg('');
    try {
      const status = await window.jarvis.google.pickCredentialsFile();
      if (status) {
        setGoogleMsg('✅ Archivo credentials.json cargado. Ahora haz clic en "Conectar con Google".');
        onRefreshGoogle();
      }
    } catch (err) {
      setGoogleMsg(`❌ ${err.message || err}`);
    }
  };

  const handleConnectGoogle = async () => {
    setBusy(true);
    setGoogleMsg('Abriendo navegador para autorizar tu cuenta de Google Workspace...');
    try {
      const status = await window.jarvis.google.connect();
      setGoogleMsg(`✅ Conectado exitosamente como ${status.userEmail || 'tu cuenta de Google'}.`);
      onRefreshGoogle();
    } catch (err) {
      setGoogleMsg(`❌ ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await window.jarvis.google.disconnect();
    setGoogleMsg('Cuenta de Google desconectada.');
    onRefreshGoogle();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel-header" style={{ marginBottom: 4 }}>
        <div className="panel-title">
          <Settings size={20} /> CONFIGURACIÓN DEL SISTEMA J.A.R.V.I.S.
        </div>
      </div>

      {/* Gemini AI Card */}
      <div className="hud-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--coffee-dark)', fontSize: 15 }}>
            <Key size={17} color="#1f7a4c" /> Cerebro de IA — Google Gemini API
          </h3>
          <button
            className="btn btn-sm"
            onClick={() => window.jarvis.window.openExternal('https://aistudio.google.com/apikey')}
          >
            <ExternalLink size={13} /> Obtener clave gratis
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cómo llamarte</label>
            <input className="input" value={userName} onChange={(e) => setUserName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gemini API Key</label>
            <input
              className="input"
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Modelo</label>
            <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Recomendado)</option>
              <option value="gemini-3.8-flash-lite">gemini-3.8-flash-lite (Ultra rápido / Menos saturación)</option>
              <option value="gemini-3.8-pro">gemini-3.8-pro (Avanzado)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSaveGeneral}>
            Guardar Ajustes
          </button>
          <button className="btn btn-sm" onClick={handleTestGemini} disabled={busy}>
            Probar Conexión Gemini
          </button>
          {testMsg && <span style={{ fontSize: 12.5, color: 'var(--text-main)' }}>{testMsg}</span>}
        </div>
      </div>

      {/* Google Workspace OAuth Card */}
      <div className="hud-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--coffee-dark)', fontSize: 15 }}>
            <Globe size={17} color="#1f7a4c" /> Google Workspace (Gmail, Calendar, Drive, Docs, Sheets)
          </h3>
          {googleStatus?.isConnected ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--emerald)', fontSize: 12.5 }}>
              <CheckCircle2 size={15} /> Conectado: {googleStatus.userEmail}
            </span>
          ) : (
            <span style={{ color: 'var(--gold)', fontSize: 12.5 }}>No conectado</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={handlePickCredentials}>
            <Upload size={14} /> {googleStatus?.hasCredentials ? 'Cambiar credentials.json' : '1. Cargar credentials.json'}
          </button>
          {!googleStatus?.isConnected ? (
            <button
              className="btn btn-sm btn-primary"
              onClick={handleConnectGoogle}
              disabled={!googleStatus?.hasCredentials || busy}
            >
              2. Conectar con Google Workspace
            </button>
          ) : (
            <button className="btn btn-sm btn-danger" onClick={handleDisconnectGoogle}>
              <Unlink size={14} /> Desconectar cuenta
            </button>
          )}
          <button
            className="btn btn-sm"
            onClick={() => window.jarvis.window.openExternal('https://console.cloud.google.com/apis/credentials')}
          >
            <ExternalLink size={13} /> Abrir Google Cloud Console
          </button>
        </div>

        {googleMsg && <div style={{ fontSize: 12.5, color: 'var(--green-dark)', fontWeight: 500 }}>{googleMsg}</div>}

        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            background: 'var(--bg-surface-soft)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            padding: 12,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--text-main)' }}>Guía rápida para obtener credentials.json (una sola vez):</strong>
          <ol style={{ paddingLeft: 18, marginTop: 4 }}>
            <li>
              Entra a Google Cloud Console, crea un proyecto (ej. <em>JARVIS-Personal</em>).
            </li>
            <li>
              En <strong>APIs y servicios → Biblioteca</strong>, habilita: <em>Gmail API, Google Calendar API, Google Drive API, Google Docs API y Google Sheets API</em>.
            </li>
            <li>
              En <strong>Pantalla de consentimiento OAuth</strong>, selecciona tipo <em>Externo</em> y agrega tu correo como <em>Usuario de prueba</em>.
            </li>
            <li>
              En <strong>Credenciales → Crear credenciales → ID de cliente de OAuth → App de escritorio</strong>, descarga el JSON y cárgalo aquí con el botón <em>Cargar credentials.json</em>.
            </li>
          </ol>
        </div>
      </div>

      {/* Voice Settings */}
      <div className="hud-card" style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--coffee-dark)', fontSize: 15 }}>
          <Volume2 size={17} color="#1f7a4c" /> Voz de J.A.R.V.I.S.
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
            />
            Respuestas por voz
          </label>
          <select className="select" value={voiceName} onChange={(e) => setVoiceName(e.target.value)}>
            <option value="">Voz en español automática</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <div>
            <label style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Velocidad: {voiceRate}x</label>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={voiceRate}
              onChange={(e) => setVoiceRate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div>
          <button className="btn btn-sm btn-primary" onClick={handleSaveGeneral}>
            Aplicar Voz
          </button>
        </div>
      </div>

      {/* GitHub Updates / APK Sync Card */}
      <div className="hud-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--coffee-dark)', fontSize: 15 }}>
            <RefreshCw size={17} color="#1f7a4c" /> Actualizaciones desde GitHub (Android APK / PC)
          </h3>
          <button
            className="btn btn-sm"
            onClick={() => window.jarvis.window.openExternal('https://github.com/adolseprz13-prog/J.A.R.V.I.S/releases')}
          >
            <ExternalLink size={13} /> Ver Releases
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Cada actualización subida a tu repositorio de GitHub genera automáticamente una nueva versión de{' '}
          <strong>JARVIS.apk</strong>. Tus tareas, proyectos e hitos se guardan de forma privada en cada dispositivo.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-sm btn-primary" onClick={handleCheckUpdate} disabled={busy}>
            <RefreshCw size={14} /> Buscar actualizaciones
          </button>
          {updateInfo?.downloadUrl && (
            <button
              className="btn btn-sm btn-gold"
              onClick={() => {
                if (updateInfo.latestVersion) {
                  localStorage.setItem('jarvis_installed_tag', updateInfo.latestVersion);
                }
                window.jarvis.window.openExternal(updateInfo.downloadUrl);
              }}
            >
              <Download size={14} /> Descargar {updateInfo.assetName || 'Actualización'} ({updateInfo.latestVersion})
            </button>
          )}
          {updateMsg && <span style={{ fontSize: 12.5, color: 'var(--green-dark)', fontWeight: 500 }}>{updateMsg}</span>}
        </div>
      </div>
    </div>
  );
}
