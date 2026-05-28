'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../lib/socket';

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const activeSocket = socketService.connect();
    setSocket(activeSocket);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    activeSocket.on('connect', onConnect);
    activeSocket.on('disconnect', onDisconnect);

    // Initial check since it might connect before listeners attach
    if (activeSocket.connected) {
      setIsConnected(true);
    }

    return () => {
      activeSocket.off('connect', onConnect);
      activeSocket.off('disconnect', onDisconnect);
      socketService.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketProvider;
