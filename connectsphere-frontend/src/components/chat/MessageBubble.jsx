import { clockTime } from '../../lib/format';
import Avatar from '../ui/Avatar.jsx';

export default function MessageBubble({ message, mine, showAvatar, showName }) {
  const sender = message.sender || {};
  const reply = message.replyTo;

  return (
    <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
      {!mine && (
        <div className="w-7 shrink-0">
          {showAvatar && <Avatar src={sender.avatar} name={sender.name} size="xs" />}
        </div>
      )}

      <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {showName && !mine && (
          <span className="mb-0.5 px-1 text-xs font-medium text-slate-400">{sender.name}</span>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
            mine
              ? 'rounded-br-md bg-brand-600 text-white'
              : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
          }`}
        >
          {message.deleted ? (
            <span className={`italic ${mine ? 'text-white/70' : 'text-slate-400'}`}>
              This message was deleted
            </span>
          ) : (
            <>
              {reply && (
                <div
                  className={`mb-1.5 border-l-2 pl-2 text-xs ${
                    mine ? 'border-white/40 text-white/80' : 'border-brand-400 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="font-semibold">{reply.sender?.name || 'Reply'}</span>
                  <p className="line-clamp-2">{reply.deleted ? 'Deleted message' : reply.content}</p>
                </div>
              )}
              {message.attachments?.length > 0 && (
                <div className={`grid gap-1 ${message.attachments.length > 1 ? 'grid-cols-2' : ''} ${message.content ? 'mb-1.5' : ''}`}>
                  {message.attachments.map((a, i) => (
                    <img
                      key={i}
                      src={a.url}
                      alt=""
                      className="max-h-60 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
            </>
          )}
        </div>
        <span className="mt-0.5 px-1 text-[11px] text-slate-400">
          {clockTime(message.createdAt)}
          {message.editedAt && !message.deleted ? ' · edited' : ''}
        </span>
      </div>
    </div>
  );
}
