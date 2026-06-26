import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

// Paginated post loader shared by the feed, explore, and profile screens.
export function useFeed(endpoint, params = {}) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const paramKey = JSON.stringify(params);

  const load = useCallback(
    async (p) => {
      setLoading(true);
      setError(false);
      try {
        const { data } = await api.get(endpoint, { params: { page: p, limit: 10, ...params } });
        const incoming = data.data.posts || [];
        setPosts((prev) => (p === 1 ? incoming : [...prev, ...incoming]));
        setHasMore(Boolean(data.data.pagination?.hasMore));
        setPage(p);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, paramKey]
  );

  useEffect(() => {
    setPosts([]);
    setPage(1);
    load(1);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) load(page + 1);
  }, [loading, hasMore, page, load]);

  const prepend = useCallback((post) => setPosts((prev) => [post, ...prev]), []);
  const removeById = useCallback((id) => setPosts((prev) => prev.filter((p) => p._id !== id)), []);

  return { posts, loading, hasMore, error, loadMore, prepend, removeById };
}
