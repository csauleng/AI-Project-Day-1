import { useEffect, useRef, useCallback } from 'react'

export function useNotifications(enabled: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/check')
      if (!res.ok) return
      const { reminders } = await res.json()
      if (Array.isArray(reminders)) {
        reminders.forEach((t: { title: string }) => {
          new Notification('Todo Reminder', { body: t.title })
        })
      }
    } catch {
      // Silently ignore network errors
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }
    check()
    intervalRef.current = setInterval(check, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, check])
}
