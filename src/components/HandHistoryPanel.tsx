import { HistoryEntry } from '../types'

export default function HandHistoryPanel({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl bg-panel border border-white/10 p-4 text-muted text-sm text-center">
        Noch keine Historie — startet die erste Hand.
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-panel border border-white/10 p-4">
      <span className="block text-xs uppercase tracking-wide text-muted mb-3">Hand-Historie</span>
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {history.map((h) => (
          <HistoryRow key={h.id} entry={h} />
        ))}
      </div>
    </div>
  )
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const time = new Date(entry.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  if (entry.type === 'hand_win') {
    return (
      <div className="flex items-center justify-between text-sm bg-ink/50 rounded-lg px-3 py-2">
        <span className="text-cream">
          Hand #{entry.hand_number} — <span className="text-brasslight font-medium">{entry.player_name}</span>{' '}
          gewinnt
        </span>
        <span className="font-mono tabular text-okgreen">+{entry.amount?.toLocaleString('de-DE')}</span>
      </div>
    )
  }

  if (entry.type === 'rebuy') {
    return (
      <div className="flex items-center justify-between text-sm bg-ink/50 rounded-lg px-3 py-2">
        <span className="text-cream">
          Rebuy — <span className="font-medium">{entry.player_name}</span>
        </span>
        <span className="font-mono tabular text-brass">+{entry.amount?.toLocaleString('de-DE')}</span>
      </div>
    )
  }

  if (entry.type === 'remove') {
    return (
      <div className="flex items-center justify-between text-sm bg-ink/50 rounded-lg px-3 py-2 text-muted">
        <span>{entry.player_name} wurde entfernt</span>
        <span className="text-xs">{time}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between text-sm bg-ink/50 rounded-lg px-3 py-2 text-muted">
      <span>
        Hand #{entry.hand_number} gestartet
        {entry.detail ? ` — ${entry.detail}` : ''}
      </span>
      <span className="text-xs shrink-0 ml-2">{time}</span>
    </div>
  )
}
