import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, X, Trash2 } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Avatar from '../ui/Avatar.jsx';
import ReelComments from './ReelComments.jsx';

function compact(n) {
  if (!n) return 0;
  if (n < 1000) return n;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export default function ReelViewer({ reels, startIndex = 0, onClose, onNeedMore, onUpdateReel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const slideRefs = useRef([]);
  const videoRefs = useRef([]);
  const viewedRef = useRef(new Set());
  const [active, setActive] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState(null);

  // Jump to the tapped reel on open, and lock background scroll.
  useEffect(() => {
    slideRefs.current[startIndex]?.scrollIntoView({ block: 'start' });
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes; arrow keys move between reels (desktop).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowDown')
        slideRefs.current[active + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (e.key === 'ArrowUp')
        slideRefs.current[active - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);

  // The most-visible slide becomes active.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActive(Number(entry.target.dataset.index));
          }
        });
      },
      { threshold: [0.6] }
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels.length]);

  // Play the active reel, pause the rest, count a view once, prefetch more.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.muted = muted;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
    const reel = reels[active];
    if (reel && !viewedRef.current.has(reel._id)) {
      viewedRef.current.add(reel._id);
      api
        .post(`/reels/${reel._id}/view`)
        .then((r) => onUpdateReel?.(reel._id, { viewsCount: r.data.data.viewsCount }))
        .catch(() => {});
    }
    if (active >= reels.length - 2) onNeedMore?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reels.length]);

  // Mute toggle applies to every video.
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.muted = muted;
    });
  }, [muted]);

  const togglePlay = (i) => {
    const v = videoRefs.current[i];
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleLike = async (reel) => {
    const liked = !reel.liked;
    const reactionsCount = Math.max(0, (reel.reactionsCount || 0) + (liked ? 1 : -1));
    onUpdateReel?.(reel._id, { liked, reactionsCount });
    try {
      if (liked) await api.post(`/reels/${reel._id}/like`);
      else await api.delete(`/reels/${reel._id}/like`);
    } catch (err) {
      onUpdateReel?.(reel._id, { liked: reel.liked, reactionsCount: reel.reactionsCount });
      toast(apiError(err, 'Could not update like'), 'error');
    }
  };

  const share = async (reel) => {
    const url = `${window.location.origin}/reels`;
    try {
      if (navigator.share) await navigator.share({ title: 'Reel on ConnectSphere', url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied', 'success');
      }
      const { data } = await api.post(`/reels/${reel._id}/share`);
      onUpdateReel?.(reel._id, { sharesCount: data.data.sharesCount });
    } catch (_e) {
      /* share cancelled — ignore */
    }
  };

  const removeReel = async (reel) => {
    if (!window.confirm('Delete this reel? This cannot be undone.')) return;
    try {
      await api.delete(`/reels/${reel._id}`);
      toast('Reel deleted', 'success');
      onUpdateReel?.(reel._id, { __deleted: true });
      onClose?.();
    } catch (err) {
      toast(apiError(err, 'Could not delete reel'), 'error');
    }
  };

  const RailButton = ({ onClick, children, count, active: isOn }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-white">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60 ${
          isOn ? 'text-coral-500' : 'text-white'
        }`}
      >
        {children}
      </span>
      {count !== undefined && <span className="text-xs font-medium drop-shadow">{count}</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
        >
          <X size={20} />
        </button>
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <div className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth [&::-webkit-scrollbar]:hidden">
        {reels.map((reel, i) => {
          const mine = user && String(reel.author?._id) === String(user.id);
          return (
            <section
              key={reel._id}
              data-index={i}
              ref={(el) => (slideRefs.current[i] = el)}
              className="relative flex h-full w-full snap-start items-center justify-center"
            >
              <video
                ref={(el) => (videoRefs.current[i] = el)}
                src={reel.videoUrl}
                poster={reel.thumbnailUrl || undefined}
                loop
                playsInline
                preload="metadata"
                onClick={() => togglePlay(i)}
                className="h-full w-full bg-black object-cover sm:object-contain"
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 pb-6">
                <div className="pointer-events-auto mr-16 max-w-md">
                  <Link to={`/u/${reel.author?.username}`} className="flex items-center gap-2">
                    <Avatar src={reel.author?.avatar} name={reel.author?.name} size="sm" />
                    <span className="text-sm font-semibold text-white drop-shadow">
                      @{reel.author?.username}
                    </span>
                  </Link>
                  {reel.caption && (
                    <p className="mt-2 line-clamp-3 text-sm text-white/90 drop-shadow">
                      {reel.caption}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-white/60">{compact(reel.viewsCount)} views</p>
                </div>
              </div>

              <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-5">
                <RailButton
                  onClick={() => toggleLike(reel)}
                  count={compact(reel.reactionsCount)}
                  active={reel.liked}
                >
                  <Heart size={24} fill={reel.liked ? 'currentColor' : 'none'} />
                </RailButton>
                <RailButton
                  onClick={() => setCommentsFor(reel._id)}
                  count={compact(reel.commentsCount)}
                >
                  <MessageCircle size={23} />
                </RailButton>
                <RailButton onClick={() => share(reel)} count={compact(reel.sharesCount)}>
                  <Share2 size={22} />
                </RailButton>
                {mine && (
                  <RailButton onClick={() => removeReel(reel)}>
                    <Trash2 size={20} />
                  </RailButton>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ReelComments
        reelId={commentsFor}
        open={Boolean(commentsFor)}
        onClose={() => setCommentsFor(null)}
        onCountChange={(delta) =>
          commentsFor &&
          onUpdateReel?.(commentsFor, {
            commentsCount: Math.max(
              0,
              (reels.find((r) => r._id === commentsFor)?.commentsCount || 0) + delta
            ),
          })
        }
      />
    </div>
  );
}
