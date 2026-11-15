// Sentinel "hub" mark, rendered with next/og ImageResponse (Satori).
// Satori supports inline <svg> but not filters, so the glow is a radial-gradient div.

const BLUE = '#1ea7ff';
const BG = '#050505';

// Center node + 5 outer nodes on a radius-32 ring, starting at 12 o'clock.
const CENTER = { x: 50, y: 50 };
const NODES = [-90, -18, 54, 126, 198].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { x: 50 + 32 * Math.cos(rad), y: 50 + 32 * Math.sin(rad) };
});

interface HubIconProps {
  /** Canvas edge in px. */
  size: number;
  /** Fraction of the canvas the glyph occupies (0–1). */
  scale?: number;
  /** Soft blue glow behind the glyph (skip for tiny favicons). */
  glow?: boolean;
}

/** Full-bleed square icon: dark background, blue glow, hub glyph centered. */
export function HubIcon({ size, scale = 0.72, glow = true }: HubIconProps) {
  const glyph = Math.round(size * scale);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BG,
        // Satori rejects `backgroundImage: 'none'`, so omit the key entirely.
        ...(glow && {
          backgroundImage:
            'radial-gradient(circle, rgba(30,167,255,0.32) 0%, rgba(30,167,255,0) 70%)',
        }),
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 100 100">
        {NODES.map((n, i) => (
          <line
            key={`l${i}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={n.x}
            y2={n.y}
            stroke={BLUE}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
        ))}
        {NODES.map((n, i) => (
          <circle
            key={`n${i}`}
            cx={n.x}
            cy={n.y}
            r={7}
            fill={BG}
            stroke={BLUE}
            strokeWidth={3.5}
          />
        ))}
        <circle cx={CENTER.x} cy={CENTER.y} r={11} fill={BG} stroke={BLUE} strokeWidth={4} />
        <circle cx={CENTER.x} cy={CENTER.y} r={4.5} fill={BLUE} />
      </svg>
    </div>
  );
}
