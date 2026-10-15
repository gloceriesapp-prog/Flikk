// Login-page scene: a kirana owner at the counter checking the dashboard on a
// laptop, with stocked shelves, a wall clock and a plant. Flat vector shapes
// with soft shading in the dashboard's green palette, drawn inline so the
// page ships no image asset. Decorative only (aria-hidden).

export function StoreIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1400 760" preserveAspectRatio="xMinYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dff5c2" />
          <stop offset="0.55" stopColor="#c4ea9a" />
          <stop offset="1" stopColor="#8fd391" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6a45" />
          <stop offset="1" stopColor="#1f4a31" />
        </linearGradient>
        <radialGradient id="glow" cx="0.25" cy="0.3" r="0.45">
          <stop offset="0" stopColor="#f4ffd9" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f4ffd9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="counterTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d7d50" />
          <stop offset="1" stopColor="#2c613d" />
        </linearGradient>
        <linearGradient id="counterFront" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f3f6ef" />
          <stop offset="1" stopColor="#dfe7d8" />
        </linearGradient>
        <linearGradient id="laptop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9dde3" />
          <stop offset="1" stopColor="#9aa1ab" />
        </linearGradient>
        <linearGradient id="sweater" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8d93a" />
          <stop offset="1" stopColor="#79b43a" />
        </linearGradient>
        <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fae7f" />
          <stop offset="1" stopColor="#4d7f5a" />
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {/* Room spans the whole frame; the scene sits in its left half because
          the sign-in card covers the right. */}
      <rect width="1400" height="760" fill="url(#wall)" />
      <rect width="1400" height="760" fill="url(#glow)" />
      <path d="M0 590 L1400 540 L1400 760 L0 760 Z" fill="url(#floor)" />

      <g transform="translate(10 114) scale(0.85)">

      {/* Wall clock */}
      <g transform="translate(470 120)">
        <circle r="40" fill="#1d2b22" />
        <circle r="33" fill="#fbfdf8" />
        <line x1="0" y1="0" x2="0" y2="-22" stroke="#1d2b22" strokeWidth="4" strokeLinecap="round" />
        <line x1="0" y1="0" x2="15" y2="-6" stroke="#1d2b22" strokeWidth="4" strokeLinecap="round" />
        <circle r="3.5" fill="#1d2b22" />
      </g>

      {/* Shelf unit with stock */}
      <g transform="translate(40 190)">
        <rect x="-8" y="352" width="196" height="24" rx="8" fill="#1d3a28" opacity="0.25" filter="url(#soft)" />
        <rect width="180" height="360" rx="10" fill="#f6f8f3" />
        <rect x="8" y="8" width="164" height="344" rx="6" fill="#e7eee0" />
        {[100, 196, 292].map((y) => (
          <rect key={y} x="8" y={y} width="164" height="8" fill="#cfdac5" />
        ))}
        {/* Top shelf: jars */}
        {[22, 62, 102, 142].map((x, i) => (
          <g key={x} transform={`translate(${x} 46)`}>
            <rect width="28" height="54" rx="6" fill={['#f5c451', '#e2703a', '#c9a15d', '#9cc76a'][i]} />
            <rect y="-6" width="28" height="10" rx="3" fill="#7a5a3a" />
            <rect x="5" y="20" width="18" height="14" rx="2" fill="#fffbea" opacity="0.85" />
          </g>
        ))}
        {/* Middle shelf: sacks */}
        {[20, 74, 128].map((x, i) => (
          <path
            key={x}
            transform={`translate(${x} 128)`}
            d="M4 68 Q0 30 8 8 Q22 0 36 8 Q44 30 40 68 Z"
            fill={['#e9d9b3', '#f2e7c9', '#dcc89c'][i]}
          />
        ))}
        {/* Bottom shelf: packets */}
        {[18, 52, 86, 120].map((x, i) => (
          <rect key={x} x={x} y="234" width="28" height="58" rx="4" fill={['#5aa469', '#f08a4b', '#4f86c6', '#f5c451'][i]} />
        ))}
        {[18, 64, 110].map((x) => (
          <rect key={x} x={x} y="318" width="40" height="30" rx="5" fill="#b98a5e" />
        ))}
      </g>

      {/* Plant */}
      <g transform="translate(640 420)">
        <ellipse cx="44" cy="208" rx="62" ry="14" fill="#123020" opacity="0.35" />
        <path d="M44 120 C10 70 6 10 30 -60 C40 0 46 60 44 120 Z" fill="url(#leaf)" />
        <path d="M46 120 C70 60 92 0 86 -40 C70 20 56 70 46 120 Z" fill="#5f9466" />
        <path d="M42 120 C20 90 -6 60 -14 20 C12 50 30 80 42 120 Z" fill="#6c9e6f" />
        <path d="M48 120 C66 96 96 82 112 64 C100 96 76 112 48 120 Z" fill="#4d7f5a" />
        <path d="M6 116 L82 116 L74 206 L14 206 Z" fill="#e9ece6" />
        <path d="M6 116 L82 116 L80 132 L8 132 Z" fill="#d6dbd2" />
      </g>

      {/* Shopkeeper */}
      <g transform="translate(330 250)">
        {/* Chair back */}
        <rect x="70" y="80" width="120" height="170" rx="40" fill="#c9cfd6" />
        <rect x="80" y="90" width="100" height="150" rx="34" fill="#dde2e7" />
        {/* Body */}
        <path d="M30 330 C26 220 52 150 112 140 C172 150 198 220 194 330 Z" fill="url(#sweater)" />
        <path d="M92 146 L112 176 L132 146 Z" fill="#6d5bd0" />
        {/* Arm reaching to laptop */}
        <path d="M44 232 C20 262 10 300 30 322 L96 328 L98 302 L58 296 C64 270 70 252 72 236 Z" fill="#8fc441" />
        <ellipse cx="102" cy="314" rx="16" ry="12" fill="#f0bf98" />
        {/* Neck + head */}
        <rect x="100" y="112" width="24" height="34" rx="10" fill="#e8b48c" />
        <ellipse cx="112" cy="80" rx="46" ry="52" fill="#f0bf98" />
        {/* Hair */}
        <path d="M66 74 C62 30 92 18 116 22 C146 24 162 46 158 78 C150 58 132 50 112 52 C92 52 76 60 66 74 Z" fill="#3b2a22" />
        {/* Beard */}
        <path d="M70 92 C74 136 98 148 112 148 C126 148 152 136 154 92 C146 112 132 118 112 118 C92 118 78 112 70 92 Z" fill="#3b2a22" />
        <path d="M100 116 Q112 126 124 116" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* Glasses */}
        <g fill="none" stroke="#2a2a2a" strokeWidth="3">
          <rect x="80" y="70" width="26" height="18" rx="7" />
          <rect x="118" y="70" width="26" height="18" rx="7" />
          <path d="M106 78 L118 78" />
        </g>
        <circle cx="93" cy="80" r="3" fill="#2a2a2a" />
        <circle cx="131" cy="80" r="3" fill="#2a2a2a" />
        {/* Ear */}
        <ellipse cx="160" cy="84" rx="7" ry="11" fill="#e8b48c" />
      </g>

      {/* Counter */}
      <g>
        <ellipse cx="400" cy="720" rx="300" ry="26" fill="#0f2a1b" opacity="0.35" />
        <path d="M150 556 L660 556 L640 716 L170 716 Z" fill="url(#counterFront)" />
        <rect x="186" y="590" width="200" height="94" rx="10" fill="#e3eadb" />
        <rect x="414" y="590" width="200" height="94" rx="10" fill="#e3eadb" />
        <rect x="120" y="528" width="570" height="34" rx="14" fill="url(#counterTop)" />
        <rect x="120" y="552" width="570" height="10" rx="5" fill="#1f4a31" opacity="0.5" />
      </g>

      {/* Laptop on counter, showing an order card */}
      <g transform="translate(250 418)">
        <path d="M6 112 L196 112 L214 124 L-12 124 Z" fill="#b5bcc5" />
        <path d="M16 0 L186 0 Q194 0 194 8 L194 112 L8 112 L8 8 Q8 0 16 0 Z" fill="url(#laptop)" />
        <rect x="18" y="10" width="166" height="94" rx="6" fill="#1d2b22" />
        <rect x="28" y="20" width="78" height="10" rx="5" fill="#a8d93a" />
        <rect x="28" y="38" width="146" height="22" rx="6" fill="#2f4a37" />
        <rect x="34" y="45" width="60" height="8" rx="4" fill="#dff5c2" opacity="0.8" />
        <rect x="142" y="44" width="26" height="10" rx="5" fill="#a8d93a" />
        <rect x="28" y="68" width="146" height="22" rx="6" fill="#2f4a37" />
        <rect x="34" y="75" width="48" height="8" rx="4" fill="#dff5c2" opacity="0.8" />
        <rect x="142" y="74" width="26" height="10" rx="5" fill="#f5c451" />
      </g>

      {/* Mug, phone and a basket of produce */}
      <g transform="translate(486 492)">
        <rect width="34" height="38" rx="8" fill="#5b4bd6" />
        <path d="M34 10 Q48 12 46 22 Q44 30 34 30" stroke="#5b4bd6" strokeWidth="6" fill="none" />
      </g>
      <rect x="440" y="520" width="40" height="10" rx="4" fill="#2a2a2a" />
      <g transform="translate(560 470)">
        <path d="M0 30 L96 30 L86 64 L10 64 Z" fill="#c08a52" />
        <circle cx="22" cy="24" r="14" fill="#e2503a" />
        <circle cx="46" cy="18" r="15" fill="#f5a623" />
        <circle cx="72" cy="24" r="14" fill="#7fb93d" />
        <path d="M44 4 Q48 -6 56 -4" stroke="#4d7f5a" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      </g>
    </svg>
  );
}
