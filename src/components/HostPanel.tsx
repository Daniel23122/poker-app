import { useState } from 'react'
import { Player, Room } from '../types'
import { startNewHand, endHand, rebuyPlayer, removePlayer } from '../lib/api'

interface Props {
  room: Room
  players: Player[]
  hostSecret: string
}

export default function HostPanel({ room, players, hostSecret }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [winnerId, setWinnerId] = useState('')
  const [rebuyTarget, setRebuyTarget] = useState('')
  const [rebuyAmount, setRebuyAmount] = useState('500')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  const activePlayers = players.filter((p) => p.stack > 0 || p.status !== 'out')

  return (
    <div className="rounded-2xl bg-panel border border-brass/25 p-4 flex flex-col gap-4">
      <span className="font-display font-semibold text-brasslight text-sm uppercase tracking-wide">
        Host-Steuerung
      </span>

      {!room.hand_active ? (
        <button
          onClick={() => run(() => startNewHand({ roomId: room.id, hostSecret }))}
          disabled={busy}
          className="w-full rounded-xl bg-brass hover:bg-brasslight text-ink font-display font-semibold py-3 transition-colors disabled:opacity-50"
        >
          Neue Hand starten
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <select
            value={winnerId}
            onChange={(e) => setWinnerId(e.target.value)}
            className="w-full rounded-lg bg-ink border border-white/10 px-3 py-2.5 text-cream text-sm"
          >
            <option value="">Gewinner auswählen …</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => run(() => endHand({ roomId: room.id, hostSecret, winnerId }))}
            disabled={busy || !winnerId}
            className="w-full rounded-xl bg-okgreen/25 border border-okgreen/60 text-okgreen font-display font-semibold py-3 hover:bg-okgreen/35 transition-colors disabled:opacity-50"
          >
            Hand beenden — Pot ({room.pot.toLocaleString('de-DE')}) auszahlen
          </button>
        </div>
      )}

      <div className="h-px bg-white/10" />

      <div>
        <span className="block text-xs uppercase tracking-wide text-muted mb-2">Rebuy geben</span>
        <div className="flex gap-2">
          <select
            value={rebuyTarget}
            onChange={(e) => setRebuyTarget(e.target.value)}
            className="flex-1 rounded-lg bg-ink border border-white/10 px-3 py-2.5 text-cream text-sm"
          >
            <option value="">Spieler …</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={rebuyAmount}
            onChange={(e) => setRebuyAmount(e.target.value)}
            className="w-24 rounded-lg bg-ink border border-white/10 px-2 py-2.5 font-mono tabular text-sm"
          />
          <button
            onClick={() =>
              run(() =>
                rebuyPlayer({
                  roomId: room.id,
                  hostSecret,
                  playerId: rebuyTarget,
                  amount: Number(rebuyAmount),
                })
              )
            }
            disabled={busy || !rebuyTarget || Number(rebuyAmount) <= 0}
            className="rounded-lg bg-brass text-ink text-sm font-semibold px-4 disabled:opacity-40"
          >
            +Chips
          </button>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <span className="block text-xs uppercase tracking-wide text-muted mb-2">Spieler entfernen</span>
        <div className="flex flex-col gap-1.5">
          {activePlayers
            .filter((p) => !p.is_host)
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-ink/60 rounded-lg px-3 py-2 text-sm"
              >
                <span>{p.name}</span>
                <button
                  disabled={busy}
                  onClick={() => run(() => removePlayer({ roomId: room.id, hostSecret, playerId: p.id }))}
                  className="text-danger text-xs hover:underline disabled:opacity-40"
                >
                  Entfernen
                </button>
              </div>
            ))}
          {activePlayers.filter((p) => !p.is_host).length === 0 && (
            <span className="text-muted text-sm">Keine weiteren Spieler im Raum.</span>
          )}
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  )
}
