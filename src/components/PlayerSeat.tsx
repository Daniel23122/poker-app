import { Player, Room } from '../types'

interface Props {
  player: Player
  room: Room
  isSelf: boolean
  style?: React.CSSProperties
}

export default function PlayerSeat({ player, room, isSelf, style }: Props) {
  const isDealer = player.seat === room.dealer_seat
  const isSB = player.seat === room.sb_seat
  const isBB = player.seat === room.bb_seat
  const isFolded = player.status === 'folded'
  const isAllIn = player.status === 'allin'
  const isOut = player.status === 'out'

  return (
    <div
      style={style}
      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[128px] sm:w-[148px] transition-opacity ${
        isFolded || isOut ? 'opacity-45' : 'opacity-100'
      }`}
    >
      <div
        className={`rounded-2xl px-3 py-2.5 border shadow-card backdrop-blur-sm ${
          isSelf
            ? 'bg-brass/15 border-brass shadow-[0_0_0_1px_rgba(201,161,95,0.5)]'
            : 'bg-panel/90 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={`font-display text-[13px] font-semibold truncate ${
              isSelf ? 'text-brasslight' : 'text-cream'
            }`}
            title={player.name}
          >
            {player.name}
          </span>
          <div className="flex gap-1 shrink-0">
            {isDealer && <Badge label="D" title="Dealer" />}
            {isSB && <Badge label="SB" title="Small Blind" />}
            {isBB && <Badge label="BB" title="Big Blind" />}
          </div>
        </div>

        <div className="mt-1 font-mono tabular text-lg font-semibold text-cream">
          {player.stack.toLocaleString('de-DE')}
        </div>

        <div className="mt-1 flex items-center justify-between h-5">
          {player.current_bet > 0 && !isFolded ? (
            <span className="inline-flex items-center gap-1 text-brass text-xs font-mono tabular">
              <ChipDot /> {player.current_bet.toLocaleString('de-DE')}
            </span>
          ) : (
            <span />
          )}
          <StatusPill status={isFolded ? 'folded' : isAllIn ? 'allin' : isOut ? 'out' : null} />
        </div>
      </div>
    </div>
  )
}

function Badge({ label, title }: { label: string; title: string }) {
  return (
    <span
      title={title}
      className="w-5 h-5 rounded-full bg-brass text-ink text-[10px] font-bold flex items-center justify-center"
    >
      {label}
    </span>
  )
}

function ChipDot() {
  return <span className="inline-block w-2 h-2 rounded-full bg-brass" />
}

function StatusPill({ status }: { status: 'folded' | 'allin' | 'out' | null }) {
  if (!status) return null
  const map = {
    folded: { text: 'Fold', cls: 'text-muted' },
    allin: { text: 'All-In', cls: 'text-danger' },
    out: { text: 'Out', cls: 'text-muted' },
  }
  const cfg = map[status]
  return <span className={`text-[10px] uppercase tracking-wide font-semibold ${cfg.cls}`}>{cfg.text}</span>
}
