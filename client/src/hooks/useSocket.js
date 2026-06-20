import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

/**
 * Reusable React Hook to consume the global SocketContext
 */
export function useSocket() {
  const socket = useContext(SocketContext);
  return socket;
}

export default useSocket;
