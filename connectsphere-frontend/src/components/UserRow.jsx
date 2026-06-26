import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import Avatar from './ui/Avatar.jsx';
import FollowButton from './FollowButton.jsx';

export default function UserRow({ user }) {
  return (
    <Link
      to={`/u/${user.username}`}
      className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <Avatar src={user.avatar} name={user.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate font-semibold text-ink dark:text-white">
          {user.name}
          {user.verifiedBadge && <BadgeCheck size={14} className="shrink-0 text-brand-500" />}
        </p>
        <p className="truncate text-sm text-slate-400">@{user.username}</p>
        {user.bio && (
          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{user.bio}</p>
        )}
      </div>
      <FollowButton user={user} size="sm" />
    </Link>
  );
}
