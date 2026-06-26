import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PostCard from '../components/post/PostCard.jsx';
import CommentItem from '../components/comment/CommentItem.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const [comments, setComments] = useState([]);
  const [cLoading, setCLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMissing(false);
    api
      .get(`/posts/${id}`)
      .then(({ data }) => active && setPost(data.data.post))
      .catch(() => active && setMissing(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const loadComments = (p) => {
    setCLoading(true);
    api
      .get(`/posts/${id}/comments`, { params: { page: p, limit: 20 } })
      .then(({ data }) => {
        setComments((prev) => (p === 1 ? data.data.comments : [...prev, ...data.data.comments]));
        setHasMore(Boolean(data.data.pagination?.hasMore));
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setCLoading(false));
  };

  useEffect(() => {
    setComments([]);
    setPage(1);
    loadComments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addComment = async () => {
    const content = text.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/posts/${id}/comments`, { content });
      setComments((prev) => [data.data.comment, ...prev]);
      setPost((p) => (p ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      setText('');
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setPosting(false);
    }
  };

  // CommentItem reports how many nodes were removed (the comment + its replies).
  const removeComment = (commentId, removed = 1) => {
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    setPost((p) => (p ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - removed) } : p));
  };

  return (
    <div className="py-3 sm:py-5">
      <div className="mb-3 flex items-center gap-3 px-4 sm:px-0">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-lg font-semibold text-ink dark:text-white">Post</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      ) : missing || !post ? (
        <EmptyState title="Post not found" subtitle="It may have been deleted." />
      ) : (
        <>
          <PostCard post={post} onDeleted={() => navigate('/')} />

          {/* Add a comment */}
          <div className="mt-3 flex gap-3 border-b border-slate-100 bg-white px-4 py-4 dark:border-slate-800/80 dark:bg-slate-950 sm:mt-4 sm:rounded-2xl sm:border sm:shadow-card sm:dark:border-slate-800">
            <Avatar src={user?.avatar} name={user?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 5000))}
                rows={2}
                placeholder="Write a comment…"
                className="w-full resize-none border-0 bg-transparent p-0 text-[15px] text-ink placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={addComment} loading={posting} disabled={!text.trim()}>
                  Comment
                </Button>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="mt-3 bg-white dark:bg-slate-950 sm:mt-4 sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-card sm:dark:border-slate-800">
            {cLoading && comments.length === 0 ? (
              <div className="flex justify-center py-12">
                <Spinner size={22} />
              </div>
            ) : comments.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                No comments yet. Start the conversation.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {comments.map((c) => (
                  <div key={c._id} className="px-4 py-3.5">
                    <CommentItem comment={c} postId={id} onDeleted={removeComment} />
                  </div>
                ))}
                {hasMore && (
                  <div className="p-3 text-center">
                    <button
                      onClick={() => loadComments(page + 1)}
                      className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Load more comments
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
