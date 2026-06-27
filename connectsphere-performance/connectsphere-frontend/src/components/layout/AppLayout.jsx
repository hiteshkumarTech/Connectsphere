import { useEffect, useState, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Clapperboard, Bookmark, MessageCircle, User, Plus, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import Brand from '../Brand.jsx';
import Avatar from '../ui/Avatar.jsx';
import Spinner from '../ui/Spinner.jsx';
import Button from '../ui/Button.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import UserMenu from './UserMenu.jsx';
import NotificationBell from '../NotificationBell.jsx';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const refreshUnread = () =>
    api
      .get('/chat/unread')
      .then(({ data }) => setUnread(data.data.total))
      .catch(() => {});

  useEffect(() => {
    refreshUnread();
  }, [location.pathname]);

  useSocketEvent('message:new', ({ message }) => {
    if (message?.sender?._id !== user?.id && !location.pathname.startsWith('/messages')) {
      setUnread((u) => u + 1);
    }
  });

  const nav = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/reels', label: 'Reels', icon: Clapperboard },
    { to: '/messages', label: 'Messages', icon: MessageCircle, badge: unread },
    { to: `/u/${user?.username}`, label: 'Profile', icon: User },
  ];

  const linkBase =
    'flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition';
  const linkClass = ({ isActive }) =>
    `${linkBase} ${
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`;

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 lg:flex">
        <div className="flex items-center justify-between px-1.5">
          <NavLink to="/" aria-label="Home">
            <Brand />
          </NavLink>
          <NotificationBell />
        </div>

        <nav className="mt-7 flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={20} />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1.5 text-[11px] font-semibold text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          ))}
          <NavLink to="/saved" className={linkClass}>
            <Bookmark size={20} />
            <span className="flex-1">Saved</span>
          </NavLink>
          <Button className="mt-3" onClick={() => navigate('/')}>
            <Plus size={18} /> New post
          </Button>
        </nav>

        <div className="mt-auto border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar src={user?.avatar} name={user?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink dark:text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">@{user?.username}</p>
            </div>
            <ThemeToggle />
            <button
              onClick={onLogout}
              aria-label="Log out"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-coral-50 hover:text-coral-600 dark:hover:bg-coral-500/10"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
        <NavLink to="/" aria-label="Home">
          <Brand />
        </NavLink>
        <div className="flex items-center">
          <NotificationBell />
          <ThemeToggle />
          <UserMenu placement="down" />
        </div>
      </header>

      {/* Main column — chat goes full-bleed; everything else is a centered column */}
      {location.pathname.startsWith('/messages') ? (
        <main className="lg:pl-64">
          <Suspense fallback={<div className="flex justify-center py-20"><Spinner size={26} /></div>}>
            <Outlet />
          </Suspense>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-2xl px-0 pb-24 lg:pb-10 lg:pl-64">
          <div className="lg:px-8">
            <Suspense fallback={<div className="flex justify-center py-20"><Spinner size={26} /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
        {nav.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 rounded-lg px-4 py-1.5 text-[11px] font-medium transition ${
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
              }`
            }
          >
            <Icon size={22} />
            {label}
            {badge > 0 && (
              <span className="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-coral-500" />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
