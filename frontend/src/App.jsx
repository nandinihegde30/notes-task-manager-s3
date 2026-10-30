import React from "react";
import Auth from "./Auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen, CheckSquare, Plus, Search, Sun, Moon, Pin, PinOff,
  Pencil, Trash2, X, CalendarDays, ListTodo, LayoutDashboard,
  CheckCircle2, Circle, AlertCircle, RefreshCw
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

async function request(path, options = {}) {
  const token = localStorage.getItem("noteflow-token");

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = response.status === 204
    ? null
    : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
}
function App() {
  function handleLogin(data) {
  localStorage.setItem("noteflow-token", data.token);
  localStorage.setItem("noteflow-user", JSON.stringify(data.user));

  setToken(data.token);
  setUser(data.user);
}

function logout() {
  localStorage.removeItem("noteflow-token");
  localStorage.removeItem("noteflow-user");

  setToken(null);
  setUser(null);

  setNotes([]);
  setTasks([]);
}
  const [token, setToken] = useState(
  () => localStorage.getItem("noteflow-token")
);

const [user, setUser] = useState(
  () => JSON.parse(localStorage.getItem("noteflow-user") || "null")
);
  const [theme, setTheme] = useState(() => localStorage.getItem("noteflow-theme") || "light");
  const [tab, setTab] = useState("notes");
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", description: "", priority: "medium", dueDate: "" });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("noteflow-theme", theme);
  }, [theme]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [noteData, taskData] = await Promise.all([
        request("/notes"),
        request("/tasks")
      ]);
      setNotes(noteData);
      setTasks(taskData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  if (token) {
    loadData();
  }
}, [token, loadData]);

  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase();
    return notes.filter(n => `${n.title} ${n.content}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [notes, search]);

  const filteredTasks = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter(t => `${t.title} ${t.description}`.toLowerCase().includes(q));
  }, [tasks, search]);

  const completedCount = tasks.filter(t => t.completed).length;

  function openNew() {
    setForm({ title: "", content: "", description: "", priority: "medium", dueDate: "" });
    setModal({ kind: tab, item: null });
  }

  function openEdit(kind, item) {
    setForm({
      title: item.title || "",
      content: item.content || "",
      description: item.description || "",
      priority: item.priority || "medium",
      dueDate: item.dueDate || ""
    });
    setModal({ kind, item });
  }

  async function submitForm(event) {
    event.preventDefault();
    try {
      const { kind, item } = modal;
      const isNote = kind === "notes";
      const payload = isNote
        ? { title: form.title, content: form.content }
        : { title: form.title, description: form.description, priority: form.priority, dueDate: form.dueDate };
      await request(item ? `/${kind}/${item.id}` : `/${kind}`, {
        method: item ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      setModal(null);
      await loadData();
    } catch (err) { setError(err.message); }
  }

  async function removeItem(kind, id) {
    if (!window.confirm(`Delete this ${kind === "notes" ? "note" : "task"}?`)) return;
    try {
      await request(`/${kind}/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) { setError(err.message); }
  }

  async function toggleNotePin(id) {
    try {
      await request(`/notes/${id}/pin`, { method: "PATCH" });
      await loadData();
    } catch (err) { setError(err.message); }
  }

  async function toggleTask(id) {
    try {
      await request(`/tasks/${id}/toggle`, { method: "PATCH" });
      await loadData();
    } catch (err) { setError(err.message); }
  }
  if (!token) {
  return <Auth onLogin={handleLogin} />;
}
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={e => e.preventDefault()}>
          <span className="brand-mark"><BookOpen size={21} /></span>
          <span>NoteFlow<span className="brand-dot">.</span></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <button className={`nav-link ${tab === "notes" ? "active" : ""}`} onClick={() => { setTab("notes"); setSearch(""); }}>
          <BookOpen size={18} /> Notes <span className="nav-count">{notes.length}</span>
        </button>
        <button className={`nav-link ${tab === "tasks" ? "active" : ""}`} onClick={() => { setTab("tasks"); setSearch(""); }}>
          <CheckSquare size={18} /> Tasks <span className="nav-count">{tasks.length}</span>
        </button>
        <div className="sidebar-bottom">
          <div className="storage-chip"><span className="online-dot" /> Connected to cloud storage</div>
          <div className="profile-row">
  <div className="avatar">
    {user?.name?.charAt(0).toUpperCase() || "U"}
  </div>

  <div>
    <strong>{user?.name || "My workspace"}</strong>
    <small>Personal space</small>
  </div>
</div>

<button
  className="nav-link"
  onClick={logout}
  style={{ marginTop: "10px" }}
>
  Logout
