import type { Session } from '@/types'

const CSV_HEADER = 'id,type,presetId,projectName,tags,startedAt,endedAt,duration,completed'

export function exportToCsv(sessions: Session[]): string {
  const rows = sessions.map((s) =>
    [
      s.id,
      s.type,
      s.presetId,
      `"${s.projectName.replace(/"/g, '""')}"`,
      s.tags.join(';'),
      new Date(s.startedAt).toISOString(),
      new Date(s.endedAt).toISOString(),
      s.duration,
      s.completed,
    ].join(',')
  )
  return [CSV_HEADER, ...rows].join('\n')
}

export function exportToJson(sessions: Session[]): string {
  return JSON.stringify(sessions, null, 2)
}
