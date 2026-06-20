import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:5000';

// Initialize the single Socket.io client instance
// Configure automatic reconnect options and polling fallbacks
export const socket = io(SOCKET_SERVER_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

// Helper listeners for debugging connection cycles
socket.on('disconnect', (reason) => {
  console.warn(`Websocket client disconnected. Reason: ${reason}`);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`Socket reconnection attempt #${attemptNumber}`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Socket successfully reconnected after ${attemptNumber} attempts.`);
});

export default socket;
