/** Logo Baresto : une table ronde vue de dessus. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-bold tracking-tight ${light ? "text-white" : "text-stone-900"}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="#b45309" />
        <circle cx="16" cy="16" r="6" fill="#fff" />
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x="14" y="3.5" width="4" height="4" rx="1.2" fill="#fde68a" transform={`rotate(${a} 16 16)`} />
        ))}
      </svg>
      Baresto
    </span>
  );
}
