import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, CalendarDays, Megaphone, MessageCircle, ShieldAlert, Users, KanbanSquare, Trash2, Plus, Pencil, X, Save, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'board', label: 'Board', icon: KanbanSquare },
  { id: 'milestones', label: 'Milestones', icon: CalendarDays },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

const levelValue = (level) => ({ Beginner: 33, Intermediate: 66, Advanced: 100 }[level] || 0);

function TaskModal({ task, members, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '', assigneeId: task?.assigneeId || '',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '', priority: task?.priority || 'medium',
  });
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('Enter a task title.');
    if (form.title.trim().length > 160) return setError('Keep the title to 160 characters or fewer.');
    if (form.description.length > 2000) return setError('Keep the description to 2,000 characters or fewer.');
    onSave({ ...form, title: form.title.trim(), description: form.description.trim(), assigneeId: form.assigneeId || null, dueDate: form.dueDate || null });
  };
  return (
    <div className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-border bg-surface-2 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-heading font-semibold text-ivory">{task ? 'Edit task' : 'Add task'}</h2><button type="button" onClick={onClose} className="p-2 text-secondary hover:text-ivory" aria-label="Close"><X className="w-4 h-4" /></button></div>
        <label className="block text-xs text-secondary">Title *<input autoFocus maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-ivory outline-none focus:border-accent focus:ring-1 focus:ring-accent" /></label>
        <label className="block text-xs text-secondary">Description<textarea maxLength={2000} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 w-full resize-y rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-ivory outline-none focus:border-accent focus:ring-1 focus:ring-accent" /></label>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block text-xs text-secondary">Assignee<select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs text-ivory"><option value="">Unassigned</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.fullName || 'Member'}</option>)}</select></label>
          <label className="block text-xs text-secondary">Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs text-ivory" /></label>
          <label className="block text-xs text-secondary">Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs text-ivory"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        </div>
        {error && <p role="alert" className="text-xs text-secondary">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl glass-panel text-xs text-secondary">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glow-btn-primary text-xs font-semibold text-ivory disabled:opacity-50"><Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save task'}</button></div>
      </form>
    </div>
  );
}

