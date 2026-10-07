/**
 * Decorative product illustrations for the auth pages.
 * One drawing system: rounded geometry, 1.75 stroke, theme tokens only
 * (fill-* / stroke-* classes), so every theme recolours them automatically.
 */

interface IllustrationProps {
  className?: string;
}

/** Campaign broadcast: a phone sending to recipients. */
export function BroadcastIllustration({ className }: IllustrationProps) {
  const recipients = [
    { cx: 30, cy: 38 },
    { cx: 30, cy: 82 },
    { cx: 170, cy: 38 },
    { cx: 170, cy: 82 },
  ];
  return (
    <svg viewBox="12 8 176 100" className={className} aria-hidden focusable="false">
      {/* signal arcs */}
      <g fill="none" strokeLinecap="round" strokeWidth={2.5} className="stroke-primary-container">
        <path d="M66 46a20 20 0 0 0 0 28" />
        <path d="M134 46a20 20 0 0 1 0 28" />
        <path d="M57 38a31 31 0 0 0 0 44" opacity={0.5} />
        <path d="M143 38a31 31 0 0 1 0 44" opacity={0.5} />
      </g>

      {/* phone */}
      <rect x={78} y={14} width={44} height={88} rx={10} strokeWidth={1.75} className="fill-surface-container stroke-on-surface-variant/40" />
      <rect x={85} y={24} width={30} height={6} rx={3} className="fill-primary/70" />
      <rect x={85} y={37} width={22} height={8} rx={4} className="fill-on-surface-variant/25" />
      <rect x={93} y={50} width={22} height={8} rx={4} className="fill-primary/45" />
      <rect x={85} y={63} width={18} height={8} rx={4} className="fill-on-surface-variant/25" />
      <rect x={92} y={94} width={16} height={2.5} rx={1.25} className="fill-on-surface-variant/40" />

      {/* recipients, each with a delivered tick */}
      {recipients.map(({ cx, cy }) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={12} className="fill-primary/15" />
          <circle cx={cx} cy={cy - 3} r={3.8} className="fill-primary-container" />
          <path d={`M${cx - 6.5} ${cy + 7.5}a6.5 5.5 0 0 1 13 0`} className="fill-primary-container" />
          <circle cx={cx + 9} cy={cy - 9} r={5} className="fill-success" />
          <path
            d={`M${cx + 6.6} ${cy - 9}l1.7 1.7 3.2-3.4`}
            fill="none"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-surface-container-lowest"
          />
        </g>
      ))}
    </svg>
  );
}

/** Automation: trigger, two actions, done. */
export function AutomationIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="8 14 184 92" className={className} aria-hidden focusable="false">
      {/* connectors */}
      <g fill="none" strokeWidth={1.75} strokeDasharray="3 4" strokeLinecap="round" className="stroke-on-surface-variant/50">
        <path d="M58 60C74 60 74 34 90 34" />
        <path d="M58 60C74 60 74 86 90 86" />
        <path d="M134 34C150 34 148 60 160 60" />
        <path d="M134 86C150 86 148 60 160 60" />
      </g>

      {/* trigger */}
      <rect x={14} y={42} width={44} height={36} rx={10} strokeWidth={1.75} className="fill-primary/15 stroke-primary/50" />
      <path d="M38.5 48.5 30 62h7l-2 9.5L44 58h-7z" className="fill-primary-container" />

      {/* action: send message */}
      <rect x={90} y={20} width={44} height={28} rx={8} className="fill-surface-container-high" />
      <rect x={98} y={28.5} width={28} height={4} rx={2} className="fill-on-surface-variant/45" />
      <rect x={98} y={35.5} width={18} height={4} rx={2} className="fill-on-surface-variant/25" />

      {/* action: wait */}
      <rect x={90} y={72} width={44} height={28} rx={8} className="fill-surface-container-high" />
      <circle cx={112} cy={86} r={7} fill="none" strokeWidth={1.75} className="stroke-on-surface-variant" />
      <path d="M112 82.5V86l2.6 1.8" fill="none" strokeWidth={1.75} strokeLinecap="round" className="stroke-on-surface-variant" />

      {/* done */}
      <circle cx={174} cy={60} r={14} className="fill-success/20" />
      <path d="m167.5 60 4.5 4.5 9-9.5" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="stroke-success" />
    </svg>
  );
}

