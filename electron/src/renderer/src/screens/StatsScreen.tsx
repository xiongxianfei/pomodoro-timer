import { useStatsStore } from '@/store/statsStore'
import { exportToCsv, exportToJson } from '@/utils/export'

export function StatsScreen() {
  const { stats, sessions } = useStatsStore()

  function handleExport(format: 'csv' | 'json') {
    const content = format === 'csv' ? exportToCsv(sessions) : exportToJson(sessions)
    const type = format === 'csv' ? 'text/csv' : 'application/json'
    const ext = format === 'csv' ? 'csv' : 'json'
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pomodoro_sessions_${new Date().toISOString().slice(0, 10)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      <h2 className="text-xl font-medium">Statistics</h2>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Today', value: `${stats.todaySessions} sessions` },
          { label: 'Focus time today', value: `${stats.todayMinutes} min` },
          { label: 'Streak', value: `${stats.streakDays} day${stats.streakDays !== 1 ? 's' : ''}` },
        ].map(({ label, value }) => (
          <div key={label} className="border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-light mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="border border-gray-100 rounded-xl p-4">
        <p className="text-sm font-medium mb-3">Last 7 Days</p>
        <div className="space-y-2">
          {stats.daily.map((d) => (
            <div key={d.date} className="flex justify-between text-sm">
              <span className="text-gray-500">{d.date}</span>
              <span>{d.sessions} sessions · {d.minutes} min</span>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(stats.byTag).length > 0 && (
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-medium mb-3">By Tag (minutes)</p>
          <div className="space-y-2">
            {Object.entries(stats.byTag)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, minutes]) => (
                <div key={tag} className="flex justify-between text-sm">
                  <span>{tag}</span>
                  <span className="text-gray-500">{minutes} min</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleExport('csv')}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
        <button
          onClick={() => handleExport('json')}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Export JSON
        </button>
      </div>
    </div>
  )
}
