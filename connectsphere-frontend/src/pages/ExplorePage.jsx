import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X, Users, FileText, Compass } from 'lucide-react';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { useFeed } from '../hooks/useFeed';
import UserRow from '../components/UserRow.jsx';
import PostCard from '../components/post/PostCard.jsx';
import PostFeed from '../components/post/PostFeed.jsx';
import TrendingTags from '../components/TrendingTags.jsx';
import SuggestionsCard from '../components/SuggestionsCard.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

// Explore + Search, unified: a pinned search bar on top of a discovery feed.
// Empty query -> trending tags, people to follow, and trending posts.
// Active query -> People / Posts results.
export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [tab, setTab] = useState('people');
  const [people, setPeople] = useState([]);
  const [posts, setPosts] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounced = useDebounce(q.trim(), 300);
  const hasQuery = Boolean(debounced);

  // Trending posts power the no-query discovery state.
  const {
    posts: explorePosts,
    loading: exploreLoading,
    hasMore,
    loadMore,
    removeById,
  } = useFeed('/posts/explore');

  // Keep the query in the URL so searches survive refresh and are shareable.
  useEffect(() => {
    setParams(debounced ? { q: debounced } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    if (!debounced) {
      setPeople([]);
      setPosts([]);
      setSearching(false);
      return undefined;
    }
    let active = true;
    setSearching(true);
    Promise.all([
      api
        .get('/users/search', { params: { q: debounced } })
        .then((r) => r.data.data.users || [])
        .catch(() => []),
      api
        .get('/posts/search', { params: { q: debounced, limit: 20 } })
        .then((r) => r.data.data.posts || [])
        .catch(() => []),
    ])
      .then(([u, p]) => {
        if (!active) return;
        setPeople(u);
        setPosts(p);
      })
      .finally(() => active && setSearching(false));
    return () => {
      active = false;
    };
  }, [debounced]);

  const removeSearchPost = (id) => setPosts((prev) => prev.filter((p) => p._id !== id));

  const tabs = [
    { key: 'people', label: 'People', icon: Users, count: people.length },
    { key: 'posts', label: 'Posts', icon: FileText, count: posts.length },
  ];

  return (
    <div className="pb-3 sm:pb-5">
      {/* Pinned search bar */}
      <div className="z-20 bg-slate-50/85 px-4 pb-3 pt-3 backdrop-blur dark:bg-slate-950/85 sm:pt-5 lg:sticky lg:top-0">
        <div className="relative">
          <SearchIcon
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, posts, and tags"
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
        /* ---------- Discovery (no query) ---------- */
        <div className="space-y-6 pt-2">
          <TrendingTags />
          <SuggestionsCard />
          <div>
            <div className="mb-3 px-4 sm:px-0">
              <h2 className="font-display text-lg font-bold text-ink dark:text-white">
                Trending posts
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Popular right now across ConnectSphere.
              </p>
            </div>
            <PostFeed
              posts={explorePosts}
              loading={exploreLoading}
              hasMore={hasMore}
              loadMore={loadMore}
              onDeleted={removeById}
              empty={
                <EmptyState
                  icon={Compass}
                  title="Nothing here yet"
                  subtitle="Be the first to post something worth exploring."
                />
              }
            />
          </div>
        </div>
      ) : (
        /* ---------- Search results ---------- */
        <>
          <div className="flex gap-1 border-b border-slate-100 px-4 dark:border-slate-800">
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

          {searching ? (
            <div className="flex justify-center py-16">
              <Spinner size={26} />
            </div>
          ) : tab === 'people' ? (
            people.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No people found"
                subtitle={`Nothing matched “${debounced}”.`}
              />
            ) : (
              <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800/80 sm:mt-3 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:shadow-card sm:dark:border-slate-800 sm:dark:bg-slate-950">
                {people.map((u) => (
                  <UserRow key={u._id} user={u} />
                ))}
              </div>
            )
          ) : posts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No posts found"
              subtitle={`Nothing matched “${debounced}”.`}
            />
          ) : (
            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
              {posts.map((p) => (
                <PostCard key={p._id} post={p} onDeleted={removeSearchPost} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}