/** Freelancer proposal: a website preview with the proposal document in front. */
export function ProposalIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden focusable="false" preserveAspectRatio="xMidYMid slice">
      <rect width={240} height={150} className="fill-primary/20" />
      <circle cx={30} cy={24} r={40} className="fill-primary/15" />
      <circle cx={214} cy={140} r={44} className="fill-primary-container/15" />

      {/* website preview (back) */}
      <g transform="rotate(-6 92 72)">
        <rect x={30} y={26} width={124} height={92} rx={8} className="fill-surface-container-lowest" />
        <rect x={30} y={26} width={124} height={14} rx={8} className="fill-surface-container-high" />
        <circle cx={40} cy={33} r={2.5} className="fill-error/70" />
        <circle cx={48} cy={33} r={2.5} className="fill-warning/70" />
        <circle cx={56} cy={33} r={2.5} className="fill-success/70" />
        <rect x={40} y={48} width={64} height={30} rx={4} className="fill-primary/45" />
        <rect x={110} y={50} width={34} height={5} rx={2.5} className="fill-on-surface-variant/35" />
        <rect x={110} y={60} width={26} height={5} rx={2.5} className="fill-on-surface-variant/25" />
        <rect x={40} y={86} width={30} height={22} rx={4} className="fill-primary-container/40" />
        <rect x={76} y={86} width={30} height={22} rx={4} className="fill-primary-container/30" />
        <rect x={112} y={86} width={32} height={22} rx={4} className="fill-primary-container/20" />
      </g>

      {/* proposal document (front) */}
      <g transform="rotate(5 168 88)">
        <rect x={128} y={40} width={80} height={98} rx={8} strokeWidth={1.25} className="fill-surface-container-lowest stroke-on-surface/10" />
        <rect x={138} y={52} width={36} height={6} rx={3} className="fill-primary" />
        <rect x={138} y={66} width={58} height={4} rx={2} className="fill-on-surface-variant/35" />
        <rect x={138} y={75} width={50} height={4} rx={2} className="fill-on-surface-variant/25" />
        <rect x={138} y={84} width={54} height={4} rx={2} className="fill-on-surface-variant/25" />
        <rect x={138} y={102} width={40} height={14} rx={7} className="fill-primary/20" />
        <rect x={144} y={107} width={28} height={4} rx={2} className="fill-primary" />
      </g>

      {/* accepted check */}
      <circle cx={204} cy={44} r={13} className="fill-success" />
      <path d="m198 44 4 4 8-8.5" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="stroke-surface-container-lowest" />
    </svg>
  );
}

/** Product photo stand-in for the rich WhatsApp message: a parcel on its way. */
export function ParcelIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden focusable="false" preserveAspectRatio="xMidYMid slice">
      <rect width={240} height={150} className="fill-primary/20" />
      <circle cx={196} cy={30} r={46} className="fill-primary/15" />
      <circle cx={40} cy={132} r={38} className="fill-primary-container/15" />

      {/* motion lines */}
      <g strokeLinecap="round" strokeWidth={3} className="stroke-primary-container/60">
        <path d="M30 70h26" />
        <path d="M22 84h30" />
        <path d="M34 98h20" />
      </g>

      {/* ground shadow */}
      <ellipse cx={122} cy={128} rx={52} ry={7} className="fill-on-surface/10" />

      {/* isometric box */}
      <path d="M120 38 170 60 120 82 70 60Z" className="fill-primary-container" />
      <path d="M70 60 120 82v44L70 104Z" className="fill-primary" />
      <path d="M120 82 170 60v44l-50 22Z" className="fill-primary/75" />
      {/* tape */}
      <path d="M95 49 145 71l-8 3.5-50-22Z" className="fill-surface-container-lowest/70" />
      <path d="M137 74.5v44l8-3.5V71Z" className="fill-surface-container-lowest/55" />
      {/* label */}
      <path d="M80 84l20 9v12l-20-9Z" className="fill-surface-container-lowest/80" />

      {/* location pin */}
      <g transform="translate(184 74)">
        <path d="M0 26C-9 15-13 9-13 3a13 13 0 0 1 26 0c0 6-4 12-13 23Z" className="fill-success" />
        <circle cx={0} cy={3} r={4.5} className="fill-surface-container-lowest" />
      </g>
    </svg>
  );
}

/** Shared inbox: a conversation list with one unread, highlighted chat. */
export function InboxIllustration({ className }: IllustrationProps) {
  const rows = [
    { avatar: "fill-chart-2/50", highlighted: false },
    { avatar: "fill-primary-container", highlighted: true },
    { avatar: "fill-chart-3/50", highlighted: false },
  ];
  return (
    <svg viewBox="0 0 240 110" className={className} aria-hidden focusable="false">
      {rows.map((row, i) => {
        const y = 10 + i * 32;
        return (
          <g key={i}>
            <rect
              x={36}
              y={y}
              width={168}
              height={26}
              rx={8}
              strokeWidth={1.25}
              className={row.highlighted ? "fill-primary/15 stroke-primary/40" : "fill-surface-container-high stroke-transparent"}
            />
            <circle cx={52} cy={y + 13} r={7} className={row.avatar} />
            <rect x={66} y={y + 7} width={64} height={4} rx={2} className="fill-on-surface-variant/50" />
            <rect x={66} y={y + 15} width={row.highlighted ? 104 : 88} height={4} rx={2} className="fill-on-surface-variant/25" />
            {row.highlighted && <circle cx={190} cy={y + 13} r={4.5} className="fill-primary" />}
          </g>
        );
      })}
      {/* floating reply bubble */}
      <rect x={4} y={36} width={26} height={16} rx={8} className="fill-primary/70" />
      <rect x={210} y={66} width={26} height={16} rx={8} className="fill-on-surface-variant/25" />
    </svg>
  );
}
