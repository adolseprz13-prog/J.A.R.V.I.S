import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Trash2, Sparkles, Cpu } from 'lucide-react';

const QUICK_PROMPTS = [
  '¿Cuáles son mis tareas pendientes?',
  'Resumen del avance de mis proyectos',
  'Revisa mis correos recientes en Gmail',
  '¿Qué eventos tengo en Google Calendar?',
  'Busca mis archivos recientes en Google Drive',
];

function renderFormattedText(text) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} style={{ color: 'var(--coffee-dark)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          style={{
            background: 'rgba(111,78,55,0.1)',
            color: 'var(--coffee-dark)',
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: '0.9em',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export default function ChatPanel({ settings, onUpdateSettings, onDataChanged, voiceTriggerCount }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    window.jarvis.chat.history().then(setMessages);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (voiceTriggerCount > 0) {
      startVoice();
    }
  }, [voiceTriggerCount]);

  const speak = (text) => {
    if (!settings?.voiceEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const clean = String(text)
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .replace(/[#*_]/g, '')
        .slice(0, 500);
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'es-ES';
      utter.rate = Number(settings.voiceRate) || 1.05;
      const voices = window.speechSynthesis.getVoices();
      if (settings.voiceName) {
        const chosen = voices.find((v) => v.name === settings.voiceName);
        if (chosen) utter.voice = chosen;
      } else {
        const esVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('es'));
        if (esVoice) utter.voice = esVoice;
      }
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const tempUser = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const res = await window.jarvis.chat.send(text);
      const refreshed = await window.jarvis.chat.history();
      setMessages(refreshed);
      if (res?.dataChanged) {
        onDataChanged?.();
      }
      if (res?.message?.text) {
        speak(res.message.text);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `Error procesando comando: ${err.message || err}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const startVoice = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceStatus('Reconocimiento de voz no disponible en este entorno.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setVoiceStatus('');
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.continuous = false;

    let finalTranscript = '';
    rec.onstart = () => {
      setListening(true);
      setVoiceStatus('Escuchando, Señor...');
    };
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setInput((finalTranscript + interim).trim());
    };
    rec.onerror = (event) => {
      setVoiceStatus(`Error de micrófono: ${event.error}`);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setVoiceStatus('');
      if (finalTranscript.trim()) {
        sendMessage(finalTranscript.trim());
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const toggleVoiceOutput = async () => {
    const next = !settings?.voiceEnabled;
    if (!next && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    onUpdateSettings?.({ voiceEnabled: next });
  };

  const handleClear = async () => {
    const fresh = await window.jarvis.chat.clear();
    setMessages(fresh);
  };

  return (
    <div className="chat-layout">
      <div className="panel-header" style={{ marginBottom: 10 }}>
        <div className="panel-title">
          <Cpu size={20} /> NÚCLEO DE INTERACCIÓN J.A.R.V.I.S.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={toggleVoiceOutput} title="Activar/Silenciar voz">
            {settings?.voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {settings?.voiceEnabled ? 'Voz Activa' : 'Silenciado'}
          </button>
          <button className="btn btn-sm btn-danger" onClick={handleClear} title="Limpiar historial">
            <Trash2 size={14} /> Limpiar
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role}`}>
            <div className="chat-meta">
              <strong>{m.role === 'assistant' ? 'J.A.R.V.I.S.' : settings?.userName || 'TÚ'}</strong>
              <span>
                {m.timestamp ? new Date(m.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <div>{renderFormattedText(m.text)}</div>
            {m.toolsUsed && m.toolsUsed.length > 0 && (
              <div className="tool-chips">
                {m.toolsUsed.map((tool) => (
                  <span key={tool} className="tool-chip">
                    ⚡ {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="chat-bubble assistant" style={{ opacity: 0.8 }}>
            <div className="chat-meta">
              <strong>J.A.R.V.I.S.</strong>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} /> Procesando solicitud y consultando sistemas...
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="quick-prompts">
        {QUICK_PROMPTS.map((q) => (
          <button key={q} className="quick-chip" onClick={() => sendMessage(q)} disabled={sending}>
            {q}
          </button>
        ))}
      </div>

      {voiceStatus && (
        <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 6, paddingLeft: 4 }}>🎙️ {voiceStatus}</div>
      )}

      <div className="chat-input-bar">
        <button
          className={`mic-btn ${listening ? 'listening' : ''}`}
          onClick={startVoice}
          title={listening ? 'Detener micrófono' : 'Hablar con J.A.R.V.I.S.'}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input
          className="input"
          style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
          placeholder="Escribe o dicta un comando a J.A.R.V.I.S. (ej. 'Crea tarea urgente revisar correo' o 'Lee mis últimos correos')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button className="btn btn-primary" onClick={() => sendMessage()} disabled={sending || !input.trim()}>
          <Send size={15} /> Enviar
        </button>
      </div>
    </div>
  );
}
