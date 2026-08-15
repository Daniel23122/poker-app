import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom, joinRoom } from '../lib/api'
import { saveIdentity } from '../lib/storage'

type Mode = 'none' | 'create' | 'join'

export default function Home() {
  const [mode, setMode] = useState<Mode>('none')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-brass mb-3">
            <ChipMark />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-cream">
            Chip Table
          </h1>
          <p className="text-muted text-sm mt-2 leading-relaxed">
            Digitaler Chip-Manager für eure Poker-Runde. Karten spielt ihr echt,
            wir kümmern uns nur um Stacks, Pot und Einsätze.
          </p>
        </header>

        {mode === 'none' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode('create')}
              className="w-full rounded-2xl bg-felt hover:bg-feltdark transition-colors border border-brass/30 py-5 px-6 text-left shadow-card"
            >
              <span className="block font-display text-lg font-semibold text-cream">
                Raum erstellen
              </span>
              <span className="block text-sm text-muted mt-1">
                Neuen Tisch aufsetzen und Freunde einladen
              </span>
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full rounded-2xl bg-panel hover:bg-panel/70 transition-colors border border-white/10 py-5 px-6 text-left shadow-card"
            >
              <span className="block font-display text-lg font-semibold text-cream">
                Raum beitreten
              </span>
              <span className="block text-sm text-muted mt-1">
                Mit Raumcode einem Tisch beitreten
              </span>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <CreateRoomForm onBack={() => setMode('none')} onCreated={(code) => navigate(`/room/${code}`)} />
        )}

        {mode === 'join' && (
          <JoinRoomForm onBack={() => setMode('none')} onJoined={(code) => navigate(`/room/${code}`)} />
        )}
      </div>
    </div>
  )
}

function ChipMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" stroke="#C9A15F" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="11" stroke="#C9A15F" strokeWidth="1.5" strokeDasharray="3 4" />
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const x1 = 20 + Math.cos(angle) * 18
        const y1 = 20 + Math.sin(angle) * 18
        const x2 = 20 + Math.cos(angle) * 14.5
        const y2 = 20 + Math.sin(angle) * 14.5
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C9A15F" strokeWidth="2.5" />
      })}
    </svg>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">{children}</label>
}

const inputClass =
  'w-full rounded-xl bg-ink border border-white/10 px-4 py-3 text-cream text-base focus:border-brass/60 transition-colors font-mono tabular'

function CreateRoomForm({ onBack, onCreated }: { onBack: () => void; onCreated: (code: string) => void }) {
  const [name, setName] = useState('')
  const [playerCount, setPlayerCount] = useState(6)
  const [startStack, setStartStack] = useState(1000)
  const [smallBlind, setSmallBlind] = useState(10)
  const [bigBlind, setBigBlind] = useState(20)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Bitte gib deinen Spielernamen ein.')
      return
    }
    setBusy(true)
    try {
      const result = await createRoom({
        hostName: name.trim(),
        playerCount,
        startStack,
        smallBlind,
        bigBlind,
      })
      saveIdentity({
        roomId: result.room_id,
        roomCode: result.room_code,
        playerId: result.player_id,
        playerSecret: result.player_secret,
        hostSecret: result.host_secret,
      })
      onCreated(result.room_code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Raum konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-panel border border-white/10 rounded-2xl p-6 shadow-card">
      <button type="button" onClick={onBack} className="text-muted text-sm mb-5 hover:text-cream transition-colors">
        ← Zurück
      </button>

      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel>Dein Spielername</FieldLabel>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Daniel"
            maxLength={24}
            autoFocus
          />
        </div>

        <div>
          <FieldLabel>Anzahl Spieler (2–6)</FieldLabel>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 rounded-lg py-2.5 font-mono text-sm border transition-colors ${
                  playerCount === n
                    ? 'bg-brass text-ink border-brass font-semibold'
                    : 'bg-ink border-white/10 text-muted hover:border-white/30'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Startstack</FieldLabel>
          <input
            className={inputClass}
            type="number"
            min={1}
            value={startStack}
            onChange={(e) => setStartStack(Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Small Blind</FieldLabel>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={smallBlind}
              onChange={(e) => setSmallBlind(Number(e.target.value))}
            />
          </div>
          <div>
            <FieldLabel>Big Blind</FieldLabel>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={bigBlind}
              onChange={(e) => setBigBlind(Number(e.target.value))}
            />
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-xl bg-brass hover:bg-brasslight transition-colors text-ink font-display font-semibold py-3.5 disabled:opacity-50"
        >
          {busy ? 'Erstelle Raum …' : 'Raum erstellen'}
        </button>
      </div>
    </form>
  )
}

function JoinRoomForm({ onBack, onJoined }: { onBack: () => void; onJoined: (code: string) => void }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!code.trim() || !name.trim()) {
      setError('Bitte Raumcode und Spielernamen eingeben.')
      return
    }
    setBusy(true)
    try {
      const result = await joinRoom({ code, name: name.trim() })
      saveIdentity({
        roomId: result.room_id,
        roomCode: code.toUpperCase().trim(),
        playerId: result.player_id,
        playerSecret: result.player_secret,
      })
      onJoined(code.toUpperCase().trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Raum konnte nicht beigetreten werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-panel border border-white/10 rounded-2xl p-6 shadow-card">
      <button type="button" onClick={onBack} className="text-muted text-sm mb-5 hover:text-cream transition-colors">
        ← Zurück
      </button>

      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel>Raumcode</FieldLabel>
          <input
            className={inputClass + ' uppercase tracking-[0.2em] text-center text-lg'}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="X7K92"
            maxLength={8}
            autoFocus
          />
        </div>
        <div>
          <FieldLabel>Dein Spielername</FieldLabel>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Max"
            maxLength={24}
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-xl bg-brass hover:bg-brasslight transition-colors text-ink font-display font-semibold py-3.5 disabled:opacity-50"
        >
          {busy ? 'Trete bei …' : 'Raum betreten'}
        </button>
      </div>
    </form>
  )
}