function TaskBoard({ projectId, tasks, members, userId, isOwner, readOnly, onTasksChange, addToast }) {
  const [editingTask, setEditingTask] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const columns = [
    { id: 'todo', label: 'To Do' },
    { id: 'inprogress', label: 'In Progress' },
    { id: 'done', label: 'Done' },
  ];
  const saveTask = async (payload) => {
    setSaving(true);
    try {
      if (editingTask) {
        const { task } = await api.updateTeamTask(projectId, editingTask.id, payload);
        onTasksChange((current) => current.map((item) => item.id === task.id ? task : item));
      } else {
        const { task } = await api.createTeamTask(projectId, payload);
        onTasksChange((current) => [...current, task]);
      }
      setEditingTask(undefined);
      addToast(editingTask ? 'Task updated.' : 'Task created.', 'success');
    } catch (error) {
      addToast(error.message || 'Could not save task.', 'error');
    } finally { setSaving(false); }
  };
  const moveTask = async (task, status) => {
    if (readOnly) return;
    if (!status || task.status === status) return;
    try {
      const { task: updated } = await api.updateTeamTask(projectId, task.id, { status });
      onTasksChange((current) => current.map((item) => item.id === updated.id ? updated : item));
      addToast('Task moved.', 'success');
    } catch (error) { addToast(error.message || 'Could not move task.', 'error'); }
  };
  const deleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTeamTask(projectId, task.id);
      onTasksChange((current) => current.filter((item) => item.id !== task.id));
      addToast('Task deleted.', 'success');
    } catch (error) { addToast(error.message || 'Could not delete task.', 'error'); }
  };
  const isOverdue = (task) => task.status !== 'done' && task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
  const priorityStyle = { low: 'text-secondary bg-surface-2/70', medium: 'text-secondary bg-surface-2/15', high: 'text-secondary bg-surface-2/15' };
  return (
    <div className="space-y-4">
      {!readOnly && <div className="flex justify-end"><button onClick={() => setEditingTask(null)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glow-btn-primary text-xs font-semibold text-ivory"><Plus className="w-4 h-4" />Add task</button></div>}
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.id);
          return <section key={column.id} onDragOver={(e) => !readOnly && e.preventDefault()} onDrop={(e) => { e.preventDefault(); const task = tasks.find((item) => item.id === (draggedId || e.dataTransfer.getData('text/plain'))); setDraggedId(null); if (task) moveTask(task, column.id); }} className="min-h-64 rounded-2xl border border-border bg-surface-2/40 p-3 space-y-3">
            <div className="flex items-center justify-between px-1"><h2 className="text-sm font-heading font-semibold text-ivory">{column.label}</h2><span className="text-xs text-secondary">{columnTasks.length}</span></div>
            {!columnTasks.length ? <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-secondary">{readOnly ? 'No tasks in this column.' : 'Drop a task here or add one.'}</p> : columnTasks.map((task) => <article key={task.id} draggable={!readOnly} onDragStart={(e) => { setDraggedId(task.id); e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggedId(null)} className={`rounded-2xl border bg-surface-2/80 p-4 space-y-3 ${readOnly ? '' : 'cursor-grab active:cursor-grabbing'} ${isOverdue(task) ? 'border-border/50' : 'border-border'} ${draggedId === task.id ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold text-ivory break-words">{task.title}</h3>{!readOnly && <div className="flex items-center gap-1"><button onClick={() => setEditingTask(task)} className="p-1.5 rounded-lg text-secondary hover:text-secondary" title="Edit task" aria-label={`Edit task: ${task.title}`}><Pencil className="w-3.5 h-3.5" /></button>{(isOwner || task.createdById === userId) && <button onClick={() => deleteTask(task)} className="p-1.5 rounded-lg text-secondary hover:text-secondary" title="Delete task" aria-label={`Delete task: ${task.title}`}><Trash2 className="w-3.5 h-3.5" /></button>}</div>}</div>
              {task.description && <p className="text-xs text-secondary line-clamp-3">{task.description}</p>}
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${priorityStyle[task.priority] || priorityStyle.medium}`}>{task.priority || 'medium'}</span>{isOverdue(task) && <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary"><AlertTriangle className="w-3 h-3" />Overdue</span>}</div>
              <div className="flex items-center justify-between gap-2 text-xs text-secondary"><span className="truncate">{task.assignee?.fullName || 'Unassigned'}</span><span className={isOverdue(task) ? 'text-secondary' : ''}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span></div>
            </article>)}
          </section>;
        })}
      </div>
      {editingTask !== undefined && <TaskModal task={editingTask} members={members} saving={saving} onClose={() => setEditingTask(undefined)} onSave={saveTask} />}
    </div>
  );
}

function MilestoneModal({ milestone, onClose, onSave, saving }) {
  const [form, setForm] = useState({ title: milestone?.title || '', description: milestone?.description || '', dueDate: milestone?.dueDate ? new Date(milestone.dueDate).toISOString().slice(0, 10) : '' });
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('Enter a milestone title.');
    if (form.title.trim().length > 160) return setError('Keep the title to 160 characters or fewer.');
    if (form.description.length > 2000) return setError('Keep the description to 2,000 characters or fewer.');
    onSave({ title: form.title.trim(), description: form.description.trim(), dueDate: form.dueDate || null });
  };
  return <div className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-border bg-surface-2 p-6 space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-heading font-semibold text-ivory">{milestone ? 'Edit milestone' : 'Add milestone'}</h2><button type="button" onClick={onClose} className="p-2 text-secondary hover:text-ivory" aria-label="Close milestone form"><X className="w-4 h-4" /></button></div><label className="block text-xs text-secondary">Title *<input autoFocus maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-ivory" /></label><label className="block text-xs text-secondary">Description<textarea maxLength={2000} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-ivory" /></label><label className="block text-xs text-secondary">Deadline<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs text-ivory" /></label>{error && <p role="alert" className="text-xs text-secondary">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl glass-panel text-xs text-secondary">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glow-btn-primary text-xs font-semibold text-ivory disabled:opacity-50"><Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save milestone'}</button></div></form></div>;
}

function MilestonesPanel({ projectId, milestones, isOwner, readOnly, onMilestonesChange, addToast }) {
  const [editing, setEditing] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const completedCount = milestones.filter((milestone) => milestone.completed).length;
  const progress = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0;
  const saveMilestone = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        const { milestone } = await api.updateTeamMilestone(projectId, editing.id, payload);
        onMilestonesChange((current) => current.map((item) => item.id === milestone.id ? milestone : item));
      } else {
        const { milestone } = await api.createTeamMilestone(projectId, payload);
        onMilestonesChange((current) => [...current, milestone]);
      }
      setEditing(undefined);
      addToast(editing ? 'Milestone updated.' : 'Milestone added.', 'success');
    } catch (error) { addToast(error.message || 'Could not save milestone.', 'error'); }
    finally { setSaving(false); }
  };
  const toggleCompleted = async (milestone) => {
    try {
      const { milestone: updated } = await api.updateTeamMilestone(projectId, milestone.id, { completed: !milestone.completed });
      onMilestonesChange((current) => current.map((item) => item.id === updated.id ? updated : item));
      addToast(updated.completed ? 'Milestone completed.' : 'Milestone marked pending.', 'success');
    } catch (error) { addToast(error.message || 'Could not update milestone.', 'error'); }
  };
  const deleteMilestone = async (milestone) => {
    if (!window.confirm(`Delete "${milestone.title}"?`)) return;
    try {
      await api.deleteTeamMilestone(projectId, milestone.id);
      onMilestonesChange((current) => current.filter((item) => item.id !== milestone.id));
      addToast('Milestone deleted.', 'success');
    } catch (error) { addToast(error.message || 'Could not delete milestone.', 'error'); }
  };
  return <div className="space-y-5">
    <section className="glass-card rounded-2xl border border-border p-5 space-y-3"><div className="flex justify-between text-sm"><h2 className="font-heading font-semibold text-ivory">Milestone progress</h2><span className="text-secondary">{progress}%</span></div><div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-accent to-accent" style={{ width: `${progress}%` }} /></div><p className="text-xs text-secondary">{completedCount} of {milestones.length} milestones completed</p></section>
    <div className="flex justify-end">{isOwner && !readOnly && <button onClick={() => setEditing(null)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glow-btn-primary text-xs font-semibold text-ivory"><Plus className="w-4 h-4" />Add milestone</button>}</div>
    {!milestones.length ? <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center space-y-3"><CalendarDays className="w-8 h-8 mx-auto text-secondary" /><h2 className="font-heading font-semibold text-ivory">No milestones yet</h2><p className="text-sm text-secondary">{isOwner && !readOnly ? 'Add the first milestone to give your team a clear target.' : 'The project owner has not added milestones yet.'}</p>{isOwner && !readOnly && <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl glow-btn-primary text-xs font-semibold text-ivory">Create first milestone</button>}</div> : <ul className="space-y-3">{milestones.map((milestone) => <li key={milestone.id} className="glass-card rounded-2xl border border-border p-4 flex flex-wrap items-center gap-3"><span className={milestone.completed ? 'text-secondary' : 'text-secondary'}>{milestone.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}</span><div className="flex-1 min-w-[180px]"><p className="text-sm font-semibold text-ivory">{milestone.title}</p>{milestone.description && <p className="text-xs text-secondary mt-1">{milestone.description}</p>}</div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${milestone.completed ? 'bg-surface-2/15 text-secondary' : 'bg-surface-2/15 text-secondary'}`}>{milestone.completed ? 'Completed' : 'Pending'}</span><span className="text-xs text-secondary">{milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'No deadline'}</span>{isOwner && !readOnly && <div className="flex gap-1"><button onClick={() => toggleCompleted(milestone)} className="px-2 py-1 rounded-lg text-xs text-secondary hover:bg-surface-2/10">{milestone.completed ? 'Mark pending' : 'Complete'}</button><button onClick={() => setEditing(milestone)} className="p-2 text-secondary hover:text-secondary" title="Edit milestone" aria-label={`Edit milestone: ${milestone.title}`}><Pencil className="w-4 h-4" /></button><button onClick={() => deleteMilestone(milestone)} className="p-2 text-secondary hover:text-secondary" title="Delete milestone" aria-label={`Delete milestone: ${milestone.title}`}><Trash2 className="w-4 h-4" /></button></div>}</li>)}</ul>}
    {editing !== undefined && <MilestoneModal milestone={editing} saving={saving} onClose={() => setEditing(undefined)} onSave={saveMilestone} />}
  </div>;
}

