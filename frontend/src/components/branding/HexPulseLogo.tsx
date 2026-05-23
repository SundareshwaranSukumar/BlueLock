export function HexPulseLogo({ size = 220 }: { size?: number }) {
  return (
    <div className="relative animate-hex-pulse gpu" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <linearGradient id="hexg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.88 0.18 215)" />
            <stop offset="100%" stopColor="oklch(0.55 0.2 260)" />
          </linearGradient>
        </defs>
        <polygon points="50,8 150,8 196,100 150,192 50,192 4,100"
          fill="none" stroke="url(#hexg)" strokeWidth="3" />
        <polygon points="65,30 135,30 175,100 135,170 65,170 25,100"
          fill="none" stroke="oklch(0.88 0.18 215 / 0.5)" strokeWidth="1.5" />
        <polygon points="80,55 120,55 150,100 120,145 80,145 50,100"
          fill="oklch(0.88 0.18 215 / 0.12)" stroke="oklch(0.88 0.18 215)" strokeWidth="1" />
        <text x="100" y="108" textAnchor="middle"
          fontFamily="Orbitron, sans-serif" fontWeight="900" fontSize="22"
          fill="oklch(0.98 0.005 240)" letterSpacing="4">
          BL
        </text>
      </svg>
    </div>
  );
}
