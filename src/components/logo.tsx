export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="Tiny Store" className={`${className} object-contain`} />;
}
