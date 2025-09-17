import { io } from 'socket.io-client';

// Use environment variable or fallback to localhost:8080
const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';
export const pollSocket = io(`${SERVER}/poll`, { autoConnect: false });