</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><BookOpen size={19} /></span> NoteFlow<span className="brand-dot">.</span></div>
          <div className="topbar-right">
            <button className="icon-button theme-button" title="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="avatar small-avatar">N</div>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow"><LayoutDashboard size={14} /> YOUR WORKSPACE</div>
            <h1>{tab === "notes" ? "Your notes" : "Task manager"}</h1>
            <p>{tab === "notes" ? "Capture ideas, keep thoughts organized." : "Plan your day and get things done."}</p>
          </div>
          <button className="primary-button" onClick={openNew}><Plus size={18} /> {tab === "notes" ? "New note" : "New task"}</button>
        </section>

        <section className="stats-row">
          <div className="stat-card"><div className="stat-icon purple"><BookOpen size={19} /></div><div><span>Total notes</span><strong>{notes.length}</strong></div></div>
          <div className="stat-card"><div className="stat-icon green"><CheckCircle2 size={19} /></div><div><span>Completed tasks</span><strong>{completedCount}/{tasks.length}</strong></div></div>
          <div className="stat-card"><div className="stat-icon amber"><Pin size={19} /></div><div><span>Pinned notes</span><strong>{notes.filter(n => n.pinned).length}</strong></div></div>
        </section>

        <section className="content-section">
          <div className="section-toolbar">
            <div className="tabs">
              <button className={tab === "notes" ? "tab active-tab" : "tab"} onClick={() => { setTab("notes"); setSearch(""); }}><BookOpen size={16} /> Notes</button>
              <button className={tab === "tasks" ? "tab active-tab" : "tab"} onClick={() => { setTab("tasks"); setSearch(""); }}><ListTodo size={16} /> Tasks</button>
            </div>
            <label className="search-field"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === "notes" ? "Search notes..." : "Search tasks..."} /><kbd>⌘ K</kbd></label>
          </div>

          {error && <div className="error-banner"><AlertCircle size={17} /> {error}<button onClick={() => setError("")}><X size={16} /></button></div>}
          {loading ? <div className="empty-state"><RefreshCw className="spin" size={25} /><p>Loading your workspace...</p></div> : tab === "notes" ? (
            filteredNotes.length ? <div className="notes-grid">
              {filteredNotes.map(note => <article className="note-card" key={note.id}>
                <div className="card-top"><span className="date-label">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  <button className={`pin-button ${note.pinned ? "is-pinned" : ""}`} title={note.pinned ? "Unpin note" : "Pin note"} onClick={() => toggleNotePin(note.id)}>{note.pinned ? <Pin size={16} /> : <PinOff size={16} />}</button>
                </div>
                <h3>{note.title}</h3><p className="note-body">{note.content}</p>
                <div className="card-footer"><span>{note.pinned ? "Pinned note" : "Note"}</span><div className="action-group"><button className="icon-button" title="Edit" onClick={() => openEdit("notes", note)}><Pencil size={16} /></button><button className="icon-button danger-hover" title="Delete" onClick={() => removeItem("notes", note.id)}><Trash2 size={16} /></button></div></div>
              </article>)}
            </div> : <EmptyState icon={<BookOpen size={30} />} title={search ? "No matching notes" : "Nothing here yet"} text={search ? "Try a different search." : "Create your first note and get your ideas flowing."} /> 
          ) : (
            filteredTasks.length ? <div className="tasks-list">
              {filteredTasks.map(task => <article className={`task-card ${task.completed ? "task-completed" : ""}`} key={task.id}>
                <button className="task-check" title="Toggle completion" onClick={() => toggleTask(task.id)}>{task.completed ? <CheckCircle2 size={21} /> : <Circle size={21} />}</button>
                <div className="task-info"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="task-meta"><span className={`priority ${task.priority}`}>{task.priority} priority</span>{task.dueDate && <span><CalendarDays size={13} /> {task.dueDate}</span>}</div></div>
                <div className="action-group"><button className="icon-button" title="Edit" onClick={() => openEdit("tasks", task)}><Pencil size={16} /></button><button className="icon-button danger-hover" title="Delete" onClick={() => removeItem("tasks", task.id)}><Trash2 size={16} /></button></div>
              </article>)}
            </div> : <EmptyState icon={<CheckSquare size={30} />} title={search ? "No matching tasks" : "All clear for now"} text={search ? "Try a different search." : "Add a task to start planning your day."} />
          )}
        </section>
        <footer className="footer">Made for clear thoughts and focused days <span>✦</span></footer>
      </main>

      {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
        <form className="modal" onSubmit={submitForm}>
          <div className="modal-heading"><div><span className="eyebrow">{modal.item ? "UPDATE ITEM" : "NEW ITEM"}</span><h2>{modal.item ? "Edit" : "Create"} {modal.kind === "notes" ? "note" : "task"}</h2></div><button type="button" className="icon-button" onClick={() => setModal(null)}><X size={19} /></button></div>
          <label>Title<input autoFocus required maxLength={180} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={modal.kind === "notes" ? "Give your note a title" : "What needs to get done?"} /></label>
          {modal.kind === "notes" ? <label>Content<textarea required rows={7} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write your thoughts here..." /></label> : <>
            <label>Description<textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add some details (optional)" /></label>
            <div className="form-row"><label>Priority<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Due date<input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label></div>
          </>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" type="submit">{modal.item ? "Save changes" : "Create"} <Plus size={16} /></button></div>
        </form>
      </div>}
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p></div>;
}

export default App;
