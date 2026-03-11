import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'todos.db')

interface Holiday {
  date: string
  name: string
}

const holidays2024: Holiday[] = [
  { date: '2024-01-01', name: "New Year's Day" },
  { date: '2024-02-10', name: 'Chinese New Year' },
  { date: '2024-02-11', name: 'Chinese New Year (Day 2)' },
  { date: '2024-03-29', name: 'Good Friday' },
  { date: '2024-04-10', name: 'Hari Raya Puasa' },
  { date: '2024-05-01', name: 'Labour Day' },
  { date: '2024-05-23', name: 'Vesak Day' },
  { date: '2024-06-17', name: 'Hari Raya Haji' },
  { date: '2024-08-09', name: 'National Day' },
  { date: '2024-10-31', name: 'Deepavali' },
  { date: '2024-12-25', name: 'Christmas Day' },
]

const holidays2025: Holiday[] = [
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Chinese New Year (Day 2)' },
  { date: '2025-03-31', name: 'Hari Raya Puasa' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-12', name: 'Vesak Day' },
  { date: '2025-06-06', name: 'Hari Raya Haji' },
  { date: '2025-08-09', name: 'National Day' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-12-25', name: 'Christmas Day' },
]

const holidays2026: Holiday[] = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-18', name: 'Chinese New Year (Day 2)' },
  { date: '2026-03-20', name: 'Hari Raya Puasa' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-31', name: 'Vesak Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-08-09', name: 'National Day' },
  { date: '2026-11-08', name: 'Deepavali' },
  { date: '2026-12-25', name: 'Christmas Day' },
]

const db = new Database(DB_PATH)

// Ensure the holidays table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const upsert = db.prepare(`
  INSERT INTO holidays (date, name, created_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(date) DO UPDATE SET name = excluded.name
`)

const allHolidays = [...holidays2024, ...holidays2025, ...holidays2026]
let inserted = 0

for (const h of allHolidays) {
  upsert.run(h.date, h.name)
  inserted++
}

console.log(`Seeded ${inserted} Singapore public holidays (2024–2026).`)
db.close()
