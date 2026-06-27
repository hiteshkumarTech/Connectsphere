import { Bookmark } from 'lucide-react';
import { useFeed } from '../hooks/useFeed';
import PostFeed from '../components/post/PostFeed.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function SavedPage() {
  const { posts, loading, hasMore, loadMore, removeById } = useFeed('/bookmarks');

  return (
    <div className="py-3 sm:py-5">
      <div className="mb-3 px-4 sm:mb-4 sm:px-0">
        <h1 className="font-display text-2xl font-bold text-ink dark:text-white">Saved</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Posts you've bookmarked.</p>
      </div>

      <PostFeed
        posts={posts}
        loading={loading}
        hasMore={hasMore}
        loadMore={loadMore}
        onDeleted={removeById}
        onUnsave={removeById}
        empty={
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            subtitle="Tap the bookmark icon on any post to save it for later."
          />
        }
      />
    </div>
  );
}
