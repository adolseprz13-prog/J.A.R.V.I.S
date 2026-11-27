import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, Plus, Trash2, ListTodo, Pencil, Check, X } from 'lucide-react';

export default function TasksPanel({ tasks, projects, onRefresh }) {
  const [filter, setFilter] = useState('todas');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'media',
    status: 'pendiente',
    dueDate: '',
    projectId: '',
  });

  const filtered = tasks.filter((t) => (filter === 'todas' ? true : t.status === filter));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await window.jarvis.tasks.create({ title, description, priority, dueDate, projectId });
    setTitle('');
    setDescription('');
    setPriority('media');
    setDueDate('');
    setProjectId('');
    setShowForm(false);
    onRefresh();
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'media',
      status: task.status || 'pendiente',
      dueDate: task.dueDate || '',
      projectId: task.projectId || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (e, id) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;
    await window.jarvis.tasks.update(id, {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      priority: editForm.priority,
      status: editForm.status,
      dueDate: editForm.dueDate,
      projectId: editForm.projectId,
    });
    setEditingId(null);
    onRefresh();
  };

  const cycleStatus = async (task) => {
    const next =
      task.status === 'pendiente' ? 'en_progreso' : task.status === 'en_progreso' ? 'completada' : 'pendiente';
    await window.jarvis.tasks.update(task.id, { status: next });
    onRefresh();
  };

  const handleDelete = async (id) => {
    await window.jarvis.tasks.delete(id);
    onRefresh();
  };

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <div>
      <div className="panel-header">
        <div className="panel-title">
          <ListTodo size={20} /> GESTOR DE TAREAS PENDIENTES
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['todas', 'pendiente', 'en_progreso', 'completada'].map((st) => (
            <button
              key={st}
              className={`btn btn-sm ${filter === st ? 'btn-primary' : ''}`}
              onClick={() => setFilter(st)}
            >
              {st === 'todas'
                ? `Todas (${tasks.length})`
                : st === 'pendiente'
                ? 'Pendientes'
                : st === 'en_progreso'
                ? 'En Progreso'
                : 'Completadas'}
            </button>
          ))}
          <button className="btn btn-sm btn-gold" onClick={() => setShowForm((s) => !s)}>
            <Plus size={15} /> Nueva Tarea
          </button>
        </div>
      </div>

      {showForm && (
        <form className="hud-card" style={{ marginBottom: 16, display: 'grid', gap: 10 }} onSubmit={handleCreate}>
          <input
            className="input"
            placeholder="Título de la tarea..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="textarea"
            placeholder="Descripción o notas (opcional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="alta">Prioridad Alta</option>
              <option value="media">Prioridad Media</option>
              <option value="baja">Prioridad Baja</option>
            </select>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <select className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Sin proyecto asociado</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-sm btn-primary">
              Guardar Tarea
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="hud-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36 }}>
          No hay tareas en esta vista. Puedes crear una aquí o pedírselo a J.A.R.V.I.S. por chat o voz.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((t) =>
            editingId === t.id ? (
              <form
                key={t.id}
                className="hud-card"
                style={{ borderColor: 'var(--green)', display: 'grid', gap: 10 }}
                onSubmit={(e) => handleSaveEdit(e, t.id)}
              >
                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>EDITANDO TAREA</div>
                <input
                  className="input"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Título de la tarea..."
                  required
                />
                <textarea
                  className="textarea"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción o notas..."
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  <select
                    className="select"
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="completada">Completada</option>
                  </select>
                  <select
                    className="select"
                    value={editForm.priority}
                    onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="alta">Prioridad Alta</option>
                    <option value="media">Prioridad Media</option>
                    <option value="baja">Prioridad Baja</option>
                  </select>
                  <input
                    className="input"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                  <select
                    className="select"
                    value={editForm.projectId}
                    onChange={(e) => setEditForm((f) => ({ ...f, projectId: e.target.value }))}
                  >
                    <option value="">Sin proyecto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="btn btn-sm" onClick={cancelEdit}>
                    <X size={14} /> Cancelar
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary">
                    <Check size={14} /> Guardar Cambios
                  </button>
                </div>
              </form>
            ) : (
              <div
                key={t.id}
                className="hud-card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  opacity: t.status === 'completada' ? 0.65 : 1,
                }}
              >
                <button
                  onClick={() => cycleStatus(t)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coffee)', marginTop: 2 }}
                  title="Cambiar estado (Pendiente → En progreso → Completada)"
                >
                  {t.status === 'completada' ? (
                    <CheckCircle2 size={20} color="#1f7a4c" />
                  ) : t.status === 'en_progreso' ? (
                    <Clock size={20} color="#b87333" />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        textDecoration: t.status === 'completada' ? 'line-through' : 'none',
                      }}
                    >
                      {t.title}
                    </span>
                    <span className={`priority-badge priority-${t.priority}`}>{t.priority}</span>
                    {t.projectId && projectMap[t.projectId] && (
                      <span className="tool-chip" style={{ marginTop: 0 }}>
                        📁 {projectMap[t.projectId]}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{t.description}</p>
                  )}
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 14 }}>
                    <span>Estado: {t.status.replace('_', ' ')}</span>
                    {t.dueDate && <span>📅 Vence: {t.dueDate}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => startEdit(t)} title="Editar tarea">
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)} title="Eliminar tarea">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
