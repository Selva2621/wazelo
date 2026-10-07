/**
 * Image stand-ins for rich WhatsApp messages, ported from the app's auth pages
 * (frontend/src/components/auth/illustrations.tsx). Theme tokens only.
 */

interface IllustrationProps {
  className?: string;
}

/** Freelancer proposal: a website preview with the proposal document in front. */
export function ProposalIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden focusable="false" preserveAspectRatio="xMidYMid slice">
      <rect width={240} height={150} className="fill-primary/20" />
      <circle cx={30} cy={24} r={40} className="fill-primary/15" />
      <circle cx={214} cy={140} r={44} className="fill-primary-container/15" />

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

      <g transform="rotate(5 168 88)">
        <rect x={128} y={40} width={80} height={98} rx={8} strokeWidth={1.25} className="fill-surface-container-lowest stroke-on-surface/10" />
        <rect x={138} y={52} width={36} height={6} rx={3} className="fill-primary" />
        <rect x={138} y={66} width={58} height={4} rx={2} className="fill-on-surface-variant/35" />
        <rect x={138} y={75} width={50} height={4} rx={2} className="fill-on-surface-variant/25" />
        <rect x={138} y={84} width={54} height={4} rx={2} className="fill-on-surface-variant/25" />
        <rect x={138} y={102} width={40} height={14} rx={7} className="fill-primary/20" />
        <rect x={144} y={107} width={28} height={4} rx={2} className="fill-primary" />
      </g>

      <circle cx={204} cy={44} r={13} className="fill-success" />
      <path d="m198 44 4 4 8-8.5" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="stroke-surface-container-lowest" />
    </svg>
  );
}

/** Property listing photo stand-in: an apartment block at dusk. */
export function ListingIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden focusable="false" preserveAspectRatio="xMidYMid slice">
      <rect width={240} height={150} className="fill-primary/20" />
      <circle cx={190} cy={36} r={18} className="fill-primary-container/60" />
      <rect x={0} y={122} width={240} height={28} className="fill-surface-container-high" />

      <rect x={70} y={30} width={70} height={96} rx={4} className="fill-surface-container-lowest" />
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={80 + col * 18}
            y={40 + row * 16}
            width={12}
            height={9}
            rx={1.5}
            className={(row + col) % 3 === 0 ? "fill-primary-container/80" : "fill-on-surface-variant/25"}
          />
        )),
      )}
      <rect x={146} y={70} width={52} height={56} rx={4} className="fill-surface-container" />
      {[0, 1, 2].map((row) => (
        <rect key={row} x={154} y={80 + row * 14} width={36} height={7} rx={1.5} className="fill-on-surface-variant/20" />
      ))}
      <circle cx={44} cy={104} r={16} className="fill-success/50" />
      <rect x={42} y={110} width={4} height={16} className="fill-on-surface-variant/40" />
    </svg>
  );
}
