"use client";

/**
 * BIZRA Sovereign Logo — the canonical بذرة mark.
 * 12 node dots = 12 agents. Orbital rings = constitutional membrane.
 * Gold gradient = Genesis Gold #C9A962.
 * Ported from bizra-clean.html brand source.
 */

export function BizraSovereignLogo({ size = 200 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          inset: -40,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,169,98,0.12), transparent 70%)",
          filter: "blur(30px)",
          animation: "logoPulse 4s ease-in-out infinite",
        }}
      />
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8a6b2e" />
            <stop offset="50%" stopColor="#c9a962" />
            <stop offset="100%" stopColor="#f9f1d8" />
          </linearGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="1.5" result="g" />
            <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Crosshairs */}
        <line x1="15" y1="100" x2="185" y2="100" stroke="rgba(201,169,98,0.06)" strokeWidth="0.3" />
        <line x1="100" y1="15" x2="100" y2="185" stroke="rgba(201,169,98,0.06)" strokeWidth="0.3" />

        {/* Outer rings */}
        <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(201,169,98,0.08)" strokeWidth="0.3" />
        <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(201,169,98,0.1)" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(201,169,98,0.06)" strokeWidth="0.3" />

        {/* Orbital ring with satellites */}
        <g style={{ animation: "orbitSpin 40s linear infinite" }}>
          <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(201,169,98,0.06)" strokeWidth="0.3" />
          <circle cx="100" cy="18" r="2.5" fill="#c9a962" opacity="0.4" />
          <circle cx="182" cy="100" r="1.5" fill="#c9a962" opacity="0.25" />
          <circle cx="100" cy="182" r="2" fill="#c9a962" opacity="0.35" />
          <circle cx="18" cy="100" r="1.5" fill="#c9a962" opacity="0.25" />
        </g>

        {/* 12 node dots = 12 agents (PAT-7 + SAT-5) */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
          const r = 82;
          const rad = (angle * Math.PI) / 180;
          const cx = 100 + r * Math.sin(rad);
          const cy = 100 - r * Math.cos(rad);
          const sz = i < 7 ? 2.2 : 1.4; // PAT bigger, SAT smaller
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={sz}
              fill="url(#goldGrad)"
              opacity={0.6}
              filter="url(#softGlow)"
            />
          );
        })}

        {/* Center: بذرة text */}
        <text
          x="100"
          y="96"
          textAnchor="middle"
          fontFamily="'Amiri', serif"
          fontSize="22"
          fontWeight="700"
          fill="url(#goldGrad)"
          filter="url(#softGlow)"
        >
          بذرة
        </text>
        <text
          x="100"
          y="115"
          textAnchor="middle"
          fontFamily="'Cinzel', serif"
          fontSize="7"
          letterSpacing="4"
          fill="rgba(201,169,98,0.4)"
        >
          SOVEREIGN AI
        </text>
      </svg>

      <style>{`
        @keyframes logoPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg); transform-origin: 100px 100px; }
          to { transform: rotate(360deg); transform-origin: 100px 100px; }
        }
      `}</style>
    </div>
  );
}
