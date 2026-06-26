import { Compass } from 'lucide-react';
import { useFeed } from '../hooks/useFeed';
import PostFeed from '../components/post/PostFeed.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function ExplorePage() {
  const { posts, loading, hasMore, loadMore, removeById } = useFeed('/posts/explore');

  return (
    <div className="py-3 sm:py-5">
      <div className="mb-3 px-4 sm:mb-4 sm:px-0">
        <h1 className="font-display text-2xl font-bold text-ink dark:text-white">Explore</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Trending posts from across ConnectSphere.
        </p>
      </div>
      <PostFeed
        posts={posts}
        loading={loading}
        hasMore={hasMore}
        loadMore={loadMore}
        onDeleted={removeById}
        empty={<EmptyState icon={Compass} title="Nothing here yet" subtitle="Be the first to post something worth exploring." />}
      />
    </div>
  );
}