function AnnouncementModal({ announcement, onClose, onSave, saving }) {
  const [form, setForm] = useState({ title: announcement?.title || '', content: announcement?.content || '' });
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('Enter an announcement title.');
    if (form.title.trim().length > 160) return setError('Keep the title to 160 characters or fewer.');
    if (!form.content.trim()) return setError('Enter an announcement message.');
    if (form.content.trim().length > 5000) return setError('Keep the message to 5,000 characters or fewer.');
    onSave({ title: form.title.trim(), content: form.content.trim() });
  };
  return <div className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form onSubmit={submit} className="w-full max-w-xl rounded-2xl border border-border bg-surface-2 p-6 space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-heading font-semibold text-ivory">{announcement ? 'Edit announcement' : 'Post announcement'}</h2><button type="button" onClick={onClose} className="p-2 text-secondary hover:text-ivory" aria-label="Close"><X className="w-4 h-4" /></button></div><label className="block text-xs text-secondary">Title *<input autoFocus maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-ivory" /></label><label className="block text-xs text-secondary">Message *<textarea maxLength={5000} rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1.5 w-full resize-y rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-ivory" /></label>{error && <p role="alert" className="text-xs text-secondary">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl glass-panel text-xs text-secondary">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glow-btn-primary text-xs font-semibold text-ivory disabled:opacity-50"><Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save announcement'}</button></div></form></div>;
}

