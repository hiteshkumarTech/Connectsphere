import { useState } from 'react';
import { api } from '../lib/api';

export default function FollowButton({ user, size = 'md', onChange }) {
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const [busy, setBusy] = useState(false);

  if (user.isMe) return null;

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      if (next) await api.post(`/users/${user.username}/follow`);
      else await api.delete(`/users/${user.username}/follow`);
      onChange?.(next);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };

  const pad = size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-1.5 text-sm';
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 rounded-full font-semibold transition disabled:opacity-60 ${pad} ${
        following
          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          : 'bg-brand-600 text-white hover:bg-brand-700'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
