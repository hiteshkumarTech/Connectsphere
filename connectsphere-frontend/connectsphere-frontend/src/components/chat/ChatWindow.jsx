import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Send, X, BadgeCheck } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useSocket } from '../../context/SocketContext.jsx';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { useToast } from '../../context/ToastContext.jsx';
import Avatar from '../ui/Avatar.jsx';
import Spinner from '../ui/Spinner.jsx';
import MessageBubble from './MessageBubble.jsx';

const sid = (v) => String(v?._id || v || '');

export default function ChatWindow({ conversation, conversationId, meId, onActivity, onRead, onBack }) {
  const { socket, connected } = useSocket();
  const { toast } = useToast();

  const [messages, setMessages] = useState([]);
  const [readState, setReadState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState([]); // usernames

  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimers = useRef({});
  const isTypingRef = useRef(false);
  const stopTimer = useRef(null);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
  }, []);

  const markRead = useCallback(() => {
    api
      .post(`/chat/conversations/${conversationId}/read`)
      .then(() => onRead?.(conversationId))
      .catch(() => {});
  }, [conversationId, onRead]);

  // Load history when the conversation changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessages([]);
    setPage(1);
    api
      .get(`/chat/conversations/${conversationId}/messages`, { params: { page: 1, limit: 25 } })
      .then(({ data }) => {
        if (!active) return;
        setMessages([...data.data.messages].reverse());
        setReadState(data.data.readState || []);
        setHasMore(Boolean(data.data.pagination?.hasMore));
        setTimeout(() => scrollToBottom(), 50);
        markRead();
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Join the conversation room for typing/read relays.
  useEffect(() => {
    if (!socket || !connected || !conversationId) return undefined;
    socket.emit('conversation:join', { conversationId });
    return () => socket.emit('conversation:leave', { conversationId });
  }, [socket, connected, conversationId]);

  const loadEarlier = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight || 0;
    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}/messages`, {
        params: { page: page + 1, limit: 25 },
      });
      const older = [...data.data.messages].reverse();
      setMessages((prev) => [...older, ...prev]);
      setHasMore(Boolean(data.data.pagination?.hasMore));
      setPage((p) => p + 1);
      // Preserve scroll position after prepending.
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  };

  // --- real-time events ---
  useSocketEvent('message:new', ({ conversationId: cid, message }) => {
    if (cid !== conversationId) return;
    addMessage(message);
    scrollToBottom(true);
    if (sid(message.sender) !== sid(meId)) markRead();
  });

  useSocketEvent('message:read', ({ conversationId: cid, userId, lastReadAt }) => {
    if (cid !== conversationId) return;
    setReadState((prev) => {
      const others = prev.filter((r) => sid(r.user) !== sid(userId));
      return [...others, { user: userId, lastReadAt }];
    });
  });

  useSocketEvent('message:edited', ({ message }) => {
    if (!message) return;
    setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, ...message } : m)));
  });

  useSocketEvent('message:deleted', ({ messageId, conversationId: cid }) => {
    if (cid && cid !== conversationId) return;
    setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, deleted: true } : m)));
  });

  useSocketEvent('typing:start', ({ conversationId: cid, userId, username }) => {
    if (cid !== conversationId || sid(userId) === sid(meId)) return;
    setTyping((prev) => (prev.includes(username) ? prev : [...prev, username]));
    clearTimeout(typingTimers.current[username]);
    typingTimers.current[username] = setTimeout(
      () => setTyping((prev) => prev.filter((u) => u !== username)),
      4000
    );
  });

  useSocketEvent('typing:stop', ({ conversationId: cid, username }) => {
    if (cid !== conversationId) return;
    setTyping((prev) => prev.filter((u) => u !== username));
  });

  // Emit typing as the user writes.
  const onType = (e) => {
    setText(e.target.value.slice(0, 5000));
    if (!socket || !connected) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { conversationId });
    }
    clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { conversationId });
    }, 1800);
  };

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 4 - files.length);
    if (!picked.length) return;
    setFiles((f) => [...f, ...picked]);
    setPreviews((p) => [...p, ...picked.map((file) => URL.createObjectURL(file))]);
    e.target.value = '';
  };
  const removeFile = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const send = async () => {
    const content = text.trim();
    if ((!content && files.length === 0) || sending) return;
    setSending(true);
    if (socket && connected) {
      isTypingRef.current = false;
      socket.emit('typing:stop', { conversationId });
    }
    try {
      const fd = new FormData();
      if (content) fd.append('content', content);
      files.forEach((f) => fd.append('attachments', f));
      const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, fd);
      addMessage(data.data.message);
      onActivity?.(conversationId, data.data.message);
      setText('');
      previews.forEach(URL.revokeObjectURL);
      setFiles([]);
      setPreviews([]);
      scrollToBottom(true);
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Header info (falls back to a sender's name for deep links before the list loads).
  const derivedName = useMemo(() => {
    const m = messages.find((x) => sid(x.sender) !== sid(meId));
    return m?.sender?.name;
  }, [messages, meId]);

  const isGroup = conversation?.isGroup;
  const other = conversation?.otherUser;
  const title = isGroup ? conversation?.name : other?.name || derivedName || 'Conversation';
  const online = isGroup ? undefined : conversation?.online;

  // "Seen" receipt for DMs.
  const seen = useMemo(() => {
    if (isGroup) return false;
    const myLast = [...messages].reverse().find((m) => sid(m.sender) === sid(meId) && !m.deleted);
    if (!myLast) return false;
    const otherRead = readState.find((r) => sid(r.user) !== sid(meId))?.lastReadAt;
    return otherRead && new Date(otherRead) >= new Date(myLast.createdAt);
  }, [messages, readState, meId, isGroup]);

  const lastOwnId = useMemo(() => {
    const m = [...messages].reverse().find((x) => sid(x.sender) === sid(meId) && !x.deleted);
    return m?._id;
  }, [messages, meId]);

  const canSend = (text.trim() || files.length) && !sending;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        {!isGroup && other ? (
          <Link to={`/u/${other.username}`} className="flex min-w-0 items-center gap-3">
            <Avatar src={other.avatar} name={other.name} size="sm" online={online} />
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate font-semibold text-ink dark:text-white">
                {title}
                {other.verifiedBadge && <BadgeCheck size={14} className="text-brand-500" />}
              </p>
              <p className="text-xs text-slate-400">{online ? 'Active now' : `@${other.username}`}</p>
            </div>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={conversation?.avatar} name={title} size="sm" />
            <p className="truncate font-semibold text-ink dark:text-white">{title}</p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-area flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
            Say hello 👋 — this is the start of your conversation.
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  onClick={loadEarlier}
                  disabled={loadingMore}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                >
                  {loadingMore ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}
            {messages.map((m, i) => {
              const mine = sid(m.sender) === sid(meId);
              const prev = messages[i - 1];
              const newSender = !prev || sid(prev.sender) !== sid(m.sender);
              return (
                <div key={m._id}>
                  <MessageBubble
                    message={m}
                    mine={mine}
                    showAvatar={!mine && newSender}
                    showName={isGroup && !mine && newSender}
                  />
                  {mine && m._id === lastOwnId && seen && (
                    <p className="mt-0.5 pr-1 text-right text-[11px] text-slate-400">Seen</p>
                  )}
                </div>
              );
            })}
          </>
        )}
        {typing.length > 0 && (
          <p className="px-1 text-xs italic text-slate-400">
            {typing.length === 1 ? `${typing[0]} is typing…` : 'Several people are typing…'}
          </p>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
        {previews.length > 0 && (
          <div className="mb-2 flex gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative h-16 w-16 overflow-hidden rounded-lg">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  aria-label="Remove"
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/60 text-white"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={files.length >= 4}
            aria-label="Attach image"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand-500 transition hover:bg-brand-50 disabled:opacity-40 dark:hover:bg-brand-900/20"
          >
            <ImagePlus size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
          <textarea
            value={text}
            onChange={onType}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Message…"
            className="scroll-area max-h-32 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[15px] text-ink placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            onClick={send}
            disabled={!canSend}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            {sending ? <Spinner size={18} className="text-white" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
