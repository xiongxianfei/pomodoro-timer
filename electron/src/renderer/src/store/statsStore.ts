import { create } from 'zustand'
import { Session, StatsData, DailyStats } from '@/types'

function computeStats(sessions: Session[]): StatsData {
  const workSessions = sessions.filter((s) => s.type === 'work' && s.completed)
  const todayStr = new Date().toISOString().slice(0, 10)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const toDateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10)

  const todaySessions = workSessions.filter((s) => toDateStr(s.startedAt) === todayStr)
  const weekSessions = workSessions.filter((s) => s.startedAt >= weekStart.getTime())

  const daily: DailyStats[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const day = workSessions.filter((s) => toDateStr(s.startedAt) === dateStr)
    return { date: dateStr, sessions: day.length, minutes: day.reduce((a, s) => a + s.duration, 0) }
  })

  let streak = 0
  const checkDate = new Date()
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10)
    const has = workSessions.some((s) => toDateStr(s.startedAt) === dateStr)
    if (!has) break
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  const byTag: Record<string, number> = {}
  workSessions.forEach((s) =>
    s.tags.forEach((t) => { byTag[t] = (byTag[t] ?? 0) + s.duration })
  )

  const byProject: Record<string, number> = {}
  workSessions
    .filter((s) => s.projectName)
    .forEach((s) => { byProject[s.projectName] = (byProject[s.projectName] ?? 0) + s.duration })

  return {
    todaySessions: todaySessions.length,
    todayMinutes: todaySessions.reduce((a, s) => a + s.duration, 0),
    weekSessions: weekSessions.length,
    weekMinutes: weekSessions.reduce((a, s) => a + s.duration, 0),
    streakDays: streak,
    daily,
    byTag,
    byProject,
  }
}

interface StatsStore {
  sessions: Session[]
  stats: StatsData
  setSessions: (sessions: Session[]) => void
}

const emptyStats: StatsData = {
  todaySessions: 0, todayMinutes: 0,
  weekSessions: 0, weekMinutes: 0,
  streakDays: 0, daily: [], byTag: {}, byProject: {},
}

export const useStatsStore = create<StatsStore>((set) => ({
  sessions: [],
  stats: emptyStats,
  setSessions: (sessions) => set({ sessions, stats: computeStats(sessions) }),
}))
