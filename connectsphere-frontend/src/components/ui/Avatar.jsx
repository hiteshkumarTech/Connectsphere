import { initials } from '../../lib/format';

const SIZE = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export default function Avatar({ src, name = '', size = 'md', online, className = '' }) {
  const big = size === 'lg' || size === 'xl';
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 ${SIZE[size] || SIZE.md} ${className}`}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name) || '?'}</span>
      )}
      {online !== undefined && online !== null && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-slate-950 ${online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} ${big ? 'h-4 w-4' : 'h-2.5 w-2.5'}`}
        />
      )}
    </span>
  );
}
