import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { getAuthToken, refreshAccessToken, API_URL } from '../lib/api';

const SocketContext = createContext(null);

// Socket.IO lives at the server root, not under /api. In production behind a
// Vercel /api proxy, set VITE_SOCKET_URL to the backend's public origin so the
// realtime connection goes straight to it; locally it's derived from the API URL.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '');

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: getAuthToken() },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // If the token expired, refresh once and reconnect with the new one.
    let recovering = false;
    socket.on('connect_error', async () => {
      if (recovering) return;
      recovering = true;
      try {
        const token = await refreshAccessToken();
        socket.auth = { token };
        socket.connect();
      } catch {
        /* AuthContext will handle logout via the api interceptor */
      } finally {
        recovering = false;
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
