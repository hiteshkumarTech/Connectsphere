import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent';
import ConversationList from '../components/chat/ConversationList.jsx';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import NewChatModal from '../components/chat/NewChatModal.jsx';

const sid = (v) => String(v?._id || v || '');

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meId = user?.id;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const fetchConversations = useCallback(() => {
    api
      .get('/chat/conversations')
      .then(({ data }) => setConversations(data.data.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const active = conversations.find((c) => c._id === conversationId) || null;

  // Opening a conversation clears its unread badge locally.
  useEffect(() => {
    if (!conversationId) return;
    setConversations((prev) =>
      prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, [conversationId]);

  // --- real-time list updates ---
  useSocketEvent('message:new', ({ conversationId: cid, message }) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === cid);
      if (idx === -1) {
        fetchConversations(); // a thread we don't have yet — pull it in
        return prev;
      }
      const fromMe = sid(message.sender) === sid(meId);
      const isActive = cid === conversationId;
      const updated = {
        ...prev[idx],
        lastMessage: message,
        lastMessageAt: message.createdAt,
        unreadCount: isActive ? 0 : (prev[idx].unreadCount || 0) + (fromMe ? 0 : 1),
      };
      return [updated, ...prev.filter((_, i) => i !== idx)];
    });
  });

  useSocketEvent('conversation:new', ({ conversation }) => {
    setConversations((prev) =>
      prev.some((c) => c._id === conversation._id) ? prev : [conversation, ...prev]
    );
  });

  useSocketEvent('presence:update', ({ userId, online }) => {
    setConversations((prev) =>
      prev.map((c) =>
        !c.isGroup && sid(c.otherUser) === sid(userId) ? { ...c, online } : c
      )
    );
  });

  const select = (c) => navigate(`/messages/${c._id}`);

  const onCreated = (conversation) => {
    setConversations((prev) =>
      prev.some((c) => c._id === conversation._id) ? prev : [conversation, ...prev]
    );
    setShowNew(false);
    navigate(`/messages/${conversation._id}`);
  };

  const onActivity = useCallback((cid, message) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === cid);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], lastMessage: message, lastMessageAt: message.createdAt };
      return [updated, ...prev.filter((_, i) => i !== idx)];
    });
  }, []);

  const onRead = useCallback((cid) => {
    setConversations((prev) => prev.map((c) => (c._id === cid ? { ...c, unreadCount: 0 } : c)));
  }, []);

  return (
    <div className="flex h-[calc(100dvh-108px)] lg:h-[100dvh]">
      {/* List pane */}
      <div
        className={`${
          conversationId ? 'hidden lg:flex' : 'flex'
        } w-full flex-col border-r border-slate-200 dark:border-slate-800 lg:w-80 xl:w-96`}
      >
        <ConversationList
          conversations={conversations}
          activeId={conversationId}
          onSelect={select}
          onNewChat={() => setShowNew(true)}
          loading={loading}
          meId={meId}
        />
      </div>

      {/* Window pane */}
      <div className={`${conversationId ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col`}>
        {conversationId ? (
          <ChatWindow
            key={conversationId}
            conversation={active}
            conversationId={conversationId}
            meId={meId}
            onActivity={onActivity}
            onRead={onRead}
            onBack={() => navigate('/messages')}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-400">
            <MessageCircle size={36} className="mb-3 opacity-60" />
            <p className="text-sm">Select a conversation, or start a new one.</p>
          </div>
        )}
      </div>

      <NewChatModal open={showNew} onClose={() => setShowNew(false)} onCreated={onCreated} />
    </div>
  );
}
