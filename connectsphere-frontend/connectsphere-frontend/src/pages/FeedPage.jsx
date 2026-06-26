import { Sparkles } from 'lucide-react';
import { useFeed } from '../hooks/useFeed';
import Composer from '../components/post/Composer.jsx';
import PostFeed from '../components/post/PostFeed.jsx';
import SuggestionsCard from '../components/SuggestionsCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function FeedPage() {
  const { posts, loading, hasMore, loadMore, prepend, removeById } = useFeed('/posts/feed');

  return (
    <div className="py-3 sm:py-5">
      <Composer onCreated={prepend} />
      <div className="mt-3 sm:mt-4">
        <SuggestionsCard />
      </div>
      <div className="mt-3 sm:mt-4">
        <PostFeed
          posts={posts}
          loading={loading}
          hasMore={hasMore}
          loadMore={loadMore}
          onDeleted={removeById}
          empty={
            <EmptyState
              icon={Sparkles}
              title="Your feed is waiting"
              subtitle="Follow a few people or share your first post to get things rolling."
            />
          }
        />
      </div>
    </div>
  );
}
