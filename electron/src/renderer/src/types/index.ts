export type TimerStatus = 'idle' | 'running' | 'paused' | 'break'
export type SessionType = 'work' | 'shortBreak' | 'longBreak'
export type NotificationSound = 'default' | 'chime' | 'bell' | 'none'

export interface Preset {
  id: string
  name: string
  workDuration: number           // minutes
  shortBreakDuration: number     // minutes
  longBreakDuration: number      // minutes
  sessionsBeforeLongBreak: number
  color: string                  // hex, e.g. "#E53935"
  icon: string
  sortOrder: number
  builtIn: boolean
}

export interface TimerState {
  status: TimerStatus
  presetId: string
  startedAt: number | null       // Unix ms
  pausedAt: number | null        // Unix ms
  elapsed: number                // seconds already elapsed
  currentSession: number         // 1-indexed
  totalSessions: number
  isBreak: boolean
  updatedAt: number              // Unix ms
  updatedBy: string              // deviceId
}

export interface Session {
  id: string
  presetId: string
  tags: string[]
  projectName: string
  startedAt: number              // Unix ms
  endedAt: number                // Unix ms
  duration: number               // actual minutes
  type: SessionType
  completed: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
  totalSessions: number
  totalMinutes: number
}

export interface UserSettings {
  theme: 'light'
  defaultPresetId: string
  notificationSound: NotificationSound
}

export interface DailyStats {
  date: string                   // YYYY-MM-DD
  sessions: number
  minutes: number
}

export interface StatsData {
  todaySessions: number
  todayMinutes: number
  weekSessions: number
  weekMinutes: number
  streakDays: number
  daily: DailyStats[]
  byTag: Record<string, number>  // tag name → total minutes
  byProject: Record<string, number>
}

export const DEFAULT_TIMER_STATE: TimerState = {
  status: 'idle',
  presetId: '',
  startedAt: null,
  pausedAt: null,
  elapsed: 0,
  currentSession: 1,
  totalSessions: 4,
  isBreak: false,
  updatedAt: 0, // sentinel: not yet synced from Firestore
  updatedBy: '',
}
