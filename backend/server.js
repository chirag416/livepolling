import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import registerPollNamespace from './sockets/poll.js';

const app = express();
app.use(cors());
app.get('/', (_req, res) => res.json({ ok: true, service: 'live-polling' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// Namespace for polls (multi-room capable)
registerPollNamespace(io.of('/poll'));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
