import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'todos.db')

let _db: InstanceType<typeof Database> | null = null

function getDb(): InstanceType<typeof Database> {
  if (_db) return _db
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS authenticators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      device_type TEXT,
      backed_up INTEGER NOT NULL DEFAULT 0,
      transports TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
      due_date TEXT,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily','weekly','monthly','yearly')),
      reminder_minutes INTEGER,
      last_notification_sent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS todo_tags (
      todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (todo_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      title_template TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily','weekly','monthly','yearly')),
      reminder_minutes INTEGER,
      subtasks_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS challenges (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `)

  // Migrations
  try { _db.exec(`ALTER TABLE todos ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`) } catch { /* column already exists */ }

  return _db
}

// Proxy so existing code using `db.prepare(...)` still works — DB only opens on first actual use
const db = new Proxy({} as InstanceType<typeof Database>, {
  get(_target, prop) {
    return (getDb() as never)[prop as keyof InstanceType<typeof Database>]
  },
})

// ─── Types ───────────────────────────────────────────────────────────────────
export type Priority = 'high' | 'medium' | 'low'
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface User {
  id: number
  username: string
  created_at: string
}

export interface Authenticator {
  id: number
  user_id: number
  credential_id: string
  public_key: string
  counter: number
  device_type?: string
  backed_up: number
  transports?: string
  created_at: string
}

export interface Todo {
  id: number
  user_id: number
  title: string
  completed: number
  priority: Priority
  due_date?: string | null
  is_recurring: number
  recurrence_pattern?: RecurrencePattern | null
  reminder_minutes?: number | null
  last_notification_sent?: string | null
  created_at: string
  updated_at: string
  subtasks?: Subtask[]
  tags?: Tag[]
}

export interface Subtask {
  id: number
  todo_id: number
  title: string
  completed: number
  position: number
  created_at: string
}

export interface Tag {
  id: number
  user_id: number
  name: string
  color: string
  created_at: string
}

export interface Template {
  id: number
  user_id: number
  name: string
  description?: string | null
  category?: string | null
  title_template: string
  priority: Priority
  is_recurring: number
  recurrence_pattern?: RecurrencePattern | null
  reminder_minutes?: number | null
  subtasks_json?: string | null
  created_at: string
}

export interface Holiday {
  id: number
  date: string
  name: string
  created_at: string
}

// ─── User DB ─────────────────────────────────────────────────────────────────
export const userDB = {
  findByUsername: (username: string): User | undefined =>
    db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined,

  findById: (id: number): User | undefined =>
    db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined,

  create: (username: string): User => {
    const stmt = db.prepare('INSERT INTO users (username) VALUES (?) RETURNING *')
    return stmt.get(username) as User
  },
}

// ─── Authenticator DB ────────────────────────────────────────────────────────
export const authenticatorDB = {
  findByCredentialId: (credentialId: string): Authenticator | undefined =>
    db
      .prepare('SELECT * FROM authenticators WHERE credential_id = ?')
      .get(credentialId) as Authenticator | undefined,

  findByUserId: (userId: number): Authenticator[] =>
    db
      .prepare('SELECT * FROM authenticators WHERE user_id = ?')
      .all(userId) as Authenticator[],

  create: (data: Omit<Authenticator, 'id' | 'created_at'>): Authenticator => {
    const stmt = db.prepare(`
      INSERT INTO authenticators (user_id, credential_id, public_key, counter, device_type, backed_up, transports)
      VALUES (@user_id, @credential_id, @public_key, @counter, @device_type, @backed_up, @transports)
      RETURNING *
    `)
    return stmt.get(data) as Authenticator
  },

  updateCounter: (credentialId: string, counter: number): void => {
    db
      .prepare('UPDATE authenticators SET counter = ? WHERE credential_id = ?')
      .run(counter, credentialId)
  },
}

// ─── Todo DB ─────────────────────────────────────────────────────────────────
export const todoDB = {
  findByUserId: (userId: number): Todo[] => {
    const todos = db
      .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Todo[]

    for (const todo of todos) {
      todo.subtasks = subtaskDB.findByTodoId(todo.id)
      todo.tags = tagDB.findByTodoId(todo.id)
    }
    return todos
  },

  findById: (id: number, userId: number): Todo | undefined => {
    const todo = db
      .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
      .get(id, userId) as Todo | undefined
    if (todo) {
      todo.subtasks = subtaskDB.findByTodoId(todo.id)
      todo.tags = tagDB.findByTodoId(todo.id)
    }
    return todo
  },

  create: (data: {
    user_id: number
    title: string
    priority?: Priority
    due_date?: string | null
    is_recurring?: number
    recurrence_pattern?: RecurrencePattern | null
    reminder_minutes?: number | null
  }): Todo => {
    const stmt = db.prepare(`
      INSERT INTO todos (user_id, title, priority, due_date, is_recurring, recurrence_pattern, reminder_minutes)
      VALUES (@user_id, @title, @priority, @due_date, @is_recurring, @recurrence_pattern, @reminder_minutes)
      RETURNING *
    `)
    return stmt.get({
      user_id: data.user_id,
      title: data.title,
      priority: data.priority || 'medium',
      due_date: data.due_date ?? null,
      is_recurring: data.is_recurring ?? 0,
      recurrence_pattern: data.recurrence_pattern ?? null,
      reminder_minutes: data.reminder_minutes ?? null,
    }) as Todo
  },

  update: (id: number, userId: number, data: Partial<Todo>): Todo | undefined => {
    const fields: string[] = []
    const values: unknown[] = []

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed) }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority) }
    if ('due_date' in data) { fields.push('due_date = ?'); values.push(data.due_date ?? null) }
    if (data.is_recurring !== undefined) { fields.push('is_recurring = ?'); values.push(data.is_recurring) }
    if ('recurrence_pattern' in data) { fields.push('recurrence_pattern = ?'); values.push(data.recurrence_pattern ?? null) }
    if ('reminder_minutes' in data) { fields.push('reminder_minutes = ?'); values.push(data.reminder_minutes ?? null) }
    if ('last_notification_sent' in data) { fields.push('last_notification_sent = ?'); values.push(data.last_notification_sent ?? null) }

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id, userId)

    db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
    return todoDB.findById(id, userId)
  },

  delete: (id: number, userId: number): void => {
    db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, userId)
  },

  findDueReminders: (now: string): Todo[] =>
    db
      .prepare(`
        SELECT * FROM todos
        WHERE completed = 0
          AND due_date IS NOT NULL
          AND reminder_minutes IS NOT NULL
          AND (last_notification_sent IS NULL OR last_notification_sent != datetime(due_date, '-' || reminder_minutes || ' minutes'))
          AND datetime(due_date, '-' || reminder_minutes || ' minutes') <= ?
          AND due_date > ?
      `)
      .all(now, now) as Todo[],
}

// ─── Subtask DB ──────────────────────────────────────────────────────────────
export const subtaskDB = {
  findByTodoId: (todoId: number): Subtask[] =>
    db
      .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC')
      .all(todoId) as Subtask[],

  create: (todoId: number, title: string): Subtask => {
    const maxPos = (db
      .prepare('SELECT COALESCE(MAX(position), -1) as max FROM subtasks WHERE todo_id = ?')
      .get(todoId) as { max: number }).max
    const stmt = db.prepare(`
      INSERT INTO subtasks (todo_id, title, position)
      VALUES (?, ?, ?)
      RETURNING *
    `)
    return stmt.get(todoId, title, maxPos + 1) as Subtask
  },

  update: (id: number, todoId: number, data: { title?: string; completed?: number }): Subtask | undefined => {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed) }
    values.push(id, todoId)
    db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ? AND todo_id = ?`).run(...values)
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined
  },

  delete: (id: number, todoId: number): void => {
    db.prepare('DELETE FROM subtasks WHERE id = ? AND todo_id = ?').run(id, todoId)
  },
}

// ─── Tag DB ──────────────────────────────────────────────────────────────────
export const tagDB = {
  findByUserId: (userId: number): Tag[] =>
    db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId) as Tag[],

  findById: (id: number, userId: number): Tag | undefined =>
    db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, userId) as Tag | undefined,

  findByTodoId: (todoId: number): Tag[] =>
    db
      .prepare('SELECT t.* FROM tags t JOIN todo_tags tt ON tt.tag_id = t.id WHERE tt.todo_id = ?')
      .all(todoId) as Tag[],

  create: (userId: number, name: string, color: string): Tag => {
    const stmt = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?) RETURNING *')
    return stmt.get(userId, name, color) as Tag
  },

  update: (id: number, userId: number, data: { name?: string; color?: string }): Tag | undefined => {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color) }
    values.push(id, userId)
    db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
    return tagDB.findById(id, userId)
  },

  delete: (id: number, userId: number): void => {
    db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId)
  },

  setTodoTags: (todoId: number, tagIds: number[]): void => {
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(todoId)
    const stmt = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)')
    for (const tagId of tagIds) {
      stmt.run(todoId, tagId)
    }
  },
}

