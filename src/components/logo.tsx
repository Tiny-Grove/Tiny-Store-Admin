export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="Bizzloc" className={`${className} object-contain`} />;
}
