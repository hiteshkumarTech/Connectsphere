import { useParams } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { useFeed } from '../hooks/useFeed';
import PostFeed from '../components/post/PostFeed.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function HashtagPage() {
  const { tag } = useParams();
  const lower = (tag || '').toLowerCase();
  const { posts, loading, hasMore, loadMore, removeById } = useFeed(`/posts/hashtag/${lower}`);

  return (
    <div className="py-3 sm:py-5">
      <div className="mb-3 flex items-center gap-3 px-4 sm:mb-4 sm:px-0">
        <span className="ai-gradient flex h-11 w-11 items-center justify-center rounded-2xl text-white">
          <Hash size={22} />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-ink dark:text-white">#{lower}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Posts tagged #{lower}</p>
        </div>
      </div>
      <PostFeed
        posts={posts}
        loading={loading}
        hasMore={hasMore}
        loadMore={loadMore}
        onDeleted={removeById}
        empty={
          <EmptyState
            icon={Hash}
            title="No posts yet"
            subtitle={`Be the first to post with #${lower}.`}
          />
        }
      />
    </div>
  );
}