// ─── Template DB ─────────────────────────────────────────────────────────────
export const templateDB = {
  findByUserId: (userId: number): Template[] =>
    db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY name ASC').all(userId) as Template[],

  findById: (id: number, userId: number): Template | undefined =>
    db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(id, userId) as Template | undefined,

  create: (data: Omit<Template, 'id' | 'created_at'>): Template => {
    const stmt = db.prepare(`
      INSERT INTO templates (user_id, name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes, subtasks_json)
      VALUES (@user_id, @name, @description, @category, @title_template, @priority, @is_recurring, @recurrence_pattern, @reminder_minutes, @subtasks_json)
      RETURNING *
    `)
    return stmt.get(data) as Template
  },

  update: (id: number, userId: number, data: Partial<Omit<Template, 'id' | 'user_id' | 'created_at'>>): Template => {
    const existing = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(id, userId) as Template
    if (!existing) throw new Error('Template not found')
    const merged = { ...existing, ...data }
    db.prepare(`
      UPDATE templates SET name = @name, description = @description, category = @category,
      title_template = @title_template, priority = @priority, is_recurring = @is_recurring,
      recurrence_pattern = @recurrence_pattern, reminder_minutes = @reminder_minutes, subtasks_json = @subtasks_json
      WHERE id = @id AND user_id = @user_id
    `).run({ ...merged, id, user_id: userId })
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template
  },

  delete: (id: number, userId: number): void => {
    db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, userId)
  },
}

