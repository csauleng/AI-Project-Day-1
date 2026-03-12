'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/hooks/useNotifications'

type Priority = 'high' | 'medium' | 'low'
type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface Subtask {
  id: number
  todo_id: number
  title: string
  completed: number
  position: number
}

interface Tag {
  id: number
  name: string
  color: string
}

interface Todo {
  id: number
  title: string
  completed: number
  priority: Priority
  due_date: string | null
  is_recurring: number
  recurrence_pattern: RecurrencePattern | null
  reminder_minutes: number | null
  created_at: string
  subtasks?: Subtask[]
  tags?: Tag[]
}

interface Template {
  id: number
  name: string
  description: string | null
  category: string | null
  title_template: string
  priority: Priority
  is_recurring: number
  recurrence_pattern: RecurrencePattern | null
  reminder_minutes: number | null
  subtasks_json: string | null
}

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

const REMINDER_OPTIONS = [
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hr before' },
  { value: 120, label: '2 hrs before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
]

export default function HomePage() {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  // Add form state
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newIsRecurring, setNewIsRecurring] = useState(false)
  const [newRecurrence, setNewRecurrence] = useState<RecurrencePattern>('weekly')
  const [newReminder, setNewReminder] = useState<number | ''>('')
  const [newTagIds, setNewTagIds] = useState<number[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | ''>('')

  // Filter state
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')
  const [filterTag, setFilterTag] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Subtask state
  const [expandedTodos, setExpandedTodos] = useState<Set<number>>(new Set())
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<number, string>>({})

  // Edit modal state
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('medium')
  const [editDueDate, setEditDueDate] = useState('')
  const [editIsRecurring, setEditIsRecurring] = useState(false)
  const [editRecurrence, setEditRecurrence] = useState<RecurrencePattern>('weekly')
  const [editReminder, setEditReminder] = useState<number | ''>('')
  const [editTagIds, setEditTagIds] = useState<number[]>([])

  // Tag modal state
  const [showTagModal, setShowTagModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')
  const [editingTagId, setEditingTagId] = useState<number | null>(null)
  const [editTagNameVal, setEditTagNameVal] = useState('')
  const [editTagColorVal, setEditTagColorVal] = useState('#3B82F6')

  // Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('')

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [notifEnabled, setNotifEnabled] = useState(false)
  const [username, setUsername] = useState('')
  const [showAddAdvanced, setShowAddAdvanced] = useState(false)
  const [showDataDropdown, setShowDataDropdown] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useNotifications(notifEnabled)

  const loadAll = useCallback(async () => {
    try {
      const [todosRes, tagsRes, templatesRes, meRes] = await Promise.all([
        fetch('/api/todos'),
        fetch('/api/tags'),
        fetch('/api/templates'),
        fetch('/api/auth/me'),
      ])
      if (todosRes.status === 401) { router.push('/login'); return }
      if (todosRes.ok) setTodos(await todosRes.json())
      if (tagsRes.ok) setTags(await tagsRes.json())
      if (templatesRes.ok) setTemplates(await templatesRes.json())
      if (meRes.ok) { const me = await meRes.json(); setUsername(me.username || '') }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadAll()
    if (localStorage.getItem('darkMode') === 'true') setDarkMode(true)
  }, [loadAll])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  function getSingaporeNowStr() {
    // Returns "YYYY-MM-DDTHH:MM" in Singapore time (UTC+8)
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
  }

  function toSingaporeISO(localDT: string): string {
    // Treat the naive datetime-local value as Singapore time
    return localDT ? `${localDT}:00+08:00` : ''
  }

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    if (newDueDate && newDueDate < getSingaporeNowStr()) {
      alert('Due date and time must be in the future (Singapore time).')
      return
    }
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(), priority: newPriority,
        due_date: newDueDate ? toSingaporeISO(newDueDate) : null,
        is_recurring: newIsRecurring ? 1 : 0,
        recurrence_pattern: newIsRecurring ? newRecurrence : null,
        reminder_minutes: newReminder || null,
        tag_ids: newTagIds,
      }),
    })
    if (res.ok) {
      setNewTitle(''); setNewDueDate(''); setNewIsRecurring(false)
      setNewReminder(''); setNewTagIds([]); setSelectedTemplate('')
      loadAll()
    }
  }

  async function handleToggle(todo: Todo) {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: todo.completed ? 0 : 1 }),
    })
    loadAll()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this todo?')) return
    await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    loadAll()
  }

  function openEdit(todo: Todo) {
    setEditTodo(todo); setEditTitle(todo.title); setEditPriority(todo.priority)
    setEditDueDate(todo.due_date ? new Date(todo.due_date).toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T') : '')
    setEditIsRecurring(!!todo.is_recurring)
    setEditRecurrence(todo.recurrence_pattern || 'weekly')
    setEditReminder(todo.reminder_minutes || '')
    setEditTagIds(todo.tags?.map((t) => t.id) || [])
  }

  async function handleEditSave() {
    if (!editTodo) return
    if (editDueDate && editDueDate < getSingaporeNowStr()) {
      alert('Due date and time must be in the future (Singapore time).')
      return
    }
    await fetch(`/api/todos/${editTodo.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle, priority: editPriority,
        due_date: editDueDate ? toSingaporeISO(editDueDate) : null,
        is_recurring: editIsRecurring ? 1 : 0,
        recurrence_pattern: editIsRecurring ? editRecurrence : null,
        reminder_minutes: editReminder || null,
        tag_ids: editTagIds,
      }),
    })
    setEditTodo(null); loadAll()
  }

  async function handleAddSubtask(todoId: number) {
    const title = newSubtaskTitles[todoId]?.trim()
    if (!title) return
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_subtask', subtask_title: title }),
    })
    setNewSubtaskTitles((prev) => ({ ...prev, [todoId]: '' })); loadAll()
  }

  async function handleToggleSubtask(todoId: number, subtaskId: number, completed: number) {
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_subtask', subtask_id: subtaskId, subtask_completed: completed ? 0 : 1 }),
    })
    loadAll()
  }

  async function handleDeleteSubtask(todoId: number, subtaskId: number) {
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_subtask', subtask_id: subtaskId }),
    })
    loadAll()
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    await fetch('/api/tags', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    })
    setNewTagName(''); setNewTagColor('#3B82F6'); loadAll()
  }

  async function handleUpdateTag(id: number) {
    if (!editTagNameVal.trim()) return
    await fetch(`/api/tags/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editTagNameVal.trim(), color: editTagColorVal }),
    })
    setEditingTagId(null); loadAll()
  }

  async function handleDeleteTag(id: number) {
    if (!confirm('Delete this tag?')) return
    await fetch(`/api/tags/${id}`, { method: 'DELETE' }); loadAll()
  }

  async function handleUseTemplate(templateId: number) {
    const res = await fetch(`/api/templates/${templateId}`, { method: 'POST' })
    if (res.ok) { setShowTemplateModal(false); loadAll() }
  }

  async function handleDeleteTemplate(id: number) {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' }); loadAll()
  }

  async function handleSaveTemplate() {
    if (!templateName.trim() || !newTitle.trim()) return
    await fetch('/api/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName, description: templateDesc || null,
        category: templateCategory || null, title_template: newTitle,
        priority: newPriority, is_recurring: newIsRecurring ? 1 : 0,
        recurrence_pattern: newIsRecurring ? newRecurrence : null,
        reminder_minutes: newReminder || null,
      }),
    })
    setShowSaveTemplate(false); setTemplateName(''); setTemplateDesc(''); setTemplateCategory(''); loadAll()
  }

  function applyTemplate(id: number | '') {
    setSelectedTemplate(id)
    if (!id) return
    const t = templates.find((t) => t.id === id)
    if (!t) return
    setNewTitle(t.title_template); setNewPriority(t.priority)
    setNewIsRecurring(!!t.is_recurring)
    if (t.recurrence_pattern) setNewRecurrence(t.recurrence_pattern)
    setNewReminder(t.reminder_minutes || '')
  }

  async function handleEnableNotifications() {
    if (!('Notification' in window)) return alert('Notifications not supported')
    const perm = await Notification.requestPermission()
    if (perm === 'granted') setNotifEnabled(true)
    else alert('Notification permission denied')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      await fetch('/api/todos/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      loadAll()
    } catch { alert('Invalid import file') }
    if (importRef.current) importRef.current.value = ''
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // Filter & sort
  const filtered = todos.filter((t) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      const matchesTitle = t.title.toLowerCase().includes(q)
      const matchesTag = t.tags?.some((tag) => tag.name.toLowerCase().includes(q))
      if (!matchesTitle && !matchesTag) return false
    }
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterTag && !t.tags?.some((tag) => tag.id === filterTag)) return false
    if (filterStatus === 'pending' && t.completed) return false
    if (filterStatus === 'completed' && !t.completed) return false
    if (filterDateFrom && t.due_date && t.due_date < filterDateFrom) return false
    if (filterDateTo && t.due_date && t.due_date > filterDateTo + 'T23:59:59') return false
    return true
  })

  const nowMs = Date.now()
  const overdue = filtered.filter((t) => !t.completed && t.due_date && new Date(t.due_date).getTime() < nowMs)
  const pending = filtered.filter((t) => !t.completed && (!t.due_date || new Date(t.due_date).getTime() >= nowMs))
  const completed = filtered.filter((t) => !!t.completed)

  const byPriDate = (a: Todo, b: Todo) => {
    const o: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
    if (o[a.priority] !== o[b.priority]) return o[a.priority] - o[b.priority]
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    return a.due_date ? -1 : b.due_date ? 1 : 0
  }
  overdue.sort(byPriDate); pending.sort(byPriDate)

  const renderTodo = (todo: Todo) => {
    const isExpanded = expandedTodos.has(todo.id)
    const subtasks = todo.subtasks || []
    const done = subtasks.filter((s) => s.completed).length
    return (
      <div key={todo.id} className={`rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm ${todo.completed ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <input type="checkbox" checked={!!todo.completed} onChange={() => handleToggle(todo)} className="w-4 h-4 cursor-pointer shrink-0" />
          <span className={`flex-1 text-sm font-medium dark:text-gray-100 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{todo.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${PRIORITY_COLORS[todo.priority]}`}>{todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-4 text-center">{subtasks.length}</span>
          <button onClick={() => setExpandedTodos((p) => { const n = new Set(p); n.has(todo.id) ? n.delete(todo.id) : n.add(todo.id); return n })} className="text-gray-400 hover:text-blue-500 shrink-0 text-xs">
            {isExpanded ? '▼' : '▶'}
          </button>
          <button onClick={() => openEdit(todo)} className="text-sm text-blue-500 hover:text-blue-700 shrink-0">Edit</button>
          <button onClick={() => handleDelete(todo.id)} className="text-sm text-red-500 hover:text-red-700 shrink-0">Del</button>
        </div>
        {isExpanded && (
          <div className="px-4 pb-3 border-t dark:border-gray-700 pt-2 space-y-1.5">
            {subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <input type="checkbox" checked={!!s.completed} onChange={() => handleToggleSubtask(todo.id, s.id, s.completed)} className="w-3.5 h-3.5 cursor-pointer" />
                <span className={`text-sm flex-1 ${s.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{s.title}</span>
                <button onClick={() => handleDeleteSubtask(todo.id, s.id)} className="text-xs text-gray-300 hover:text-red-400">✕</button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input type="text" placeholder="Add subtask..." value={newSubtaskTitles[todo.id] || ''}
                onChange={(e) => setNewSubtaskTitles((p) => ({ ...p, [todo.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(todo.id) }}
                className="text-sm flex-1 border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
              <button onClick={() => handleAddSubtask(todo.id)} className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Add</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="text-gray-500">Loading...</div></div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold dark:text-white">Todo App</h1>
            {username && <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, {username}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button onClick={() => setShowDataDropdown((v) => !v)} className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 flex items-center gap-1">
                <span>⋮</span> Data
              </button>
              {showDataDropdown && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-30 overflow-hidden">
                  <button onClick={() => { window.open('/api/todos/export'); setShowDataDropdown(false) }} className="w-full text-left text-sm px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">⬇️ Export JSON</button>
                  <button onClick={() => { window.open('/api/todos/export?format=csv'); setShowDataDropdown(false) }} className="w-full text-left text-sm px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">⬇️ Export CSV</button>
                  <label className="w-full text-left text-sm px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer block">
                    ⬆️ Import<input ref={importRef} type="file" accept=".json" className="hidden" onChange={(e) => { handleImport(e); setShowDataDropdown(false) }} />
                  </label>
                  <button onClick={() => { setShowTagModal(true); setShowDataDropdown(false) }} className="w-full text-left text-sm px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">🏷️ Tags</button>
                  <button onClick={() => { setDarkMode((d) => !d); setShowDataDropdown(false) }} className="w-full text-left text-sm px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">{darkMode ? '☀️ Light' : '🌙 Dark'}</button>
                </div>
              )}
            </div>
            <button onClick={() => router.push('/calendar')} className="text-sm px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700">📅 Calendar</button>
            <button onClick={() => setShowTemplateModal(true)} className="text-sm px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700">📋 Templates</button>
            <button onClick={notifEnabled ? () => setNotifEnabled(false) : handleEnableNotifications} className={`text-sm px-3 py-1.5 rounded-lg ${notifEnabled ? 'bg-orange-400 text-white hover:bg-orange-500' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>🔔</button>
            <button onClick={handleLogout} className="text-sm px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Add Todo */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <form onSubmit={handleAddTodo} className="space-y-3">
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add a new todo..." required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)} className="text-sm border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
              <div className="flex-1 flex items-center gap-1">
                <input type="datetime-local" value={newDueDate} min={getSingaporeNowStr()} onChange={(e) => setNewDueDate(e.target.value)} className="flex-1 text-sm border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                {newDueDate && <button type="button" onClick={() => { setNewDueDate(''); setNewReminder('') }} className="text-gray-400 hover:text-red-500 text-lg leading-none" title="Clear date">✕</button>}
              </div>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">Add</button>
            </div>
            <button type="button" onClick={() => setShowAddAdvanced((v) => !v)} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
              {showAddAdvanced ? '↑ Hide Advanced Options' : '↓ Show Advanced Options'}
            </button>
            {showAddAdvanced && (
              <div className="space-y-2 pt-1 border-t dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <label className="flex items-center gap-1.5 text-sm dark:text-gray-200 cursor-pointer">
                    <input type="checkbox" checked={newIsRecurring} onChange={(e) => setNewIsRecurring(e.target.checked)} /> Repeat
                    {newIsRecurring && <select value={newRecurrence} onChange={(e) => setNewRecurrence(e.target.value as RecurrencePattern)} className="ml-1 text-sm border rounded-lg px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                      <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                    </select>}
                  </label>
                  <label className="flex items-center gap-1.5 text-sm dark:text-gray-200">
                    Reminder:
                    <select value={newReminder} disabled={!newDueDate} onChange={(e) => setNewReminder(e.target.value ? Number(e.target.value) : '')} className="text-sm border rounded-lg px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed" title={!newDueDate ? 'Set a due date first' : undefined}>
                      <option value="">None</option>
                      {REMINDER_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm dark:text-gray-200">
                  <span className="shrink-0">Use Template:</span>
                  <select value={selectedTemplate} onChange={(e) => applyTemplate(e.target.value ? Number(e.target.value) : '')} className="text-sm border rounded-lg px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                    <option value="">Select a template...</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.category ? ` (${t.category})` : ''}</option>)}
                  </select>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tags.map((tag) => (
                      <button key={tag.id} type="button"
                        onClick={() => setNewTagIds((p) => p.includes(tag.id) ? p.filter((x) => x !== tag.id) : [...p, tag.id])}
                        className={`text-xs px-2 py-1 rounded-full border transition-all ${newTagIds.includes(tag.id) ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                        style={newTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                      >{tag.name}</button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setShowSaveTemplate(true)} disabled={!newTitle.trim()} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-40">💾 Save as Template</button>
              </div>
            )}
          </form>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => setDebouncedSearch(e.target.value), 300) }} placeholder="Search todos and subtasks..." className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2">
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as Priority | '')} className="text-sm border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
              <option value="">All Priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <button onClick={() => setShowAdvanced((v) => !v)} className={`text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-1 ${showAdvanced ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} hover:bg-blue-700`}>
              {showAdvanced ? '▲' : '▼'} Advanced
            </button>
          </div>
          {showAdvanced && (
            <div className="border dark:border-gray-700 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-sm dark:text-gray-200">Advanced Filters</h3>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Completion Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'completed')} className="w-full text-sm border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                  <option value="all">All Todos</option><option value="pending">Pending Only</option><option value="completed">Completed Only</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Due Date From</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Due Date To</label>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                </div>
              </div>
              {tags.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Tag</label>
                  <select value={filterTag} onChange={(e) => setFilterTag(e.target.value ? Number(e.target.value) : '')} className="w-full text-sm border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                    <option value="">All Tags</option>
                    {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <button onClick={() => { setSearch(''); setDebouncedSearch(''); setFilterPriority(''); setFilterTag(''); setFilterStatus('all'); setFilterDateFrom(''); setFilterDateTo('') }} className="text-xs text-red-500 hover:text-red-700">Clear all filters</button>
            </div>
          )}
        </div>

        {/* Overdue */}
        {overdue.length > 0 && <section className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4"><h2 className="text-sm font-semibold text-red-600 mb-2">⚠️ Overdue ({overdue.length})</h2><div className="space-y-2">{overdue.map((t) => renderTodo(t))}</div></section>}

        {/* Pending */}
        <section>
          <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">Pending ({pending.length})</h2>
          {pending.length === 0 ? <p className="text-center text-gray-400 py-8">No pending todos 🎉</p> : <div className="space-y-2">{pending.map(renderTodo)}</div>}
        </section>

        {/* Completed */}
        {completed.length > 0 && <section><h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">Completed ({completed.length})</h2><div className="space-y-2">{completed.map(renderTodo)}</div></section>}
      </main>

      {/* Footer Stats */}
      <footer className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{overdue.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{pending.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{completed.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
          </div>
        </div>
      </footer>

      {/* Edit Modal */}
      {editTodo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold dark:text-white">Edit Todo</h2>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
            <div className="flex gap-2 flex-wrap">
              <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as Priority)} className="text-sm border rounded-lg px-2 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option value="high">🔴 High</option><option value="medium">🟡 Medium</option><option value="low">🔵 Low</option>
              </select>
              <label className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400 dark:text-gray-500">Due date (optional)</span>
                <div className="flex items-center gap-1">
                  <input type="datetime-local" value={editDueDate} min={getSingaporeNowStr()} onChange={(e) => setEditDueDate(e.target.value)} className="text-sm border rounded-lg px-2 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                  {editDueDate && <button type="button" onClick={() => { setEditDueDate(''); setEditReminder('') }} className="text-gray-400 hover:text-red-500 text-lg leading-none" title="Clear date">✕</button>}
                </div>
              </label>
              <select value={editReminder} disabled={!editDueDate} onChange={(e) => setEditReminder(e.target.value ? Number(e.target.value) : '')} className="text-sm border rounded-lg px-2 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed" title={!editDueDate ? 'Set a due date first' : undefined}>
                <option value="">No reminder</option>
                {REMINDER_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm dark:text-gray-200">
              <input type="checkbox" checked={editIsRecurring} onChange={(e) => setEditIsRecurring(e.target.checked)} /> Recurring
              {editIsRecurring && <select value={editRecurrence} onChange={(e) => setEditRecurrence(e.target.value as RecurrencePattern)} className="ml-1 text-sm border rounded-lg px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              </select>}
            </label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button key={tag.id} type="button"
                    onClick={() => setEditTagIds((p) => p.includes(tag.id) ? p.filter((x) => x !== tag.id) : [...p, tag.id])}
                    className={`text-xs px-2 py-1 rounded-full border transition-all ${editTagIds.includes(tag.id) ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600'}`}
                    style={editTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >{tag.name}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditTodo(null)} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleEditSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold dark:text-white">🏷️ Manage Tags</h2>
            <div className="flex gap-2">
              <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Tag name" onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag() }} className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
              <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-10 h-10 border rounded cursor-pointer" />
              <button onClick={handleCreateTag} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Add</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2 p-2 rounded-lg border dark:border-gray-700">
                  {editingTagId === tag.id ? (
                    <>
                      <input type="color" value={editTagColorVal} onChange={(e) => setEditTagColorVal(e.target.value)} className="w-7 h-7 border rounded cursor-pointer shrink-0" />
                      <input type="text" value={editTagNameVal} onChange={(e) => setEditTagNameVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTag(tag.id); if (e.key === 'Escape') setEditingTagId(null) }} autoFocus className="flex-1 text-sm border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                      <button onClick={() => handleUpdateTag(tag.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                      <button onClick={() => setEditingTagId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </>
                  ) : (
                    <>
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="flex-1 text-sm dark:text-gray-200">{tag.name}</span>
                      <button onClick={() => { setEditingTagId(tag.id); setEditTagNameVal(tag.name); setEditTagColorVal(tag.color) }} className="text-gray-400 hover:text-blue-500 text-sm">✏️</button>
                      <button onClick={() => handleDeleteTag(tag.id)} className="text-gray-400 hover:text-red-500">🗑️</button>
                    </>
                  )}
                </div>
              ))}
              {tags.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No tags yet</p>}
            </div>
            <button onClick={() => setShowTagModal(false)} className="w-full py-2 border rounded-lg text-sm dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Close</button>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold dark:text-white">📋 Templates</h2>
            {(() => { const cats = [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[]; return cats.length > 0 ? (
              <select value={templateCategoryFilter} onChange={(e) => setTemplateCategoryFilter(e.target.value)} className="w-full text-sm border rounded-lg px-2 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option value="">All categories</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : null })()} 
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {templates.filter((t) => !templateCategoryFilter || t.category === templateCategoryFilter).map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-3 rounded-lg border dark:border-gray-700">
                  <div className="flex-1">
                    <div className="font-medium text-sm dark:text-gray-200">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">&ldquo;{t.title_template}&rdquo; · {t.priority}</div>
                  </div>
                  <button onClick={() => handleUseTemplate(t.id)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 shrink-0">Use</button>
                  <button onClick={() => handleDeleteTemplate(t.id)} className="text-gray-400 hover:text-red-500 shrink-0">🗑️</button>
                </div>
              ))}
              {templates.filter((t) => !templateCategoryFilter || t.category === templateCategoryFilter).length === 0 && <p className="text-center text-gray-400 text-sm py-4">{templates.length === 0 ? 'No templates yet' : 'No templates in this category'}</p>}
            </div>
            <button onClick={() => setShowTemplateModal(false)} className="w-full py-2 border rounded-lg text-sm dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Close</button>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-3">
            <h2 className="text-lg font-bold dark:text-white">Save as Template</h2>
            <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name *" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
            <input type="text" value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="Description (optional)" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
            <input type="text" value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)} placeholder="Category (optional)" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveTemplate(false)} className="flex-1 py-2 border rounded-lg text-sm dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSaveTemplate} disabled={!templateName.trim()} className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
