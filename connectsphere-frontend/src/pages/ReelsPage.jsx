import { useCallback, useEffect, useRef, useState } from 'react';
import { Clapperboard, Play, Plus, Heart } from 'lucide-react';
import { api } from '../lib/api';
import ReelViewer from '../components/reel/ReelViewer.jsx';
import CreateReelModal from '../components/reel/CreateReelModal.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

function compact(n) {
  if (!n) return 0;
  if (n < 1000) return n;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export default function ReelsPage() {
  const [reels, setReels] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    const next = page + 1;
    try {
      const { data } = await api.get('/reels', { params: { page: next, limit: 12 } });
      const incoming = data.data.reels || [];
      setReels((prev) => {
        const seen = new Set(prev.map((r) => r._id));
        return [...prev, ...incoming.filter((r) => !seen.has(r._id))];
      });
      setHasMore(Boolean(data.data.pagination?.hasMore));
      setPage(next);
    } catch {
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, hasMore]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return undefined;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: '600px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  const updateReel = useCallback((id, patch) => {
    setReels((prev) =>
      patch.__deleted
        ? prev.filter((r) => r._id !== id)
        : prev.map((r) => (r._id === id ? { ...r, ...patch } : r))
    );
  }, []);

  return (
    <div className="py-3 sm:py-5">
      <div className="mb-3 flex items-center justify-between px-4 sm:mb-4 sm:px-0">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink dark:text-white">Reels</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Short videos from across ConnectSphere.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <Plus size={17} /> Create
        </button>
      </div>

      {loading && reels.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      ) : reels.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="No reels yet"
          subtitle="Be the first to share a short video."
        />
      ) : (
        <div className="grid grid-cols-3 gap-1 px-1 sm:gap-2 sm:px-0">
          {reels.map((reel, i) => (
            <button
              key={reel._id}
              onClick={() => setViewerIndex(i)}
              className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800"
            >
              {reel.thumbnailUrl ? (
                <img
                  src={reel.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <video
                  src={reel.videoUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              )}
              <span className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
                <Play size={14} fill="currentColor" />
              </span>
              <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs font-medium text-white drop-shadow">
                <Heart size={13} fill="currentColor" /> {compact(reel.reactionsCount)}
              </span>
            </button>
          ))}
        </div>
      )}

      {hasMore && reels.length > 0 && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          <Spinner size={22} />
        </div>
      )}

      {viewerIndex !== null && (
        <ReelViewer
          reels={reels}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNeedMore={loadMore}
          onUpdateReel={updateReel}
        />
      )}

      <CreateReelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(reel) => setReels((prev) => [reel, ...prev])}
      />
    </div>
  );
}
