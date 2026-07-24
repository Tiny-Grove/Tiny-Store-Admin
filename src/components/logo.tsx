export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path
        d="M15 8.5c0-2.8 2.24-5 5-5s5 2.2 5 5"
        fill="none"
        stroke="#0d3b2e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M28.5 12H30l3 22.5a2 2 0 0 1-2 2.3H9.6l3-24.8Z" fill="#0d3b2e" />
      <path d="M9.5 12h19l3 22.5a2 2 0 0 1-2 2.3H8.5a2 2 0 0 1-2-2.3Z" fill="#59a52c" />
      <circle cx="15.2" cy="24.4" r="4.3" fill="#fff" />
      <circle cx="23.6" cy="24.9" r="4.7" fill="#fff" />
      <circle cx="16.3" cy="25.7" r="2" fill="#0d3b2e" />
      <circle cx="24.7" cy="26.2" r="2.15" fill="#0d3b2e" />
    </svg>
  );
}
