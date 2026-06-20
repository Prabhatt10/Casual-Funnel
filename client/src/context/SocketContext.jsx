import React, { createContext, useEffect, useState } from 'react';
import socketInstance from '../services/socket';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    setSocket(socketInstance);

    // Make sure we connect on provider mount
    if (socketInstance.disconnected) {
      socketInstance.connect();
    }

    const onConnect = () => {
      console.log(`SocketContext: Socket connected. ID: ${socketInstance.id}`);
    };

    const onConnectError = (error) => {
      console.warn('SocketContext: Connection error:', error.message);
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('connect_error', onConnectError);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('connect_error', onConnectError);
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
