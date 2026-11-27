import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  ListTodo,
  Pencil,
  Check,
  X,
  List,
  LayoutGrid,
  Columns3,
  Table2,
} from 'lucide-react';

const TASK_COLUMNS = [
  { key: 'pendiente', label: 'Pendientes', dot: '#6f4e37' },
  { key: 'en_progreso', label: 'En Progreso', dot: '#b87333' },
  { key: 'completada', label: 'Completadas', dot: '#1f7a4c' },
];

export default function TasksPanel({ tasks, projects, onRefresh }) {
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('jarvis_tasks_view') || 'list');
  const [filter, setFilter] = useState('todas');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'media',
    status: 'pendiente',
    dueDate: '',
    projectId: '',
  });

  useEffect(() => {
    localStorage.setItem('jarvis_tasks_view', viewMode);
  }, [viewMode]);

  const filtered = tasks.filter((t) => (filter === 'todas' ? true : t.status === filter));
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

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

  const handleDropOnColumn = async (statusKey) => {
    setDragOverCol(null);
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task || task.status === statusKey) return;
    await window.jarvis.tasks.update(task.id, { status: statusKey });
    onRefresh();
  };

  const handleDelete = async (id) => {
    await window.jarvis.tasks.delete(id);
    onRefresh();
  };

  const renderEditForm = (t) => (
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
        style={{ minHeight: 58 }}
        value={editForm.description}
        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Descripción o notas..."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
        <button type="button" className="btn btn-sm" onClick={() => setEditingId(null)}>
          <X size={14} /> Cancelar
        </button>
        <button type="submit" className="btn btn-sm btn-primary">
          <Check size={14} /> Guardar
        </button>
      </div>
    </form>
  );

  const renderTaskCard = (t, isKanban = false) => {
    if (editingId === t.id) return renderEditForm(t);
    return (
      <div
        key={t.id}
        className={`hud-card ${isKanban ? 'kanban-card' : ''}`}
        draggable={isKanban}
        onDragStart={() => isKanban && setDraggedTaskId(t.id)}
        onDragEnd={() => {
          setDraggedTaskId(null);
          setDragOverCol(null);
        }}
        style={{
          display: 'flex',
          flexDirection: isKanban || viewMode === 'grid' ? 'column' : 'row',
          alignItems: isKanban || viewMode === 'grid' ? 'stretch' : 'flex-start',
          gap: 10,
          padding: isKanban ? 12 : 15,
          opacity: t.status === 'completada' ? 0.72 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          <button
            onClick={() => cycleStatus(t)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coffee)', marginTop: 2 }}
            title="Cambiar estado (Pendiente → En progreso → Completada)"
          >
            {t.status === 'completada' ? (
              <CheckCircle2 size={19} color="#1f7a4c" />
            ) : t.status === 'en_progreso' ? (
              <Clock size={19} color="#b87333" />
            ) : (
              <Circle size={19} />
            )}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 13.5,
                  textDecoration: t.status === 'completada' ? 'line-through' : 'none',
                }}
              >
                {t.title}
              </span>
              <span className={`priority-badge priority-${t.priority}`}>{t.priority}</span>
            </div>
            {t.projectId && projectMap[t.projectId] && (
              <div style={{ marginTop: 5 }}>
                <span className="tool-chip">📁 {projectMap[t.projectId]}</span>
              </div>
            )}
            {t.description && (
              <p style={{ fontSize: 12.2, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.45 }}>
                {t.description}
              </p>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!isKanban && <span>Estado: {t.status.replace('_', ' ')}</span>}
              {t.dueDate && <span>📅 {t.dueDate}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={() => startEdit(t)} title="Editar tarea">
            <Pencil size={13} />
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)} title="Eliminar tarea">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="panel-header">
        <div className="panel-title">
          <ListTodo size={20} /> GESTOR DE TAREAS PENDIENTES
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="view-switcher" title="Modo de visualización">
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={14} /> Lista
            </button>
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} /> Cuadros
            </button>
            <button
              className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 size={14} /> Kanban
            </button>
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <Table2 size={14} /> Tabla
            </button>
          </div>

          <button className="btn btn-sm btn-gold" onClick={() => setShowForm((s) => !s)}>
            <Plus size={15} /> Nueva Tarea
          </button>
        </div>
      </div>

      {viewMode !== 'kanban' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
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
        </div>
      )}

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

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="kanban-board">
          {TASK_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className={`kanban-col ${dragOverCol === col.key ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.key);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDropOnColumn(col.key)}
              >
                <div className="kanban-col-header">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.dot }} />
                    {col.label}
                  </span>
                  <span className="kanban-count">{colTasks.length}</span>
                </div>
                {colTasks.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 8px' }}>
                    Arrastra tareas aquí
                  </div>
                ) : (
                  colTasks.map((t) => renderTaskCard(t, true))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* GRID / CARDS VIEW */}
      {viewMode === 'grid' &&
        (filtered.length === 0 ? (
          <div className="hud-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36 }}>
            No hay tareas en esta vista.
          </div>
        ) : (
          <div className="grid-cards">{filtered.map((t) => renderTaskCard(t, false))}</div>
        ))}

      {/* LIST VIEW */}
      {viewMode === 'list' &&
        (filtered.length === 0 ? (
          <div className="hud-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36 }}>
            No hay tareas en esta vista. Puedes crear una aquí o pedírselo a J.A.R.V.I.S. por chat o voz.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((t) => renderTaskCard(t, false))}
          </div>
        ))}

      {/* TABLE VIEW */}
      {viewMode === 'table' &&
        (filtered.length === 0 ? (
          <div className="hud-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36 }}>
            No hay tareas en esta vista.
          </div>
        ) : (
          <div className="hud-card" style={{ overflowX: 'auto', padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Tarea</th>
                  <th>Prioridad</th>
                  <th>Proyecto</th>
                  <th>Vence</th>
                  <th style={{ width: 92 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button
                        className="btn btn-sm"
                        style={{ padding: '3px 8px', fontSize: 11.5 }}
                        onClick={() => cycleStatus(t)}
                      >
                        {t.status.replace('_', ' ')}
                      </button>
                    </td>
                    <td style={{ fontWeight: 500, textDecoration: t.status === 'completada' ? 'line-through' : 'none' }}>
                      {t.title}
                    </td>
                    <td>
                      <span className={`priority-badge priority-${t.priority}`}>{t.priority}</span>
                    </td>
                    <td>{t.projectId && projectMap[t.projectId] ? projectMap[t.projectId] : '—'}</td>
                    <td>{t.dueDate || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setViewMode('list');
                            startEdit(t);
                          }}
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)} title="Eliminar">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
