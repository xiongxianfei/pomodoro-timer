import { describe, it, expect } from 'vitest'
import { exportToCsv, exportToJson } from '@/utils/export'
import type { Session } from '@/types'

const sessions: Session[] = [
  {
    id: 's1',
    presetId: 'preset-standard',
    tags: ['work', 'focus'],
    projectName: 'My Project',
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_001_500_000,
    duration: 25,
    type: 'work',
    completed: true,
  },
]

describe('exportToCsv', () => {
  it('produces CSV with header and one data row', () => {
    const csv = exportToCsv(sessions)
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('id,type,presetId,projectName,tags,startedAt,endedAt,duration,completed')
    expect(lines[1]).toContain('s1')
    expect(lines[1]).toContain('work;focus')
    expect(lines[1]).toContain('25')
  })

  it('returns only header for empty sessions', () => {
    const csv = exportToCsv([])
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(1)
  })
})

describe('exportToJson', () => {
  it('produces valid JSON array', () => {
    const json = exportToJson(sessions)
    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('s1')
  })
})
