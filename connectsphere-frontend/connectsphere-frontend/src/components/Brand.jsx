import { Orbit } from 'lucide-react';

export default function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="ai-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lift">
        <Orbit size={20} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-ink dark:text-white">
          Connect<span className="text-brand-600 dark:text-brand-400">Sphere</span>
        </span>
      )}
    </div>
  );
}
