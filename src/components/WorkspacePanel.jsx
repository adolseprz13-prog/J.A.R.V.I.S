import React, { useEffect, useState } from 'react';
import {
  Mail,
  Calendar,
  HardDrive,
  RefreshCw,
  Send,
  Plus,
  ExternalLink,
  FileText,
  Table,
  Globe,
  Settings,
} from 'lucide-react';

export default function WorkspacePanel({ googleStatus, onGoSettings }) {
  const [subtab, setSubtab] = useState('gmail');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Gmail state
  const [emails, setEmails] = useState([]);
  const [gmailQuery, setGmailQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');

  // Calendar state
  const [events, setEvents] = useState([]);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [evSummary, setEvSummary] = useState('');
  const [evStart, setEvStart] = useState('');
  const [evLocation, setEvLocation] = useState('');

  // Drive / Docs / Sheets state
  const [files, setFiles] = useState([]);
  const [driveQuery, setDriveQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewSheet, setPreviewSheet] = useState(null);

  const loadCurrentTab = async (tab = subtab) => {
    if (!googleStatus?.isConnected) return;
    setLoading(true);
    setError('');
    try {
      if (tab === 'gmail') {
        const list = await window.jarvis.google.gmailList({ query: gmailQuery, maxResults: 15 });
        setEmails(list);
      } else if (tab === 'calendar') {
        const list = await window.jarvis.google.calendarList({ maxResults: 15 });
        setEvents(list);
      } else if (tab === 'drive') {
        const list = await window.jarvis.google.driveSearch({ query: driveQuery, pageSize: 20 });
        setFiles(list);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleStatus?.isConnected) {
      loadCurrentTab(subtab);
    }
  }, [subtab, googleStatus?.isConnected]);

  const handleOpenEmail = async (id) => {
    setLoading(true);
    try {
      const msg = await window.jarvis.google.gmailRead(id);
      setSelectedEmail(msg);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await window.jarvis.google.gmailSend({ to: mailTo, subject: mailSubject, body: mailBody });
      setComposing(false);
      setMailTo('');
      setMailSubject('');
      setMailBody('');
      loadCurrentTab('gmail');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await window.jarvis.google.calendarCreate({ summary: evSummary, start: evStart, location: evLocation });
      setNewEventOpen(false);
      setEvSummary('');
      setEvStart('');
      setEvLocation('');
      loadCurrentTab('calendar');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleInspectFile = async (file) => {
    setPreviewDoc(null);
    setPreviewSheet(null);
    if (file.mimeType === 'application/vnd.google-apps.document') {
      setLoading(true);
      try {
        const doc = await window.jarvis.google.docsRead(file.id);
        setPreviewDoc(doc);
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
      setLoading(true);
      try {
        const sheet = await window.jarvis.google.sheetsRead({ spreadsheetId: file.id, range: 'A1:G20' });
        setPreviewSheet({ name: file.name, ...sheet });
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    } else if (file.webViewLink) {
      window.jarvis.window.openExternal(file.webViewLink);
    }
  };

  if (window.jarvis?.isMobile) {
    const mobileLinks = [
      { name: 'Gmail', desc: 'Abrir tu bandeja de correo electrónico', url: 'https://mail.google.com', color: '#c93b4b' },
      { name: 'Google Calendar', desc: 'Ver y agendar reuniones en tu calendario', url: 'https://calendar.google.com', color: '#1f7a4c' },
      { name: 'Google Drive', desc: 'Explorar tus archivos y carpetas en la nube', url: 'https://drive.google.com', color: '#6f4e37' },
      { name: 'Google Docs', desc: 'Abrir y editar tus documentos', url: 'https://docs.google.com', color: '#4a3222' },
      { name: 'Google Sheets', desc: 'Ver y actualizar tus hojas de cálculo', url: 'https://sheets.google.com', color: '#165a38' },
    ];
    return (
      <div>
        <div className="panel-header">
          <div className="panel-title">
            <Globe size={20} /> GOOGLE WORKSPACE (MÓVIL)
          </div>
        </div>
        <div className="grid-cards">
          {mobileLinks.map((item) => (
            <div key={item.name} className="hud-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <strong style={{ color: item.color, fontSize: 15 }}>{item.name}</strong>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{item.desc}</p>
              <button
                className="btn btn-sm btn-primary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => window.jarvis.window.openExternal(item.url)}
              >
                <ExternalLink size={13} /> Abrir {item.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!googleStatus?.isConnected) {
    return (
      <div className="hud-card" style={{ textAlign: 'center', padding: 40, maxWidth: 620, margin: '30px auto' }}>
        <Globe size={44} color="#1f7a4c" style={{ marginBottom: 14 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--coffee-dark)', fontSize: 18, marginBottom: 10 }}>
          CONECTA TU GOOGLE WORKSPACE
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
          Vincula tu cuenta de Google para que J.A.R.V.I.S. pueda leer y enviar correos en <strong>Gmail</strong>,
          consultar y agendar reuniones en <strong>Google Calendar</strong>, y explorar tus archivos en{' '}
          <strong>Google Drive, Docs y Sheets</strong>.
        </p>
        <button className="btn btn-primary" onClick={onGoSettings}>
          <Settings size={16} /> Ir a Configuración de Google Workspace
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-header">
        <div className="panel-title">
          <Globe size={20} /> GOOGLE WORKSPACE ({googleStatus.userEmail})
        </div>
        <button className="btn btn-sm" onClick={() => loadCurrentTab()} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Sincronizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="subtabs">
        <button className={`subtab ${subtab === 'gmail' ? 'active' : ''}`} onClick={() => setSubtab('gmail')}>
          <Mail size={15} /> Gmail
        </button>
        <button className={`subtab ${subtab === 'calendar' ? 'active' : ''}`} onClick={() => setSubtab('calendar')}>
          <Calendar size={15} /> Calendar
        </button>
        <button className={`subtab ${subtab === 'drive' ? 'active' : ''}`} onClick={() => setSubtab('drive')}>
          <HardDrive size={15} /> Drive, Docs & Sheets
        </button>
      </div>

      {error && (
        <div
          className="hud-card"
          style={{ borderColor: 'var(--crimson)', color: 'var(--crimson)', marginBottom: 12, fontSize: 13 }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ==================== GMAIL ==================== */}
      {subtab === 'gmail' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Buscar en Gmail (ej. is:unread, factura, from:jefe)..."
              value={gmailQuery}
              onChange={(e) => setGmailQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadCurrentTab('gmail')}
            />
            <button className="btn" onClick={() => loadCurrentTab('gmail')}>
              Buscar
            </button>
            <button className="btn btn-gold" onClick={() => setComposing((c) => !c)}>
              <Send size={14} /> Redactar
            </button>
          </div>

          {composing && (
            <form className="hud-card" style={{ display: 'grid', gap: 10 }} onSubmit={handleSendEmail}>
              <input
                className="input"
                type="email"
                placeholder="Para: correo@ejemplo.com"
                value={mailTo}
                onChange={(e) => setMailTo(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Asunto..."
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                required
              />
              <textarea
                className="textarea"
                placeholder="Escribe tu mensaje..."
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-sm" onClick={() => setComposing(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={loading}>
                  Enviar Correo
                </button>
              </div>
            </form>
          )}

          {selectedEmail && (
            <div className="hud-card" style={{ borderColor: 'var(--green)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ color: 'var(--coffee-dark)', fontSize: 15 }}>{selectedEmail.subject}</strong>
                <button className="btn btn-sm" onClick={() => setSelectedEmail(null)}>
                  Cerrar
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                De: {selectedEmail.from} • {selectedEmail.date}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.55, maxHeight: 260, overflowY: 'auto' }}>
                {selectedEmail.body}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {emails.map((m) => (
              <div
                key={m.id}
                className="hud-card"
                onClick={() => handleOpenEmail(m.id)}
                style={{ cursor: 'pointer', padding: 12, borderColor: m.unread ? 'var(--green)' : undefined }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 13.5, color: m.unread ? 'var(--green-dark)' : 'var(--text-main)' }}>
                    {m.unread ? '● ' : ''}
                    {m.subject}
                  </strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{m.date}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--coffee)', marginTop: 2 }}>{m.from}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{m.snippet}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== CALENDAR ==================== */}
      {subtab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-gold" onClick={() => setNewEventOpen((o) => !o)}>
              <Plus size={15} /> Agendar Evento
            </button>
          </div>

          {newEventOpen && (
            <form className="hud-card" style={{ display: 'grid', gap: 10 }} onSubmit={handleCreateEvent}>
              <input
                className="input"
                placeholder="Título del evento o reunión..."
                value={evSummary}
                onChange={(e) => setEvSummary(e.target.value)}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input
                  className="input"
                  type="datetime-local"
                  value={evStart}
                  onChange={(e) => setEvStart(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder="Ubicación o enlace Meet (opcional)..."
                  value={evLocation}
                  onChange={(e) => setEvLocation(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-sm" onClick={() => setNewEventOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={loading}>
                  Crear en Calendar
                </button>
              </div>
            </form>
          )}

          {events.length === 0 ? (
            <div className="hud-card" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 28 }}>
              No hay próximos eventos en tu calendario.
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="hud-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--coffee-dark)', fontSize: 14 }}>{ev.summary}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    🕒 {ev.start ? new Date(ev.start).toLocaleString('es-ES') : 'Sin fecha'}
                    {ev.location ? ` • 📍 ${ev.location}` : ''}
                  </div>
                </div>
                {ev.htmlLink && (
                  <button className="btn btn-sm" onClick={() => window.jarvis.window.openExternal(ev.htmlLink)}>
                    <ExternalLink size={13} /> Abrir
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================== DRIVE / DOCS / SHEETS ==================== */}
      {subtab === 'drive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Buscar archivos en Google Drive..."
              value={driveQuery}
              onChange={(e) => setDriveQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadCurrentTab('drive')}
            />
            <button className="btn" onClick={() => loadCurrentTab('drive')}>
              Buscar
            </button>
          </div>

          {previewDoc && (
            <div className="hud-card" style={{ borderColor: 'var(--green)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ color: 'var(--coffee-dark)' }}>📄 {previewDoc.title}</strong>
                <button className="btn btn-sm" onClick={() => setPreviewDoc(null)}>
                  Cerrar vista previa
                </button>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, maxHeight: 240, overflowY: 'auto' }}>
                {previewDoc.text || '(Documento vacío)'}
              </pre>
            </div>
          )}

          {previewSheet && (
            <div className="hud-card" style={{ borderColor: 'var(--emerald)', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ color: 'var(--emerald)' }}>📊 {previewSheet.name} ({previewSheet.range})</strong>
                <button className="btn btn-sm" onClick={() => setPreviewSheet(null)}>
                  Cerrar vista previa
                </button>
              </div>
              <table className="data-table">
                <tbody>
                  {(previewSheet.values || []).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (rIdx === 0 ? <th key={cIdx}>{cell}</th> : <td key={cIdx}>{cell}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map((f) => {
              const isDoc = f.mimeType === 'application/vnd.google-apps.document';
              const isSheet = f.mimeType === 'application/vnd.google-apps.spreadsheet';
              return (
                <div key={f.id} className="hud-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isDoc ? <FileText size={18} color="#6f4e37" /> : isSheet ? <Table size={18} color="#1f7a4c" /> : <HardDrive size={18} color="#a67c52" />}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>{f.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Modificado: {f.modifiedTime ? new Date(f.modifiedTime).toLocaleString('es-ES') : '-'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(isDoc || isSheet) && (
                      <button className="btn btn-sm" onClick={() => handleInspectFile(f)}>
                        Vista previa
                      </button>
                    )}
                    {f.webViewLink && (
                      <button className="btn btn-sm" onClick={() => window.jarvis.window.openExternal(f.webViewLink)}>
                        <ExternalLink size={13} /> Abrir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
