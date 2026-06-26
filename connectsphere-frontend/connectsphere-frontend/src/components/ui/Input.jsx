import { forwardRef } from 'react';

const base =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 transition focus:border-brand-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export const Input = forwardRef(function Input(
  { label, error, id, className = '', ...props },
  ref
) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`${base} ${error ? 'border-coral-400' : 'border-slate-200 dark:border-slate-800'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-coral-600">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, id, className = '', ...props },
  ref
) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        className={`${base} resize-none ${error ? 'border-coral-400' : 'border-slate-200 dark:border-slate-800'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-coral-600">{error}</p>}
    </div>
  );
});
