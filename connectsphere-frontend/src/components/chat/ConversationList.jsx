import { PenSquare } from 'lucide-react';
import { timeAgo } from '../../lib/format';
import Avatar from '../ui/Avatar.jsx';
import Spinner from '../ui/Spinner.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { MessageCircle } from 'lucide-react';

function preview(convo, meId) {
  const m = convo.lastMessage;
  if (!m) return 'No messages yet';
  const mine = (m.sender?._id || m.sender) === meId;
  let body = m.content;
  if (!body && m.attachments?.length) body = 'Photo';
  if (m.deleted) body = 'Message deleted';
  return `${mine ? 'You: ' : ''}${body || ''}`;
}

export default function ConversationList({ conversations, activeId, onSelect, onNewChat, loading, meId }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
        <h1 className="font-display text-xl font-bold text-ink dark:text-white">Messages</h1>
        <button
          onClick={onNewChat}
          aria-label="New message"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700"
        >
          <PenSquare size={17} />
        </button>
      </div>

      <div className="scroll-area flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner size={22} />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            subtitle="Start a chat to see it here."
          />
        ) : (
          conversations.map((c) => {
            const name = c.isGroup ? c.name : c.otherUser?.name || 'Unknown';
            const avatar = c.isGroup ? c.avatar : c.otherUser?.avatar;
            const active = c._id === activeId;
            return (
              <button
                key={c._id}
                onClick={() => onSelect(c)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  active
                    ? 'bg-brand-50 dark:bg-brand-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Avatar src={avatar} name={name} size="md" online={c.isGroup ? undefined : c.online} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-ink dark:text-white">{name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-sm ${
                        c.unreadCount > 0
                          ? 'font-medium text-slate-700 dark:text-slate-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {preview(c, meId)}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
