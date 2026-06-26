export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/30">
          <Icon size={26} />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-ink dark:text-white">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
