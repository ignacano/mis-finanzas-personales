// Logo de MisFinanzas: marca vectorial (moneda + tendencia ascendente).
export function Logo({ className = '', size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="MisFinanzas"
    >
      <defs>
        <linearGradient id="mf-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#mf-grad)" />
      {/* Tendencia ascendente */}
      <path
        d="M12 30L20 22L26 27L36 16"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 16H36V22"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Símbolo peso/dólar */}
      <text
        x="24"
        y="41"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="white"
        fontFamily="system-ui, sans-serif"
        opacity="0.95"
      >
        $
      </text>
    </svg>
  );
}
