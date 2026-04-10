import {
  doc,
  collection,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  Unsubscribe,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from './config'
import type { TimerState, Session, Preset, Tag } from '@/types'
import { getCurrentUser } from './auth'

function uid(): string {
  const user = getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return user.uid
}

function userRef() {
  return doc(db, 'users', uid())
}

// --- Timer State ---

export function subscribeToTimerState(
  callback: (state: TimerState | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(userRef(), 'timerState', 'timerState'),
    (snap: DocumentSnapshot) => {
      if (!snap.exists()) { callback(null); return }
      const d = snap.data()!
      callback({
        status: d.status ?? 'idle',
        presetId: d.presetId ?? '',
        startedAt: d.startedAt ? (d.startedAt as Timestamp).toMillis() : null,
        pausedAt: d.pausedAt ? (d.pausedAt as Timestamp).toMillis() : null,
        elapsed: d.elapsed ?? 0,
        currentSession: d.currentSession ?? 1,
        totalSessions: d.totalSessions ?? 4,
        isBreak: d.isBreak ?? false,
        updatedAt: d.updatedAt ? (d.updatedAt as Timestamp).toMillis() : 0,
        updatedBy: d.updatedBy ?? '',
      })
    }
  )
}

export async function writeTimerState(state: Omit<TimerState, 'updatedAt'>, deviceId: string): Promise<void> {
  await setDoc(doc(userRef(), 'timerState', 'timerState'), {
    ...state,
    startedAt: state.startedAt ? Timestamp.fromMillis(state.startedAt) : null,
    pausedAt: state.pausedAt ? Timestamp.fromMillis(state.pausedAt) : null,
    updatedAt: serverTimestamp(),
    updatedBy: deviceId,
  })
}

// --- Sessions ---

export async function writeSession(session: Session): Promise<void> {
  await setDoc(doc(userRef(), 'sessions', session.id), {
    ...session,
    startedAt: Timestamp.fromMillis(session.startedAt),
    endedAt: Timestamp.fromMillis(session.endedAt),
  })
  // Update denormalized tag counters for completed work sessions
  if (session.completed && session.type === 'work') {
    for (const tagName of session.tags) {
      const tagId = tagName.toLowerCase().replace(/\s+/g, '-')
      await setDoc(
        doc(userRef(), 'tags', tagId),
        {
          name: tagName,
          color: '#888888',
          totalSessions: increment(1),
          totalMinutes: increment(session.duration),
        },
        { merge: true }
      )
    }
  }
}

export function subscribeToRecentSessions(
  limitCount: number,
  callback: (sessions: Session[]) => void
): Unsubscribe {
  const q = query(
    collection(userRef(), 'sessions'),
    orderBy('startedAt', 'desc'),
    limit(limitCount)
  )
  return onSnapshot(q, (snap: QuerySnapshot) => {
    const sessions: Session[] = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        presetId: data.presetId ?? '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        projectName: data.projectName ?? '',
        startedAt: (data.startedAt as Timestamp).toMillis(),
        endedAt: (data.endedAt as Timestamp).toMillis(),
        duration: data.duration ?? 0,
        type: data.type ?? 'work',
        completed: data.completed ?? false,
      }
    })
    callback(sessions)
  })
}

// --- Presets ---

export function subscribeToPresets(callback: (presets: Preset[]) => void): Unsubscribe {
  const q = query(collection(userRef(), 'presets'), orderBy('sortOrder'))
  return onSnapshot(q, (snap: QuerySnapshot) => {
    const presets: Preset[] = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? '',
      workDuration: d.data().workDuration ?? 25,
      shortBreakDuration: d.data().shortBreakDuration ?? 5,
      longBreakDuration: d.data().longBreakDuration ?? 15,
      sessionsBeforeLongBreak: d.data().sessionsBeforeLongBreak ?? 4,
      color: d.data().color ?? '#E53935',
      icon: d.data().icon ?? 'timer',
      sortOrder: d.data().sortOrder ?? 0,
      builtIn: d.data().builtIn ?? false,
    }))
    callback(presets)
  })
}

export async function writePreset(preset: Preset): Promise<void> {
  const { id, ...data } = preset
  await setDoc(doc(userRef(), 'presets', id), data)
}

// --- Tags ---

export function subscribeToTags(callback: (tags: Tag[]) => void): Unsubscribe {
  const q = query(collection(userRef(), 'tags'), orderBy('name'))
  return onSnapshot(q, (snap: QuerySnapshot) => {
    const tags: Tag[] = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? '',
      color: d.data().color ?? '#888888',
      totalSessions: d.data().totalSessions ?? 0,
      totalMinutes: d.data().totalMinutes ?? 0,
    }))
    callback(tags)
  })
}
