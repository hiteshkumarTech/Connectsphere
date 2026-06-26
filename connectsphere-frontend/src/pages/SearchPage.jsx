import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X, Users, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import UserRow from '../components/UserRow.jsx';
import PostCard from '../components/post/PostCard.jsx';
import TrendingTags from '../components/TrendingTags.jsx';
import SuggestionsCard from '../components/SuggestionsCard.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [tab, setTab] = useState('people');
  const [people, setPeople] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(q.trim(), 300);

  // Keep the query in the URL so searches are shareable / survive refresh.
  useEffect(() => {
    setParams(debounced ? { q: debounced } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    if (!debounced) {
      setPeople([]);
      setPosts([]);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      api.get('/users/search', { params: { q: debounced } }).then((r) => r.data.data.users || []).catch(() => []),
      api.get('/posts/search', { params: { q: debounced, limit: 20 } }).then((r) => r.data.data.posts || []).catch(() => []),
    ])
      .then(([u, p]) => {
        if (!active) return;
        setPeople(u);
        setPosts(p);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced]);

  const removePost = (id) => setPosts((prev) => prev.filter((p) => p._id !== id));
  const hasQuery = Boolean(debounced);

  const tabs = [
    { key: 'people', label: 'People', icon: Users, count: people.length },
    { key: 'posts', label: 'Posts', icon: FileText, count: posts.length },
  ];

  return (
    <div className="py-3 sm:py-5">
      <div className="px-4">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people and posts"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-[15px] text-ink placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {!hasQuery ? (
        <div className="mt-6 space-y-6">
          <TrendingTags />
          <SuggestionsCard />
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-1 border-b border-slate-100 px-4 dark:border-slate-800">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  tab === t.key
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <t.icon size={16} /> {t.label}
                {t.count > 0 && <span className="text-xs text-slate-400">{t.count}</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size={26} />
            </div>
          ) : tab === 'people' ? (
            people.length === 0 ? (
              <EmptyState icon={Users} title="No people found" subtitle={`Nothing matched “${debounced}”.`} />
            ) : (
              <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800/80 sm:mt-3 sm:divide-y sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:shadow-card sm:dark:border-slate-800 sm:dark:bg-slate-950">
                {people.map((u) => (
                  <UserRow key={u._id} user={u} />
                ))}
              </div>
            )
          ) : posts.length === 0 ? (
            <EmptyState icon={FileText} title="No posts found" subtitle={`Nothing matched “${debounced}”.`} />
          ) : (
            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
              {posts.map((p) => (
                <PostCard key={p._id} post={p} onDeleted={removePost} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