// ─── Holiday DB ──────────────────────────────────────────────────────────────
export const holidayDB = {
  findAll: (): Holiday[] =>
    db.prepare('SELECT * FROM holidays ORDER BY date ASC').all() as Holiday[],

  findByMonth: (year: number, month: number): Holiday[] => {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = `${year}-${String(month).padStart(2, '0')}-31`
    return db
      .prepare('SELECT * FROM holidays WHERE date >= ? AND date <= ?')
      .all(from, to) as Holiday[]
  },

  findByYear: (year: number): Holiday[] => {
    const from = `${year}-01-01`
    const to = `${year}-12-31`
    return db
      .prepare('SELECT * FROM holidays WHERE date >= ? AND date <= ?')
      .all(from, to) as Holiday[]
  },

  upsert: (date: string, name: string): void => {
    db.prepare('INSERT OR REPLACE INTO holidays (date, name) VALUES (?, ?)').run(date, name)
  },
}

// ─── Challenge DB (WebAuthn, persisted so cross-worker safe) ─────────────────
export const challengeDB = {
  set: (key: string, value: string): void => {
    db.prepare('INSERT OR REPLACE INTO challenges (key, value) VALUES (?, ?)').run(key, value)
  },

  get: (key: string): string | null => {
    const row = db.prepare('SELECT value FROM challenges WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  },

  delete: (key: string): void => {
    db.prepare('DELETE FROM challenges WHERE key = ?').run(key)
  },
}

export default db
