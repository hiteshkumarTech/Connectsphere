import { useEffect, useRef } from 'react';
import PostCard from './PostCard.jsx';
import Spinner from '../ui/Spinner.jsx';

export default function PostFeed({ posts, loading, hasMore, loadMore, onDeleted, onUnsave, empty }) {
  const sentinel = useRef(null);

  useEffect(() => {
    if (!hasMore) return undefined;
    const el = sentinel.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: '500px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={26} />
      </div>
    );
  }
  if (!loading && posts.length === 0) return empty || null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} onDeleted={onDeleted} onUnsave={onUnsave} />
      ))}
      {hasMore && (
        <div ref={sentinel} className="flex justify-center py-6">
          <Spinner size={22} />
        </div>
      )}
    </div>
  );
}
