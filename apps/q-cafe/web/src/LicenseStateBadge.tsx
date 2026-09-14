import { BadgeCheck, Clock3 } from 'lucide-react';

type Props = { licensed?: boolean; onClick?: () => void };

export function LicenseStateBadge({ licensed = false, onClick }: Props) {
  const label = licensed ? 'Activated' : 'Trial';
  const Icon = licensed ? BadgeCheck : Clock3;
  const className = `fixed bottom-6 left-6 z-10 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${licensed ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'} ${onClick ? 'cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''}`;

  if (onClick) return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
        window.dispatchEvent(new Event('q-cafe-open-license-activation'));
      }}
      className={className}
      aria-label="Open Q Cafe activation"
    >
      <Icon size={15} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
  return (
    <div className={className}>
      <Icon size={15} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
