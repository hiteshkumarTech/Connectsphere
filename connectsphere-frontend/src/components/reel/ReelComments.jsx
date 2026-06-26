import { useEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../ui/Modal.jsx';
import Avatar from '../ui/Avatar.jsx';
import Spinner from '../ui/Spinner.jsx';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString();
}

export default function ReelComments({ reelId, open, onClose, onCountChange }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open || !reelId) return undefined;
    let active = true;
    setLoading(true);
    api
      .get(`/reels/${reelId}/comments`, { params: { limit: 50 } })
      .then((r) => active && setComments(r.data.data.comments || []))
      .catch(() => active && setComments([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, reelId]);

  const submit = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/reels/${reelId}/comments`, { content });
      const created = data.data.comment;
      setComments((prev) => [created, ...prev]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      toast(apiError(err, 'Could not post comment'), 'error');
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    const prev = comments;
    setComments((c) => c.filter((x) => x._id !== id)); // optimistic
    onCountChange?.(-1);
    try {
      await api.delete(`/reels/${reelId}/comments/${id}`);
    } catch (err) {
      setComments(prev); // rollback
      onCountChange?.(1);
      toast(apiError(err, 'Could not delete comment'), 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Comments" maxWidth="max-w-md">
      <div className="max-h-[55vh] min-h-[140px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size={24} />
          </div>
        ) : comments.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No comments yet — be the first.
          </p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => {
              const mine = user && String(c.author?._id) === String(user.id);
              return (
                <li key={c._id} className="flex gap-3">
                  <Link to={`/u/${c.author?.username}`}>
                    <Avatar src={c.author?.avatar} name={c.author?.name} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">
                      <Link
                        to={`/u/${c.author?.username}`}
                        className="font-semibold text-ink hover:underline dark:text-white"
                      >
                        {c.author?.name}
                      </Link>{' '}
                      {c.content}
                    </p>
                    <span className="text-xs text-slate-400">{timeAgo(c.createdAt)}</span>
                  </div>
                  {mine && (
                    <button
                      onClick={() => remove(c._id)}
                      aria-label="Delete comment"
                      className="h-7 shrink-0 text-slate-300 transition hover:text-coral-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Add a comment…"
          className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || sending}
          aria-label="Post comment"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </Modal>
  );
}
