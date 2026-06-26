import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { REACTIONS, REACTION_EMOJI } from '../../lib/constants';
import { formatCount } from '../../lib/format';

export default function ReactionBar({ myReaction, count, onReact, onUnreact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const active = Boolean(myReaction);
  const onTrigger = () => {
    if (active) onUnreact();
    else setOpen((o) => !o);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onTrigger}
        onMouseEnter={() => !active && setOpen(true)}
        aria-label={active ? 'Remove reaction' : 'React'}
        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
          active
            ? 'text-coral-600 dark:text-coral-400'
            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
      >
        {active ? (
          <span className="text-base leading-none">{REACTION_EMOJI[myReaction]}</span>
        ) : (
          <Heart size={18} />
        )}
        {count > 0 && <span>{formatCount(count)}</span>}
      </button>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="animate-pop-in absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-card dark:border-slate-800 dark:bg-slate-900"
        >
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={() => {
                onReact(r.type);
                setOpen(false);
              }}
              aria-label={r.label}
              title={r.label}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
