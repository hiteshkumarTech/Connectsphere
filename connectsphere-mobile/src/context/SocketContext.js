import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api, { API_URL, tokenStore } from '../api/client';
import { playChime } from '../utils/chime';

// Socket connects to the base server (not the /api path).
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

const SocketContext = createContext(null);
const ChatNotifContext = createContext(null);

export const useSocket = () => useContext(SocketContext);
export const useChatNotifications = () => useContext(ChatNotifContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const ref = useRef(null);

  // Global chat-unread state.
  const unreadSet = useRef(new Set()); // conversationIds with unread messages
  const activeConvRef = useRef(null); // conversation currently being viewed
  const [unreadCount, setUnreadCount] = useState(0);
  const [pulse, setPulse] = useState(0); // bump this to trigger the icon glow
  const myId = user?._id || user?.id;

  const markConversationRead = useCallback((cid) => {
    if (!cid) return;
    if (unreadSet.current.delete(String(cid))) setUnreadCount(unreadSet.current.size);
  }, []);

  const setActiveConversation = useCallback(
    (cid) => {
      activeConvRef.current = cid ? String(cid) : null;
      if (cid) markConversationRead(cid);
    },
    [markConversationRead]
  );

  // Reset + seed unread whenever the logged-in user changes.
  useEffect(() => {
    unreadSet.current = new Set();
    activeConvRef.current = null;
    setUnreadCount(0);
    setPulse(0);
    if (!user) return undefined;

    let active = true;
    api
      .get('/chat/conversations', { params: { limit: 50 } })
      .then((r) => {
        if (!active) return;
        const convos = r.data?.data?.conversations || [];
        const set = new Set();
        convos.forEach((c) => {
          if ((c.unreadCount || 0) > 0) set.add(String(c._id));
        });
        unreadSet.current = set;
        setUnreadCount(set.size);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  // Socket lifecycle + global new-message listener.
  useEffect(() => {
    let active = true;
    if (!user) return undefined;

    (async () => {
      const { accessToken } = await tokenStore.get();
      if (!accessToken || !active) return;
      const sock = io(SERVER_URL, {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnection: true,
      });

      // Global listener: badge any conversation that isn't the one being viewed.
      sock.on('message:new', ({ conversationId, message }) => {
        const senderId = message?.sender?._id || message?.sender;
        if (senderId && String(senderId) === String(myId)) return; // ignore my own messages
        const cid = String(conversationId);
        if (activeConvRef.current === cid) return; // already viewing this chat
        if (!unreadSet.current.has(cid)) {
          unreadSet.current.add(cid);
          setUnreadCount(unreadSet.current.size);
        }
        setPulse((p) => p + 1); // glow even if this chat was already unread
        playChime(); // notification sound for a new message elsewhere
      });

      ref.current = sock;
      setSocket(sock);
    })();

    return () => {
      active = false;
      if (ref.current) {
        ref.current.removeAllListeners();
        ref.current.disconnect();
        ref.current = null;
      }
      setSocket(null);
    };
  }, [user, myId]);

  return (
    <SocketContext.Provider value={socket}>
      <ChatNotifContext.Provider value={{ unreadCount, pulse, markConversationRead, setActiveConversation }}>
        {children}
      </ChatNotifContext.Provider>
    </SocketContext.Provider>
  );
}
