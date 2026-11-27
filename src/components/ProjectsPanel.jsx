import React, { useState } from 'react';
import { FolderKanban, Plus, Trash2, CheckSquare, Square, X, Pencil, Check } from 'lucide-react';

const PRIORITY_ORDER = { alta: 0, media: 1, baja: 2 };

export default function ProjectsPanel({ projects, tasks, onRefresh }) {
  const [priorityFilter, setPriorityFilter] = useState('todas');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [deadline, setDeadline] = useState('');
  const [milestonesText, setMilestonesText] = useState('');
  const [newMilestoneByProj, setNewMilestoneByProj] = useState({});

  // Edit project state
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editProjectForm, setEditProjectForm] = useState({
    name: '',
    description: '',
    priority: 'media',
    deadline: '',
    status: 'activo',
    progress: 0,
  });

  // Edit milestone state
  const [editingMilestone, setEditingMilestone] = useState(null);

  const visibleProjects = [...projects]
    .filter((p) => (priorityFilter === 'todas' ? true : (p.priority || 'media') === priorityFilter))
    .sort((a, b) => (PRIORITY_ORDER[a.priority || 'media'] ?? 1) - (PRIORITY_ORDER[b.priority || 'media'] ?? 1));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const milestones = milestonesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    await window.jarvis.projects.create({ name, description, priority, deadline, milestones });
    setName('');
    setDescription('');
    setPriority('media');
    setDeadline('');
    setMilestonesText('');
    setShowForm(false);
    onRefresh();
  };

  const startEditProject = (p) => {
    setEditingProjectId(p.id);
    setEditProjectForm({
      name: p.name || '',
      description: p.description || '',
      priority: p.priority || 'media',
      deadline: p.deadline || '',
      status: p.status || 'activo',
      progress: Number(p.progress) || 0,
    });
  };

  const handleSaveProject = async (e, project) => {
    e.preventDefault();
    if (!editProjectForm.name.trim()) return;
    const updates = {
      name: editProjectForm.name.trim(),
      description: editProjectForm.description.trim(),
      priority: editProjectForm.priority,
      deadline: editProjectForm.deadline,
      status: editProjectForm.status,
    };
    if (!project.milestones || project.milestones.length === 0) {
      updates.progress = Math.min(100, Math.max(0, Number(editProjectForm.progress) || 0));
    }
    await window.jarvis.projects.update(project.id, updates);
    setEditingProjectId(null);
    onRefresh();
  };

  const handleAddMilestone = async (projectId) => {
    const title = (newMilestoneByProj[projectId] || '').trim();
    if (!title) return;
    await window.jarvis.projects.addMilestone(projectId, title);
    setNewMilestoneByProj((prev) => ({ ...prev, [projectId]: '' }));
    onRefresh();
  };

  const handleSaveMilestoneTitle = async (project) => {
    if (!editingMilestone || !editingMilestone.title.trim()) {
      setEditingMilestone(null);
      return;
    }
    const updatedMilestones = (project.milestones || []).map((m) =>
      m.id === editingMilestone.milestoneId ? { ...m, title: editingMilestone.title.trim() } : m
    );
    await window.jarvis.projects.update(project.id, { milestones: updatedMilestones });
    setEditingMilestone(null);
    onRefresh();
  };

  const handleToggleMilestone = async (projectId, milestoneId) => {
    await window.jarvis.projects.toggleMilestone(projectId, milestoneId);
    onRefresh();
  };

  const handleDeleteMilestone = async (projectId, milestoneId) => {
    await window.jarvis.projects.deleteMilestone(projectId, milestoneId);
    onRefresh();
  };

  const handleStatusChange = async (projectId, status) => {
    await window.jarvis.projects.update(projectId, { status });
    onRefresh();
  };

  const handleDelete = async (projectId) => {
    await window.jarvis.projects.delete(projectId);
    onRefresh();
  };

  return (
    <div>
      <div className="panel-header">
        <div className="panel-title">
          <FolderKanban size={20} /> CONTROL DE AVANCE DE PROYECTOS
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['todas', 'alta', 'media', 'baja'].map((pr) => (
            <button
              key={pr}
              className={`btn btn-sm ${priorityFilter === pr ? 'btn-primary' : ''}`}
              onClick={() => setPriorityFilter(pr)}
            >
              {pr === 'todas'
                ? `Todos (${projects.length})`
                : pr === 'alta'
                ? 'Alta'
                : pr === 'media'
                ? 'Media'
                : 'Baja'}
            </button>
          ))}
          <button className="btn btn-sm btn-gold" onClick={() => setShowForm((s) => !s)}>
            <Plus size={15} /> Nuevo Proyecto
          </button>
        </div>
      </div>

      {showForm && (
        <form className="hud-card" style={{ marginBottom: 16, display: 'grid', gap: 10 }} onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <input
              className="input"
              placeholder="Nombre del proyecto..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="alta">Prioridad Alta</option>
              <option value="media">Prioridad Media</option>
              <option value="baja">Prioridad Baja</option>
            </select>
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <input
            className="input"
            placeholder="Descripción breve..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <textarea
            className="textarea"
            placeholder="Hitos iniciales (uno por línea, opcional)..."
            value={milestonesText}
            onChange={(e) => setMilestonesText(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-sm btn-primary">
              Crear Proyecto
            </button>
          </div>
        </form>
      )}

      {visibleProjects.length === 0 ? (
        <div className="hud-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 36 }}>
          No hay proyectos en esta vista.
        </div>
      ) : (
        <div className="grid-2">
          {visibleProjects.map((p) => {
            const linkedTasks = tasks.filter((t) => t.projectId === p.id);
            const isEditing = editingProjectId === p.id;
            const hasMilestones = Array.isArray(p.milestones) && p.milestones.length > 0;
            const projPriority = p.priority || 'media';

            return (
              <div
                key={p.id}
                className="hud-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  borderColor: isEditing ? 'var(--green)' : undefined,
                }}
              >
                {isEditing ? (
                  <form style={{ display: 'grid', gap: 9 }} onSubmit={(e) => handleSaveProject(e, p)}>
                    <div style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 600 }}>EDITANDO PROYECTO</div>
                    <input
                      className="input"
                      value={editProjectForm.name}
                      onChange={(e) => setEditProjectForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Nombre del proyecto..."
                      required
                    />
                    <textarea
                      className="textarea"
                      style={{ minHeight: 56 }}
                      value={editProjectForm.description}
                      onChange={(e) => setEditProjectForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Descripción..."
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <select
                        className="select"
                        value={editProjectForm.priority}
                        onChange={(e) => setEditProjectForm((f) => ({ ...f, priority: e.target.value }))}
                      >
                        <option value="alta">Prioridad Alta</option>
                        <option value="media">Prioridad Media</option>
                        <option value="baja">Prioridad Baja</option>
                      </select>
                      <input
                        className="input"
                        type="date"
                        value={editProjectForm.deadline}
                        onChange={(e) => setEditProjectForm((f) => ({ ...f, deadline: e.target.value }))}
                      />
                      <select
                        className="select"
                        value={editProjectForm.status}
                        onChange={(e) => setEditProjectForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="completado">Completado</option>
                      </select>
                    </div>
                    {!hasMilestones && (
                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          Avance manual: {editProjectForm.progress}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={editProjectForm.progress}
                          onChange={(e) => setEditProjectForm((f) => ({ ...f, progress: Number(e.target.value) }))}
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button type="button" className="btn btn-sm" onClick={() => setEditingProjectId(null)}>
                        <X size={13} /> Cancelar
                      </button>
                      <button type="submit" className="btn btn-sm btn-primary">
                        <Check size={13} /> Guardar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 15.5, color: 'var(--coffee-dark)', fontWeight: 700 }}>{p.name}</h3>
                        <span className={`priority-badge priority-${projPriority}`}>{projPriority}</span>
                      </div>
                      {p.description && (
                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{p.description}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select
                        className="select"
                        style={{ width: 'auto', padding: '4px 8px', fontSize: 11.5 }}
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      >
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="completado">Completado</option>
                      </select>
                      <button className="btn btn-sm" onClick={() => startEditProject(p)} title="Editar proyecto">
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)} title="Eliminar proyecto">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Avance general {p.deadline ? `• Meta: ${p.deadline}` : ''}
                    </span>
                    <strong style={{ color: 'var(--green)' }}>{p.progress}%</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Hitos ({(p.milestones || []).filter((m) => m.done).length}/{(p.milestones || []).length}) • Tareas vinculadas: {linkedTasks.length}
                  </div>
                  {(p.milestones || []).map((ms) => {
                    const isEditingMs =
                      editingMilestone?.projectId === p.id && editingMilestone?.milestoneId === ms.id;
                    return (
                      <div
                        key={ms.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          padding: '5px 8px',
                          borderRadius: 6,
                          background: 'var(--bg-surface-soft)',
                        }}
                      >
                        <button
                          onClick={() => handleToggleMilestone(p.id, ms.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: ms.done ? '#1f7a4c' : '#6b5e54',
                          }}
                        >
                          {ms.done ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>

                        {isEditingMs ? (
                          <>
                            <input
                              className="input"
                              style={{ padding: '4px 8px', fontSize: 12.5, flex: 1 }}
                              value={editingMilestone.title}
                              onChange={(e) =>
                                setEditingMilestone((prev) => ({ ...prev, title: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveMilestoneTitle(p);
                                } else if (e.key === 'Escape') {
                                  setEditingMilestone(null);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveMilestoneTitle(p)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1f7a4c' }}
                              title="Guardar hito"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingMilestone(null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span
                              style={{
                                flex: 1,
                                textDecoration: ms.done ? 'line-through' : 'none',
                                color: ms.done ? 'var(--text-muted)' : 'var(--text-main)',
                              }}
                            >
                              {ms.title}
                            </span>
                            <button
                              onClick={() =>
                                setEditingMilestone({ projectId: p.id, milestoneId: ms.id, title: ms.title })
                              }
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              title="Editar hito"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(p.id, ms.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              title="Eliminar hito"
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input
                      className="input"
                      style={{ padding: '6px 10px', fontSize: 12.5 }}
                      placeholder="Agregar nuevo hito..."
                      value={newMilestoneByProj[p.id] || ''}
                      onChange={(e) => setNewMilestoneByProj((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMilestone(p.id);
                        }
                      }}
                    />
                    <button className="btn btn-sm" onClick={() => handleAddMilestone(p.id)}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
