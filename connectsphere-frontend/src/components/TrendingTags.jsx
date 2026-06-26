import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hash, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { formatCount } from '../lib/format';

export default function TrendingTags() {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    api
      .get('/posts/hashtags/trending')
      .then(({ data }) => setTags(data.data.hashtags || []))
      .catch(() => {});
  }, []);

  if (tags.length === 0) return null;

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
        <TrendingUp size={16} className="text-brand-500" /> Trending tags
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Link
            key={t.tag}
            to={`/tag/${t.tag}`}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
          >
            <Hash size={14} className="text-brand-500" />
            <span className="font-medium text-slate-700 dark:text-slate-200">{t.tag}</span>
            <span className="text-xs text-slate-400">{formatCount(t.count)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
