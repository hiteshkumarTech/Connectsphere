import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Share2, MoreHorizontal, Trash2, Pin, BadgeCheck } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { timeAgo, formatCount } from '../../lib/format';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Avatar from '../ui/Avatar.jsx';
import RichText from '../RichText.jsx';
import ReactionBar from './ReactionBar.jsx';

function ImageGrid({ images }) {
  if (!images?.length) return null;
  if (images.length === 1) {
    return (
      <img
        src={images[0].url}
        alt=""
        className="mt-3 max-h-[30rem] w-full rounded-xl object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
      {images.slice(0, 4).map((img, i) => (
        <img key={i} src={img.url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
      ))}
    </div>
  );
}

export default function PostCard({ post: initial, onDeleted }) {
  const [post, setPost] = useState(initial);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => setPost(initial), [initial]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const author = post.author || {};
  const isOwner = user?.id === (author._id || author.id);

  const react = async (type) => {
    const prev = post.myReaction;
    setPost((p) => ({ ...p, myReaction: type, reactionsCount: p.reactionsCount + (prev ? 0 : 1) }));
    try {
      const { data } = await api.post(`/posts/${post._id}/react`, { type });
      setPost((p) => ({ ...p, myReaction: type, reactionsCount: data.data.reactionsCount }));
    } catch (err) {
      setPost((p) => ({ ...p, myReaction: prev, reactionsCount: p.reactionsCount - (prev ? 0 : 1) }));
      toast(apiError(err), 'error');
    }
  };

  const unreact = async () => {
    const prev = post.myReaction;
    setPost((p) => ({ ...p, myReaction: null, reactionsCount: Math.max(0, p.reactionsCount - 1) }));
    try {
      const { data } = await api.delete(`/posts/${post._id}/react`);
      setPost((p) => ({ ...p, reactionsCount: data.data.reactionsCount }));
    } catch (err) {
      setPost((p) => ({ ...p, myReaction: prev, reactionsCount: p.reactionsCount + 1 }));
      toast(apiError(err), 'error');
    }
  };

  const share = async () => {
    setPost((p) => ({ ...p, sharesCount: (p.sharesCount || 0) + 1 }));
    try {
      await api.post(`/posts/${post._id}/share`);
      await navigator.clipboard?.writeText(`${window.location.origin}/post/${post._id}`);
      toast('Link copied to clipboard', 'success');
    } catch {
      /* clipboard may be blocked; the share still counted */
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    try {
      await api.delete(`/posts/${post._id}`);
      toast('Post deleted', 'success');
      onDeleted?.(post._id);
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  const togglePin = async () => {
    setMenuOpen(false);
    try {
      const { data } = await api.post(`/posts/${post._id}/pin`);
      setPost((p) => ({ ...p, pinned: data.data.pinned }));
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  return (
    <article className="border-b border-slate-100 bg-white px-4 py-4 transition dark:border-slate-800/80 dark:bg-slate-950 sm:rounded-2xl sm:border sm:shadow-card sm:dark:border-slate-800">
      <div className="flex items-start gap-3">
        <Link to={`/u/${author.username}`}>
          <Avatar src={author.avatar} name={author.name} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/u/${author.username}`}
              className="truncate font-semibold text-ink hover:underline dark:text-white"
            >
              {author.name}
            </Link>
            {author.verifiedBadge && <BadgeCheck size={15} className="shrink-0 text-brand-500" />}
            <span className="truncate text-sm text-slate-400">@{author.username}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link to={`/post/${post._id}`} className="text-sm text-slate-400 hover:underline">
              {timeAgo(post.createdAt)}
            </Link>
            {post.pinned && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                <Pin size={10} /> Pinned
              </span>
            )}
          </div>

          {post.content && (
            <RichText
              text={post.content}
              className="mt-1 block whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800 dark:text-slate-200"
            />
          )}
          <ImageGrid images={post.images} />

          <div className="mt-2 flex items-center gap-1 text-slate-500">
            <ReactionBar
              myReaction={post.myReaction}
              count={post.reactionsCount}
              onReact={react}
              onUnreact={unreact}
            />
            <button
              onClick={() => navigate(`/post/${post._id}`)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <MessageCircle size={18} />
              {post.commentsCount > 0 && <span>{formatCount(post.commentsCount)}</span>}
            </button>
            <button
              onClick={share}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Share2 size={17} />
              {post.sharesCount > 0 && <span>{formatCount(post.sharesCount)}</span>}
            </button>
          </div>
        </div>

        {isOwner && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Post options"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="animate-slide-up absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-card dark:border-slate-800 dark:bg-slate-900">
                <button
                  onClick={togglePin}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Pin size={15} /> {post.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={remove}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-coral-600 hover:bg-coral-50 dark:hover:bg-coral-500/10"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
