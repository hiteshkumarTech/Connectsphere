import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { REACTION_EMOJI } from '../lib/constants';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from './ui/Avatar.jsx';

function describe(n) {
  switch (n.type) {
    case 'follow':
      return 'started following you';
    case 'reaction':
      return `reacted ${REACTION_EMOJI[n.reactionType] || ''} to your ${n.comment ? 'comment' : 'post'}`;
    case 'comment':
      return 'commented on your post';
    case 'reply':
      return 'replied to your comment';
    case 'mention':
      return 'mentioned you';
    default:
      return 'sent you a notification';
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    api
      .get('/notifications/unread-count')
      .then(({ data }) => setUnread(data.data.unreadCount))
      .catch(() => {});
  }, []);

  useSocketEvent('notification:new', ({ notification, unreadCount }) => {
    setItems((prev) => [notification, ...prev].slice(0, 30));
    setUnread(unreadCount ?? ((u) => u + 1));
    toast(`@${notification.sender?.username} ${describe(notification)}`, 'info');
  });

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const openPanel = async () => {
    setOpen((o) => !o);
    if (open) return;
    try {
      const { data } = await api.get('/notifications');
      setItems(data.data.notifications);
      if (data.data.unreadCount > 0) {
        await api.post('/notifications/read-all');
      }
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  const goTo = (n) => {
    setOpen(false);
    if (n.post?._id || n.post) navigate(`/post/${n.post._id || n.post}`);
    else if (n.sender?.username) navigate(`/u/${n.sender.username}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openPanel}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-slide-up absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="font-display text-sm font-semibold text-ink dark:text-white">Notifications</h3>
          </div>
          <div className="scroll-area max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">You're all caught up.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  onClick={() => goTo(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    n.read ? '' : 'bg-brand-50/50 dark:bg-brand-900/10'
                  }`}
                >
                  <Avatar src={n.sender?.avatar} name={n.sender?.name} size="sm" />
                  <p className="flex-1 text-sm leading-snug text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">@{n.sender?.username}</span> {describe(n)}
                    <span className="ml-1 text-xs text-slate-400">· {timeAgo(n.createdAt)}</span>
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
