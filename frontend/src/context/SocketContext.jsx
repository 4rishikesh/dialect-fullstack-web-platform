import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; setSocket(null); }
      setConnected(false);
      return;
    }
    const token = localStorage.getItem('dialect_token');
    const s = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
      timeout: 10000,
    });
    s.on('connect', () => { setConnected(true); });
    s.on('disconnect', () => { setConnected(false); });
    s.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
    socketRef.current = s;
    setSocket(s);
    return () => { s.removeAllListeners(); s.disconnect(); socketRef.current = null; setSocket(null); setConnected(false); };
  }, [user]);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) socketRef.current.emit(event, data);
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
