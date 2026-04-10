import { useStatsStore } from '@/store/statsStore'

function formatDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function HistoryScreen() {
  const sessions = useStatsStore((s) => s.sessions)

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No sessions yet. Start your first Pomodoro!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-6 overflow-y-auto h-full">
      <h2 className="text-xl font-medium">History</h2>
      {sessions.map((s) => (
        <div key={s.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-medium capitalize">{s.type.replace(/([A-Z])/g, ' $1')}</span>
              <span className="text-gray-400 ml-2 text-sm">· {s.duration} min</span>
            </div>
            <span className="text-gray-400 text-sm">{formatDate(s.startedAt)}</span>
          </div>
          {s.projectName && <p className="text-sm text-gray-500 mt-1">Project: {s.projectName}</p>}
          {s.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {s.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
