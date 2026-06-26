import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { api } from '../lib/api';
import { formatCount } from '../lib/format';
import Avatar from './ui/Avatar.jsx';

export default function SuggestionsCard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api
      .get('/users/suggestions')
      .then(({ data }) => setUsers(data.data.users || []))
      .catch(() => {});
  }, []);

  const follow = async (u) => {
    setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, isFollowing: true } : x)));
    try {
      await api.post(`/users/${u.username}/follow`);
    } catch {
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, isFollowing: false } : x)));
    }
  };

  if (users.length === 0) return null;

  return (
    <div className="border-b border-slate-100 bg-white px-4 py-4 dark:border-slate-800/80 dark:bg-slate-950 sm:rounded-2xl sm:border sm:shadow-card sm:dark:border-slate-800">
      <h3 className="font-display text-sm font-semibold text-ink dark:text-white">Who to follow</h3>
      <div className="mt-3 space-y-3">
        {users.slice(0, 4).map((u) => (
          <div key={u._id} className="flex items-center gap-3">
            <Link to={`/u/${u.username}`}>
              <Avatar src={u.avatar} name={u.name} size="sm" />
            </Link>
            <Link to={`/u/${u.username}`} className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-semibold text-ink dark:text-white">
                {u.name}
                {u.verifiedBadge && <BadgeCheck size={13} className="shrink-0 text-brand-500" />}
              </p>
              <p className="truncate text-xs text-slate-400">
                {formatCount(u.followersCount || 0)} followers
              </p>
            </Link>
            <button
              onClick={() => follow(u)}
              disabled={u.isFollowing}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                u.isFollowing
                  ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {u.isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
