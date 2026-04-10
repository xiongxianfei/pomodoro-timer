import { useState } from 'react'
import { usePresetsStore } from '@/store/presetsStore'

export function PresetsScreen() {
  const { presets, createPreset } = usePresetsStore()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '', workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15,
    sessionsBeforeLongBreak: 4, color: '#E53935', icon: 'timer', sortOrder: 0,
  })

  async function handleCreate() {
    if (!form.name.trim()) return
    await createPreset(form)
    setCreating(false)
    setForm({ name: '', workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4, color: '#E53935', icon: 'timer', sortOrder: 0 })
  }

  return (
    <div className="flex flex-col gap-4 p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium">Presets</h2>
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          {creating ? 'Cancel' : '+ New Preset'}
        </button>
      </div>

      {creating && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <input
            placeholder="Preset name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-3 gap-3">
            {(['workDuration', 'shortBreakDuration', 'longBreakDuration'] as const).map((field) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">
                  {field === 'workDuration' ? 'Work' : field === 'shortBreakDuration' ? 'Short Break' : 'Long Break'} (min)
                </label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleCreate}
            className="w-full py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            Create Preset
          </button>
        </div>
      )}

      <div className="space-y-3">
        {presets.map((p) => (
          <div key={p.id} className="border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-medium">{p.name}</span>
                {p.builtIn && <span className="ml-2 text-xs text-gray-400">built-in</span>}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {p.workDuration}m work · {p.shortBreakDuration}m short · {p.longBreakDuration}m long · {p.sessionsBeforeLongBreak} sessions
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
