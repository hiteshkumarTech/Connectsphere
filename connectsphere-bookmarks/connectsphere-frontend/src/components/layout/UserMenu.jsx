import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, User, Bookmark, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import Avatar from '../ui/Avatar.jsx';

// The account "⋯" menu: profile, theme switch, and log out.
// placement="up" opens above the button (sidebar); "down" opens below (top bar).
export default function UserMenu({ placement = 'up' }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goProfile = () => {
    setOpen(false);
    navigate(`/u/${user?.username}`);
  };

  const onLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const panelPos = placement === 'down' ? 'top-full mt-2' : 'bottom-full mb-2';

  const itemClass =
    'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div
          role="menu"
          className={`animate-slide-up absolute right-0 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 ${panelPos}`}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <Avatar src={user?.avatar} name={user?.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink dark:text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">@{user?.username}</p>
            </div>
          </div>

          <div className="py-1">
            <button role="menuitem" onClick={goProfile} className={itemClass}>
              <User size={17} /> View profile
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate('/saved');
              }}
              className={itemClass}
            >
              <Bookmark size={17} /> Saved posts
            </button>
            <button role="menuitem" onClick={toggle} className={itemClass}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>

          <div className="border-t border-slate-100 py-1 dark:border-slate-800">
            <button
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-coral-600 transition hover:bg-coral-50 dark:hover:bg-coral-500/10"
            >
              <LogOut size={17} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
