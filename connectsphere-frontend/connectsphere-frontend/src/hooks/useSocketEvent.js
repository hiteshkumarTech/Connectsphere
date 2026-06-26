import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

// Subscribes to a socket event with an always-fresh handler and clean teardown.
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const saved = useRef(handler);
  saved.current = handler;

  useEffect(() => {
    if (!socket || !event) return undefined;
    const listener = (...args) => saved.current?.(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