function AnnouncementsPanel({ projectId, isOwner, readOnly, addToast }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);
  const [saving, setSaving] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const { announcements: data } = await api.getTeamAnnouncements(projectId);
      setAnnouncements(data || []);
    } catch (error) { addToast(error.message || 'Could not load announcements.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAnnouncements(); }, [projectId]);

  const saveAnnouncement = async (payload) => {
    setSaving(true);
    try {
      if (modal) {
        const { announcement } = await api.updateTeamAnnouncement(projectId, modal.id, payload);
        setAnnouncements((current) => current.map((item) => item.id === announcement.id ? announcement : item));
      } else {
        const { announcement } = await api.createTeamAnnouncement(projectId, payload);
        setAnnouncements((current) => [announcement, ...current]);
      }
      addToast(modal ? 'Announcement updated.' : 'Announcement posted.', 'success');
      setModal(undefined);
    } catch (error) { addToast(error.message || 'Could not save announcement.', 'error'); }
    finally { setSaving(false); }
  };
  const deleteAnnouncement = async (announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return;
    try {
      await api.deleteTeamAnnouncement(projectId, announcement.id);
      setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
      addToast('Announcement deleted.', 'success');
    } catch (error) { addToast(error.message || 'Could not delete announcement.', 'error'); }
  };

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-heading font-semibold text-ivory">Team announcements</h2><p className="text-xs text-secondary mt-1">Newest updates from this project</p></div>{isOwner && !readOnly && !loading && <button onClick={() => setModal(null)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glow-btn-primary text-xs font-semibold text-ivory"><Plus className="w-4 h-4" />Post announcement</button>}</div>
    {loading ? <div className="space-y-3 animate-pulse">{[1, 2, 3].map((n) => <div key={n} className="glass-card rounded-2xl border border-border p-5 space-y-3"><div className="h-4 w-1/3 rounded bg-surface-2" /><div className="h-3 w-full rounded bg-surface-2" /><div className="h-3 w-1/2 rounded bg-surface-2" /></div>)}</div> : !announcements.length ? <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center space-y-3"><Megaphone className="w-8 h-8 mx-auto text-secondary" /><h3 className="font-heading font-semibold text-ivory">No announcements yet</h3><p className="text-sm text-secondary">{isOwner && !readOnly ? 'Post an update to keep your team in the loop.' : 'The project owner has not posted an update yet.'}</p>{isOwner && !readOnly && <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl glow-btn-primary text-xs font-semibold text-ivory">Post first announcement</button>}</div> : <div className="space-y-3">{announcements.map((announcement) => <article key={announcement.id} className="glass-card rounded-2xl border border-border p-5 space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-heading font-semibold text-ivory">{announcement.title}</h3><p className="mt-1 text-xs text-secondary">{announcement.author?.fullName || 'TeamConnect team'} · {new Date(announcement.createdAt).toLocaleString()}</p></div>{isOwner && !readOnly && <div className="flex gap-1"><button onClick={() => setModal(announcement)} className="p-2 rounded-lg text-secondary hover:text-secondary" title="Edit announcement" aria-label={`Edit announcement: ${announcement.title}`}><Pencil className="w-4 h-4" /></button><button onClick={() => deleteAnnouncement(announcement)} className="p-2 rounded-lg text-secondary hover:text-secondary" title="Delete announcement" aria-label={`Delete announcement: ${announcement.title}`}><Trash2 className="w-4 h-4" /></button></div>}</div><p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary">{announcement.content}</p></article>)}</div>}
    {modal !== undefined && <AnnouncementModal announcement={modal} saving={saving} onClose={() => setModal(undefined)} onSave={saveAnnouncement} />}
  </div>;
}

function ChatPanel({ projectId, user, readOnly, addToast }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState('connecting');
  const [joined, setJoined] = useState(false);
  const [draft, setDraft] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [chatError, setChatError] = useState('');
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const remoteTypingTimer = useRef(null);
  const notifyRef = useRef(addToast);
  notifyRef.current = addToast;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessages([]);
    setJoined(false);
    setChatError('');
    api.getTeamMessages(projectId)
      .then(({ messages: data }) => {
        if (active) setMessages((current) => {
          const unique = new Map([...data, ...current].map((message) => [message.id, message]));
          return [...unique.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
      })
      .catch((error) => { if (active) { setChatError(error.message || 'Could not load chat history.'); notifyRef.current(error.message || 'Could not load chat history.', 'error'); } })
      .finally(() => { if (active) setLoading(false); });

    if (!socket) { setConnection('connecting'); return () => { active = false; }; }
    const joinProject = () => { setConnection('connecting'); setJoined(false); socket.emit('join_project', projectId); };
    const onConnect = () => joinProject();
    const onDisconnect = () => { setConnection('disconnected'); setJoined(false); setTypingUser(''); };
    const onConnectError = () => { setConnection('disconnected'); setJoined(false); };
    const onJoined = (payload) => { if (payload?.projectId === projectId) { setConnection('connected'); setJoined(true); setChatError(''); } };
    const onMessage = ({ message } = {}) => {
      if (!message?.id || message.projectId !== projectId) return;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
    };
    const onTyping = ({ userId, fullName } = {}) => {
      if (userId === user?.id) return;
      setTypingUser(fullName || 'A teammate');
      clearTimeout(remoteTypingTimer.current);
      remoteTypingTimer.current = setTimeout(() => setTypingUser(''), 1800);
    };
    const onStoppedTyping = ({ userId } = {}) => { if (userId !== user?.id) setTypingUser(''); };
    const onWorkspaceError = ({ message } = {}) => { setChatError(message || 'Chat access was denied.'); };
    const onAccessRevoked = ({ projectId: revokedProjectId } = {}) => {
      if (revokedProjectId === projectId) { setChatError('Your access to this project chat was removed.'); setJoined(false); }
    };
    const onProjectCompleted = ({ projectId: completedId } = {}) => { if (completedId === projectId) notifyRef.current('Project completed. Chat is now read-only.', 'success'); };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('project_joined', onJoined);
    socket.on('new_message', onMessage);
    socket.on('user_typing', onTyping);
    socket.on('user_stopped_typing', onStoppedTyping);
    socket.on('workspace_error', onWorkspaceError);
    socket.on('project_access_revoked', onAccessRevoked);
    socket.on('project_completed', onProjectCompleted);
    if (socket.connected) joinProject(); else setConnection('connecting');

    return () => {
      active = false;
      clearTimeout(typingTimer.current);
      clearTimeout(remoteTypingTimer.current);
      socket.emit('stop_typing', { projectId });
      socket.emit('leave_project', projectId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('project_joined', onJoined);
      socket.off('new_message', onMessage);
      socket.off('user_typing', onTyping);
      socket.off('user_stopped_typing', onStoppedTyping);
      socket.off('workspace_error', onWorkspaceError);
      socket.off('project_access_revoked', onAccessRevoked);
      socket.off('project_completed', onProjectCompleted);
    };
  }, [projectId, socket, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, typingUser]);

  const handleDraft = (value) => {
    if (readOnly) return;
    setDraft(value.slice(0, 1000));
    if (!socket || !joined) return;
    socket.emit('typing', { projectId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('stop_typing', { projectId }), 900);
  };
  const sendMessage = (event) => {
    event.preventDefault();
    if (readOnly) return;
    const content = draft.trim();
    if (!content || content.length > 1000 || !socket?.connected || !joined) return;
    setChatError('');
    socket.emit('send_message', { projectId, content, type: 'team' });
    setDraft('');
    clearTimeout(typingTimer.current);
    socket.emit('stop_typing', { projectId });
  };

  return <section className="glass-card rounded-2xl border border-border overflow-hidden flex flex-col min-h-[560px] max-h-[75vh]">
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-heading font-semibold text-ivory">Team chat</h2><p className="text-xs text-secondary mt-1">Messages are visible to project team members</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${joined ? 'bg-surface-2/15 text-secondary' : 'bg-surface-2/15 text-secondary'}`}>{joined ? 'Connected' : chatError ? 'Access issue' : connection === 'disconnected' ? 'Reconnecting…' : 'Connecting…'}</span></div>
    {chatError && <p role="alert" className="border-b border-border/20 bg-surface-2/10 px-5 py-2.5 text-xs text-secondary">{chatError}</p>}
    {connection === 'disconnected' && !chatError && <p className="border-b border-border/20 bg-surface-2/10 px-5 py-2.5 text-xs text-secondary">Connection lost. Reconnecting automatically…</p>}
    <div className="flex-1 overflow-y-auto p-5 space-y-3">
      {loading ? <div className="space-y-3 animate-pulse">{[1, 2, 3, 4].map((n) => <div key={n} className={`h-16 w-2/3 rounded-2xl bg-surface-2 ${n % 2 ? '' : 'ml-auto'}`} />)}</div> : !messages.length ? <div className="h-full min-h-56 grid place-items-center text-center"><div><MessageCircle className="w-8 h-8 mx-auto text-secondary" /><p className="mt-3 text-sm font-medium text-ivory">No messages yet</p><p className="mt-1 text-xs text-secondary">Start the conversation with your team.</p></div></div> : messages.map((message) => {
        const own = message.senderId === user?.id || message.sender?.id === user?.id;
        return <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}><article className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${own ? 'bg-surface-2/25 border border-border/20 rounded-br-md' : 'bg-surface-2 border border-border rounded-bl-md'}`}><div className="flex items-center gap-3 mb-1"><span className="text-xs font-semibold text-secondary">{own ? 'You' : message.sender?.fullName || 'Team member'}</span><time className="text-xs text-secondary">{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><p className="whitespace-pre-wrap break-words text-sm text-secondary">{message.content}</p></article></div>;
      })}
      {typingUser && <p className="text-xs italic text-secondary">{typingUser} is typing…</p>}
      <div ref={bottomRef} />
    </div>
    <form onSubmit={sendMessage} className="border-t border-border p-4 flex items-end gap-3"><label className="sr-only" htmlFor="team-chat-message">Write a message</label><textarea id="team-chat-message" rows={2} maxLength={1000} value={draft} onChange={(e) => handleDraft(e.target.value)} placeholder={readOnly ? 'Project completed — chat is read-only' : joined ? 'Write a message…' : 'Waiting for chat connection…'} disabled={!joined || readOnly} className="flex-1 resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-ivory placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50" /><div className="flex flex-col items-end gap-2"><span className="text-xs text-secondary">{draft.length}/1000</span><button type="submit" disabled={readOnly || !draft.trim() || !joined || !socket?.connected} className="px-4 py-2 rounded-xl glow-btn-primary text-xs font-semibold text-ivory disabled:cursor-not-allowed disabled:opacity-40">Send</button></div></form>
  </section>;
}

export default function TeamWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [confirmCompletion, setConfirmCompletion] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);

  const loadWorkspace = async () => {
    try {
      const response = await api.getTeamWorkspace(id);
      setWorkspace(response.workspace);
      setAccessError(null);
    } catch (error) {
      setAccessError(error.status === 403 ? 'forbidden' : error.status === 404 ? 'missing' : 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadWorkspace();
  }, [id]);

  useEffect(() => {
    if (!socket) return undefined;
    const onCompleted = ({ projectId } = {}) => { if (projectId === id) setWorkspace((current) => current ? { ...current, status: 'completed' } : current); };
    const onRevoked = ({ projectId } = {}) => { if (projectId === id) setAccessError('forbidden'); };
    socket.on('project_completed', onCompleted);
    socket.on('project_access_revoked', onRevoked);
    return () => { socket.off('project_completed', onCompleted); socket.off('project_access_revoked', onRevoked); };
  }, [socket, id]);

  const chartData = useMemo(() => {
    if (!workspace) return [];
    const needed = new Map();
    (workspace.roles || []).forEach((role) => {
      (role.roleSkills || []).forEach(({ skill, requiredLevel }) => {
        if (!skill?.name) return;
        needed.set(skill.name, Math.max(needed.get(skill.name) || 0, levelValue(requiredLevel)));
      });
    });
    const team = new Map();
    (workspace.members || []).forEach((member) => {
      (member.user?.studentProfile?.userSkills || []).forEach(({ skill, level }) => {
        if (!skill?.name) return;
        team.set(skill.name, Math.max(team.get(skill.name) || 0, levelValue(level)));
      });
    });
    return [...needed.entries()].slice(0, 8).map(([skill, neededValue]) => ({ skill, needed: neededValue, team: team.get(skill) || 0 }));
  }, [workspace]);

  const progress = useMemo(() => {
    if (!workspace) return 0;
    const milestones = workspace.milestones || [];
    return milestones.length ? Math.round((milestones.filter((milestone) => milestone.completed).length / milestones.length) * 100) : 0;
  }, [workspace]);

  const removeMember = async (member) => {
    try {
      await api.removeTeamMember(id, member.userId);
      addToast('Team member removed.', 'success');
      setPendingRemoval(null);
      await loadWorkspace();
    } catch (error) {
      addToast(error.message || 'Could not remove team member.', 'error');
    }
  };

  const completeProject = async () => {
    setCompletionSaving(true);
    try {
      await api.completeTeamProject(id);
      setWorkspace((current) => ({ ...current, status: 'completed' }));
      setConfirmCompletion(false);
      addToast('Project completed. Workspace is now read-only.', 'success');
    } catch (error) { addToast(error.message || 'Could not complete project.', 'error'); }
    finally { setCompletionSaving(false); }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-5 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-surface-2" />
        <div className="h-36 rounded-2xl bg-surface-2/70" />
        <div className="grid md:grid-cols-2 gap-5"><div className="h-72 rounded-2xl bg-surface-2/70" /><div className="h-72 rounded-2xl bg-surface-2/70" /></div>
      </div>
    );
  }

  if (accessError) {
    const forbidden = accessError === 'forbidden';
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 mx-auto text-secondary" />
        <h1 className="text-2xl font-heading font-semibold text-ivory">{forbidden ? 'Workspace access not allowed' : accessError === 'missing' ? 'Project not found' : 'Workspace unavailable'}</h1>
        <p className="text-sm text-secondary">{forbidden ? 'Only the project owner and accepted team members can open this workspace.' : 'We could not load this project workspace. Please try again.'}</p>
        <Link to="/my-projects" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-sm text-secondary"><ArrowLeft className="w-4 h-4" />Back to My Projects</Link>
      </div>
    );
  }

  const isOwner = workspace.ownerId === user?.id;
  const tabsForPage = tabs;
  const updateTasks = (update) => setWorkspace((current) => ({ ...current, tasks: update(current.tasks || []) }));
  const updateMilestones = (update) => setWorkspace((current) => ({ ...current, milestones: update(current.milestones || []) }));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-secondary hover:text-secondary"><ArrowLeft className="w-4 h-4" />Project details</Link>
      <section className="glass-card p-6 sm:p-8 rounded-2xl border border-border space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-secondary"><Users className="w-4 h-4" />Team workspace <span className="text-secondary">·</span>{workspace.members?.length || 0} members</div>
        <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory">{workspace.title}</h1>{isOwner && workspace.status !== 'completed' && <button type="button" onClick={() => setConfirmCompletion(true)} className="px-4 py-2 rounded-xl border border-border/30 bg-surface-2/10 text-xs font-semibold text-secondary">Mark project completed</button>}</div>
        <p className="text-sm text-secondary max-w-3xl">{workspace.description}</p>
        {workspace.status === 'completed' && <div role="status" className="rounded-2xl border border-border/30 bg-surface-2/10 px-4 py-3 text-sm font-semibold text-secondary">Project completed · This workspace is read-only.</div>}
      </section>

      <nav className="flex gap-2 overflow-x-auto border-b border-border pb-2" aria-label="Workspace sections">
        {tabsForPage.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} type="button" onClick={() => setActiveTab(tabId)} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${activeTab === tabId ? 'bg-surface-2/15 text-secondary border border-border/25' : 'text-secondary hover:bg-surface-2/50 hover:text-ivory'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' ? (
        <div className="grid lg:grid-cols-2 gap-5">
          <section className="glass-card rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-heading font-semibold text-ivory">Team members</h2><p className="text-xs text-secondary mt-1">Accepted collaborators and their project roles</p></div><span className="text-xs text-secondary">{workspace.members?.length || 0}</span></div>
            {!workspace.members?.length ? <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-secondary">No team members yet.</p> : (
              <ul className="space-y-3">
                {workspace.members.map((member) => (
                  <li key={member.userId} className="flex items-center gap-3 rounded-2xl bg-surface-2/50 border border-border p-3">
                    {member.user?.studentProfile?.avatarUrl ? <img src={member.user.studentProfile.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent flex items-center justify-center text-sm font-semibold text-ivory">{member.user?.fullName?.[0] || 'M'}</span>}
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ivory truncate">{member.user?.fullName || 'Team member'}</p><p className="text-xs text-secondary">{member.roleTitle || (member.userId === workspace.ownerId ? 'Owner' : 'Member')}</p></div>
                    {isOwner && workspace.status !== 'completed' && member.userId !== workspace.ownerId && <button type="button" onClick={() => setPendingRemoval(member)} title="Remove member" aria-label={`Remove ${member.user?.fullName || 'member'}`} className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-surface-2/10"><Trash2 className="w-4 h-4" /></button>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-card rounded-2xl border border-border p-6 space-y-5">
            <div><h2 className="text-lg font-heading font-semibold text-ivory">Project progress</h2><p className="text-xs text-secondary mt-1">Completed milestones out of all milestones</p></div>
            <div className="flex items-end gap-3"><span className="text-2xl font-heading font-semibold text-ivory">{progress}%</span><span className="text-xs text-secondary pb-1">complete</span></div>
            <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-accent to-accent transition-all" style={{ width: `${progress}%` }} /></div>
            <div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-surface-2/50 p-3 text-secondary">{workspace.tasks?.filter((task) => task.status === 'done').length || 0} / {workspace.tasks?.length || 0} tasks done</div><div className="rounded-xl bg-surface-2/50 p-3 text-secondary">{workspace.milestones?.filter((milestone) => milestone.completed).length || 0} / {workspace.milestones?.length || 0} milestones complete</div></div>
          </section>

          <section className="glass-card rounded-2xl border border-border p-6 lg:col-span-2 space-y-4">
            <div><h2 className="text-lg font-heading font-semibold text-ivory">Team Gap Analysis</h2><p className="text-xs text-secondary mt-1">Highest skill level in the team compared with project requirements</p></div>
            {chartData.length ? <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart data={chartData} outerRadius="72%"><PolarGrid stroke="var(--color-border)" /><PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text)' }} /><Radar name="Needed" dataKey="needed" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.18} /><Radar name="Team has" dataKey="team" stroke="var(--color-text-secondary)" fill="var(--color-text-secondary)" fillOpacity={0.22} /></RadarChart></ResponsiveContainer></div> : <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-secondary">Project roles do not have required skills to compare yet.</div>}
            {chartData.length > 0 && <div className="flex justify-center gap-6 text-xs text-secondary"><span><i className="inline-block w-2.5 h-2.5 rounded-full bg-surface-2 mr-2" />Needed</span><span><i className="inline-block w-2.5 h-2.5 rounded-full bg-surface-2 mr-2" />Team has</span></div>}
          </section>
        </div>
      ) : activeTab === 'board' ? (
        <TaskBoard projectId={id} tasks={workspace.tasks || []} members={workspace.members || []} userId={user?.id} isOwner={isOwner} readOnly={workspace.status === 'completed'} onTasksChange={updateTasks} addToast={addToast} />
      ) : activeTab === 'milestones' ? (
        <MilestonesPanel projectId={id} milestones={workspace.milestones || []} isOwner={isOwner} readOnly={workspace.status === 'completed'} onMilestonesChange={updateMilestones} addToast={addToast} />
      ) : activeTab === 'announcements' ? (
        <AnnouncementsPanel projectId={id} isOwner={isOwner} readOnly={workspace.status === 'completed'} addToast={addToast} />
      ) : activeTab === 'chat' ? (
        <ChatPanel projectId={id} user={user} readOnly={workspace.status === 'completed'} addToast={addToast} />
      ) : (
        <section className="glass-card rounded-2xl border border-border p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-surface-2/10 border border-border/20 flex items-center justify-center text-secondary"><Users className="w-6 h-6" /></div>
          <h2 className="text-lg font-heading font-semibold text-ivory">{activeTab === 'announcements' ? 'Announcements' : 'Team chat'}</h2>
          <p className="text-sm text-secondary">{activeTab === 'announcements' ? 'Team updates will appear here soon.' : 'Project chat will be available here soon.'}</p>
        </section>
      )}
      {(pendingRemoval || confirmCompletion) && <div className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-sm grid place-items-center p-4" role="presentation"><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-border bg-surface-2 p-6 space-y-4"><h2 className="text-lg font-heading font-semibold text-ivory">{confirmCompletion ? 'Complete this project?' : 'Remove team member?'}</h2><p className="text-sm text-secondary">{confirmCompletion ? 'The workspace will become read-only for everyone.' : `${pendingRemoval?.user?.fullName || 'This member'} will lose workspace access. Their assigned tasks will become unassigned.`}</p><div className="flex justify-end gap-2"><button type="button" onClick={() => { setPendingRemoval(null); setConfirmCompletion(false); }} className="px-4 py-2 rounded-xl glass-panel text-xs text-secondary">Cancel</button><button type="button" disabled={completionSaving} onClick={() => confirmCompletion ? completeProject() : removeMember(pendingRemoval)} className="px-4 py-2 rounded-xl bg-surface-2/15 border border-border/25 text-xs font-semibold text-secondary disabled:opacity-50">{completionSaving ? 'Saving…' : confirmCompletion ? 'Complete project' : 'Remove member'}</button></div></section></div>}
    </main>
  );
}
