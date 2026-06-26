import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MoreHorizontal, Trash2, Pencil, BadgeCheck } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { timeAgo, formatCount } from '../../lib/format';
import Avatar from '../ui/Avatar.jsx';
import RichText from '../RichText.jsx';
import Button from '../ui/Button.jsx';

export default function CommentItem({ comment: initial, postId, onDeleted, depth = 0 }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [comment, setComment] = useState(initial);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editText, setEditText] = useState(initial.content);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef(null);

  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => setComment(initial), [initial]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const author = comment.author || {};
  const isOwner = user?.id === (author._id || author.id);
  const reacted = Boolean(comment.myReaction);

  // Comments use a single like (the API supports all six reaction types if you want them).
  const toggleLike = async () => {
    const was = reacted;
    setComment((c) => ({
      ...c,
      myReaction: was ? null : 'like',
      reactionsCount: Math.max(0, (c.reactionsCount || 0) + (was ? -1 : 1)),
    }));
    try {
      const { data } = was
        ? await api.delete(`/comments/${comment._id}/react`)
        : await api.post(`/comments/${comment._id}/react`, { type: 'like' });
      setComment((c) => ({ ...c, reactionsCount: data.data.reactionsCount }));
    } catch (e) {
      setComment((c) => ({
        ...c,
        myReaction: was ? 'like' : null,
        reactionsCount: Math.max(0, (c.reactionsCount || 0) + (was ? 1 : -1)),
      }));
      toast(apiError(e), 'error');
    }
  };

  const toggleReplies = async () => {
    if (repliesLoaded) {
      setShowReplies((s) => !s);
      return;
    }
    setLoadingReplies(true);
    try {
      const { data } = await api.get(`/comments/${comment._id}/replies`, { params: { limit: 50 } });
      setReplies(data.data.comments || []);
      setRepliesLoaded(true);
      setShowReplies(true);
    } catch (e) {
      toast(apiError(e), 'error');
    } finally {
      setLoadingReplies(false);
    }
  };

  const submitReply = async () => {
    const content = replyText.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, {
        content,
        parent: comment._id,
      });
      setReplies((r) => [...r, data.data.comment]);
      setRepliesLoaded(true);
      setShowReplies(true);
      setComment((c) => ({ ...c, repliesCount: (c.repliesCount || 0) + 1 }));
      setReplyText('');
      setReplying(false);
    } catch (e) {
      toast(apiError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    const content = editText.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/comments/${comment._id}`, { content });
      setComment((c) => ({
        ...c,
        content: data.data.comment.content,
        editedAt: data.data.comment.editedAt || new Date().toISOString(),
      }));
      setEditing(false);
    } catch (e) {
      toast(apiError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    try {
      await api.delete(`/comments/${comment._id}`);
      onDeleted?.(comment._id, 1 + (comment.repliesCount || 0));
    } catch (e) {
      toast(apiError(e), 'error');
    }
  };

  const removeReply = (id, n = 1) => {
    setReplies((r) => r.filter((x) => x._id !== id));
    setComment((c) => ({ ...c, repliesCount: Math.max(0, (c.repliesCount || 0) - n) }));
  };

  return (
    <div className="flex gap-3">
      <Link to={`/u/${author.username}`} className="shrink-0">
        <Avatar src={author.avatar} name={author.name} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">
          <Link to={`/u/${author.username}`} className="font-semibold text-ink hover:underline dark:text-white">
            {author.name}
          </Link>
          {author.verifiedBadge && <BadgeCheck size={13} className="shrink-0 text-brand-500" />}
          <span className="truncate text-slate-400">@{author.username}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="shrink-0 text-slate-400">{timeAgo(comment.createdAt)}</span>
          {comment.editedAt && <span className="shrink-0 text-xs text-slate-400">· edited</span>}

          {isOwner && (
            <div className="relative ml-auto" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Comment options"
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className="animate-slide-up absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-card dark:border-slate-800 dark:bg-slate-900">
                  <button
                    onClick={() => {
                      setEditing(true);
                      setEditText(comment.content);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={remove}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-coral-600 hover:bg-coral-50 dark:hover:bg-coral-500/10"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, 5000))}
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] text-ink focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-1.5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} loading={busy} disabled={!editText.trim()}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <RichText
            text={comment.content}
            className="mt-0.5 block whitespace-pre-wrap break-words text-[15px] text-slate-800 dark:text-slate-200"
          />
        )}

        <div className="mt-1 flex items-center gap-4 text-xs">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1 font-medium transition ${
              reacted ? 'text-coral-600 dark:text-coral-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Heart size={14} fill={reacted ? 'currentColor' : 'none'} />
            {comment.reactionsCount > 0 && formatCount(comment.reactionsCount)}
          </button>
          <button
            onClick={() => setReplying((r) => !r)}
            className="font-medium text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
          >
            Reply
          </button>
        </div>

        {replying && (
          <div className="mt-2">
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value.slice(0, 5000))}
              rows={2}
              placeholder={`Reply to ${author.name}…`}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] text-ink placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-1.5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReplying(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitReply} loading={busy} disabled={!replyText.trim()}>
                Reply
              </Button>
            </div>
          </div>
        )}

        {comment.repliesCount > 0 && (
          <button
            onClick={toggleReplies}
            className="mt-2 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            {loadingReplies
              ? 'Loading…'
              : showReplies
                ? 'Hide replies'
                : `View ${comment.repliesCount} ${comment.repliesCount === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {showReplies && replies.length > 0 && (
          <div className="mt-3 space-y-4 border-l-2 border-slate-100 pl-3 dark:border-slate-800">
            {replies.map((r) => (
              <CommentItem
                key={r._id}
                comment={r}
                postId={postId}
                onDeleted={removeReply}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
