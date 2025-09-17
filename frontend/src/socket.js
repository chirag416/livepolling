import { io } from 'socket.io-client';

// set REACT_APP_SERVER_URL or fallback to localhost:8080
const SERVER = 'https://livepolling-3a4s.onrender.com' || 'http://localhost:8080';
export const pollSocket = io(`${SERVER}/poll`, { autoConnect: false });
