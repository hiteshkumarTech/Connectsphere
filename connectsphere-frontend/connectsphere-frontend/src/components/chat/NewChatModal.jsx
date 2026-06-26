import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../ui/Modal.jsx';
import { Input } from '../ui/Input.jsx';
import Avatar from '../ui/Avatar.jsx';
import Spinner from '../ui/Spinner.jsx';

export default function NewChatModal({ open, onClose, onCreated }) {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creatingId, setCreatingId] = useState(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .get('/users/search', { params: { q: term } })
        .then(({ data }) => setResults((data.data.users || []).filter((u) => !u.isMe)))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  const start = async (u) => {
    setCreatingId(u._id);
    try {
      const { data } = await api.post('/chat/conversations', { userId: u._id });
      onCreated(data.data.conversation);
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New message">
      <Input
        autoFocus
        placeholder="Search people by name or username…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="scroll-area mt-3 max-h-80 min-h-[3rem] overflow-y-auto">
        {searching ? (
          <div className="flex justify-center py-8">
            <Spinner size={20} />
          </div>
        ) : q.trim() && results.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No people found for “{q.trim()}”.</p>
        ) : (
          results.map((u) => (
            <button
              key={u._id}
              onClick={() => start(u)}
              disabled={creatingId === u._id}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              <Avatar src={u.avatar} name={u.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-semibold text-ink dark:text-white">
                  {u.name}
                  {u.verifiedBadge && <BadgeCheck size={13} className="shrink-0 text-brand-500" />}
                </p>
                <p className="truncate text-xs text-slate-400">@{u.username}</p>
              </div>
              {creatingId === u._id && <Spinner size={16} />}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
