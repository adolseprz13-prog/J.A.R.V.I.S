import React, { useState } from 'react';
import { Paperclip, FileText, FolderOpen, Link2, Plus, X, ExternalLink } from 'lucide-react';

function makeId() {
  return `att-${Math.random().toString(36).slice(2, 9)}`;
}

function guessLinkName(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('docs.google.com')) return 'Google Docs';
    if (u.hostname.includes('sheets.google.com')) return 'Google Sheets';
    if (u.hostname.includes('drive.google.com')) return 'Google Drive';
    if (u.hostname.includes('onedrive') || u.hostname.includes('sharepoint')) return 'OneDrive';
    const seg = u.pathname.split('/').filter(Boolean).pop();
    return seg ? decodeURIComponent(seg).slice(0, 32) : u.hostname;
  } catch {
    return url.slice(0, 32);
  }
}

export default function AttachmentsList({ attachments = [], onChange, compact = false }) {
  const [adding, setAdding] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isMobile = Boolean(window.jarvis?.isMobile);
  const list = Array.isArray(attachments) ? attachments : [];

  const handlePickFiles = async () => {
    setErrorMsg('');
    const picked = await window.jarvis?.files?.pickFiles?.();
    if (picked && picked.length > 0) {
      const next = [
        ...list,
        ...picked.map((f) => ({ id: makeId(), name: f.name, type: 'file', target: f.target })),
      ];
      onChange(next);
      setAdding(false);
    }
  };

  const handlePickFolder = async () => {
    setErrorMsg('');
    const picked = await window.jarvis?.files?.pickFolder?.();
    if (picked && picked.length > 0) {
      const next = [
        ...list,
        ...picked.map((f) => ({ id: makeId(), name: f.name, type: 'folder', target: f.target })),
      ];
      onChange(next);
      setAdding(false);
    }
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    const raw = linkUrl.trim();
    if (!raw) return;
    const isUrl = /^https?:\/\//i.test(raw);
    const isLocalPath = /^[a-zA-Z]:\\|^\\\\/.test(raw);
    const target = isUrl || isLocalPath ? raw : `https://${raw}`;
    const type = isLocalPath ? 'file' : 'link';
    const name = linkName.trim() || (isLocalPath ? raw.split('\\').pop() || raw : guessLinkName(target));

    onChange([...list, { id: makeId(), name, type, target }]);
    setLinkUrl('');
    setLinkName('');
    setLinkMode(false);
    setAdding(false);
  };

  const handleOpen = async (att) => {
    setErrorMsg('');
    const res = await window.jarvis?.files?.openTarget?.(att.target);
    if (res && res.ok === false) {
      setErrorMsg(`No se pudo abrir "${att.name}": ${res.error || 'ruta no encontrada'}`);
    }
  };

  const handleRemove = (id) => {
    onChange(list.filter((a) => a.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: compact ? 4 : 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
        {list.map((att) => (
          <span
            key={att.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              borderRadius: 99,
              fontSize: 11,
              background: att.type === 'link' ? 'var(--green-soft)' : 'var(--coffee-soft)',
              border:
                att.type === 'link'
                  ? '1px solid rgba(31, 122, 76, 0.3)'
                  : '1px solid rgba(111, 78, 55, 0.28)',
              color: att.type === 'link' ? 'var(--green-dark)' : 'var(--coffee-dark)',
              maxWidth: 230,
            }}
          >
            <button
              type="button"
              onClick={() => handleOpen(att)}
              title={`Abrir: ${att.target}`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 185,
              }}
            >
              {att.type === 'folder' ? (
                <FolderOpen size={11} style={{ flexShrink: 0 }} />
              ) : att.type === 'link' ? (
                <Link2 size={11} style={{ flexShrink: 0 }} />
              ) : (
                <FileText size={11} style={{ flexShrink: 0 }} />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</span>
              <ExternalLink size={10} style={{ flexShrink: 0, opacity: 0.7 }} />
            </button>
            <button
              type="button"
              onClick={() => handleRemove(att.id)}
              title="Quitar adjunto"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                padding: 0,
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setLinkMode(false);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 7px',
            borderRadius: 99,
            fontSize: 11,
            border: '1px dashed var(--border-light)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          title="Adjuntar documento de PC o enlace de Drive"
        >
          <Paperclip size={11} /> {list.length > 0 ? '+ Adjuntar' : 'Adjuntar insumo'}
        </button>
      </div>

      {adding && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            borderRadius: 8,
            background: 'var(--bg-surface-soft)',
            border: '1px solid var(--border-light)',
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {!isMobile && (
              <>
                <button type="button" className="btn btn-sm" style={{ padding: '4px 8px', fontSize: 11.5 }} onClick={handlePickFiles}>
                  <FileText size={12} /> Archivo(s) PC
                </button>
                <button type="button" className="btn btn-sm" style={{ padding: '4px 8px', fontSize: 11.5 }} onClick={handlePickFolder}>
                  <FolderOpen size={12} /> Carpeta PC
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ padding: '4px 8px', fontSize: 11.5 }}
              onClick={() => setLinkMode(true)}
            >
              <Link2 size={12} /> Enlace Drive / URL
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ padding: '4px 7px', fontSize: 11.5, marginLeft: 'auto' }}
              onClick={() => {
                setAdding(false);
                setLinkMode(false);
              }}
            >
              <X size={12} />
            </button>
          </div>

          {(linkMode || isMobile) && (
            <form onSubmit={handleAddLink} style={{ display: 'grid', gap: 6 }}>
              <input
                className="input"
                style={{ padding: '5px 8px', fontSize: 12 }}
                placeholder="Pega enlace de Google Drive, web o ruta (ej. https://drive.google.com/... o C:\ruta\archivo.pdf)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                required
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  style={{ padding: '5px 8px', fontSize: 12, flex: 1 }}
                  placeholder="Nombre corto (opcional, ej. Informe Q4)"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                />
                <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '4px 10px', fontSize: 11.5 }}>
                  <Plus size={12} /> Guardar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {errorMsg && <div style={{ fontSize: 11, color: 'var(--crimson)' }}>⚠️ {errorMsg}</div>}
    </div>
  );
}
