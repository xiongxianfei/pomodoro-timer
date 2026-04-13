import { UserAvatar } from './UserAvatar'

type Screen = 'timer' | 'history' | 'stats' | 'presets'

interface Props {
  current: Screen
  onChange: (screen: Screen) => void
}

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'history', label: 'History' },
  { id: 'stats', label: 'Stats' },
  { id: 'presets', label: 'Presets' },
]

export function Navigation({ current, onChange }: Props) {
  return (
    <nav className="flex items-center justify-between border-b border-gray-100 px-2">
      <div className="flex flex-1">
        {NAV_ITEMS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 py-3 text-sm transition-colors ${
              current === id
                ? 'text-red-600 border-b-2 border-red-600 font-medium'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <UserAvatar />
    </nav>
  )
}
