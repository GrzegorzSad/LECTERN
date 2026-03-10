import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  if (!socketRef.current) {
    socketRef.current = io(SOCKET_URL, { withCredentials: true });
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}