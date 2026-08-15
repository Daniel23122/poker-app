import { useMemo, useState } from 'react'
import { Player, Room } from '../types'
import { placeBet, foldPlayer } from '../lib/api'

interface Props {
  room: Room
  self: Player
  players: Player[]
  secret: string
}

const QUICK_CHIPS = [5, 10, 25, 50, 100, 250]

export default function ActionBar({ room, self, players, secret }: Props) {
  const [staged, setStaged] = useState(0)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const highestBet = useMemo(
    () => Math.max(0, ...players.filter((p) => p.status !== 'folded' && p.status !== 'out').map((p) => p.current_bet)),
    [players]
  )
  const toCall = Math.max(0, highestBet - self.current_bet)
  const canAct = room.hand_active && self.status === 'active'

  function addChip(amount: number) {
    setError(null)
    const capped = Math.min(staged + amount, self.stack)
    setStaged(capped)
    setManual('')
  }

  function resetStaged() {
    setStaged(0)
    setManual('')
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      resetStaged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  const effectiveStaged = manual ? Math.min(Number(manual) || 0, self.stack) : staged

  if (!canAct) {
    return (
      <div className="rounded-2xl bg-panel border border-white/10 p-4 text-center text-muted text-sm">
        {self.status === 'folded'
          ? 'Du hast gefoldet — warte auf die nächste Hand.'
          : self.status === 'allin'
          ? 'Du bist All-In — warte auf den Showdown.'
          : self.status === 'out'
          ? 'Du hast keine Chips mehr. Der Host kann dir einen Rebuy geben.'
          : 'Warte auf den Start der nächsten Hand.'}
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-panel border border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted font-mono tabular">
        <span>Dein Stack: {self.stack.toLocaleString('de-DE')}</span>
        {toCall > 0 && <span className="text-brass">Zum Mitgehen: {toCall.toLocaleString('de-DE')}</span>}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {QUICK_CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => addChip(c)}
            disabled={busy || c > self.stack}
            className="rounded-lg bg-ink border border-brass/30 text-brasslight font-mono text-xs sm:text-sm py-2.5 hover:border-brass transition-colors disabled:opacity-30 disabled:hover:border-brass/30 animate-chipPop"
          >
            +{c}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={self.stack}
          placeholder="Eigener Betrag"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          className="flex-1 rounded-lg bg-ink border border-white/10 px-3 py-2.5 text-cream font-mono tabular text-sm focus:border-brass/60"
        />
        <button
          onClick={resetStaged}
          disabled={busy || (staged === 0 && !manual)}
          className="rounded-lg border border-white/10 px-3 py-2.5 text-muted text-sm hover:text-cream disabled:opacity-30"
        >
          Reset
        </button>
      </div>

      {effectiveStaged > 0 && (
        <div className="text-center text-sm text-brasslight font-mono tabular">
          Ausgewählt: {effectiveStaged.toLocaleString('de-DE')}
        </div>
      )}

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      <div className="grid grid-cols-2 gap-2 mt-1">
        <button
          onClick={() =>
            run(() =>
              foldPlayer({ playerId: self.id, secret })
            )
          }
          disabled={busy}
          className="rounded-xl bg-danger/20 border border-danger/50 text-danger font-display font-semibold py-3 hover:bg-danger/30 transition-colors disabled:opacity-50"
        >
          Fold
        </button>

        {toCall === 0 ? (
          <button
            onClick={() =>
              run(() => placeBet({ playerId: self.id, secret, targetBet: self.current_bet }))
            }
            disabled={busy}
            className="rounded-xl bg-okgreen/20 border border-okgreen/50 text-okgreen font-display font-semibold py-3 hover:bg-okgreen/30 transition-colors disabled:opacity-50"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() =>
              run(() => placeBet({ playerId: self.id, secret, targetBet: self.current_bet + toCall }))
            }
            disabled={busy || toCall > self.stack}
            className="rounded-xl bg-okgreen/20 border border-okgreen/50 text-okgreen font-display font-semibold py-3 hover:bg-okgreen/30 transition-colors disabled:opacity-50"
          >
            Call {toCall.toLocaleString('de-DE')}
          </button>
        )}

        <button
          onClick={() =>
            run(() =>
              placeBet({ playerId: self.id, secret, targetBet: self.current_bet + effectiveStaged })
            )
          }
          disabled={busy || effectiveStaged <= 0 || effectiveStaged <= toCall - 1 || effectiveStaged > self.stack}
          className="rounded-xl bg-brass/20 border border-brass/60 text-brasslight font-display font-semibold py-3 hover:bg-brass/30 transition-colors disabled:opacity-50"
        >
          {highestBet > 0 ? 'Raise' : 'Bet'}
        </button>

        <button
          onClick={() =>
            run(() =>
              placeBet({ playerId: self.id, secret, targetBet: self.current_bet + self.stack })
            )
          }
          disabled={busy || self.stack <= 0}
          className="rounded-xl bg-danger/10 border border-brass/40 text-brasslight font-display font-semibold py-3 hover:bg-brass/20 transition-colors disabled:opacity-50"
        >
          All-In
        </button>
      </div>
    </div>
  )
}
