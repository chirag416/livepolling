import { uid } from 'uid';

export default function registerPollNamespace(nsp) {
  // In-memory store (ephemeral)
  /** @type {Record<string, PollRoom>} */
  const rooms = {};

  nsp.on('connection', (socket) => {
    // client sends {roomCode, role:'teacher'|'student', name?}
    socket.on('join', ({ roomCode, role, name, tabId }) => {
      if (!roomCode || !role) return;
      socket.data.role = role;
      socket.data.roomCode = roomCode;
      socket.data.tabId = tabId;
      socket.join(roomCode);

      // Ensure room
      if (!rooms[roomCode]) {
        rooms[roomCode] = makeRoom(roomCode);
      }
      const room = rooms[roomCode];

      if (role === 'teacher') {
        room.teacherIds.add(socket.id);
        emitState(roomCode);
      } else {
        const studentId = socket.id;
        room.students.set(studentId, {
          id: studentId,
          name: name || `User-${uid(4)}`,
          tabId,
          kicked: false
        });
        emitState(roomCode);
      }

      socket.emit('joined', { ok: true, roomCode, state: publicState(rooms[roomCode]) });
    });

    // Teacher creates new poll (resets history)
    socket.on('teacher:createPoll', ({ title }) => {
      const room = getRoomFromSocket(socket, nsp, rooms);
      if (!room || !isTeacher(socket, room)) return;
      room.title = title || 'Untitled Poll';
      room.history = [];
      room.current = null;
      emitState(room.code);
    });

    // Teacher asks question only if A) none exists, or B) previous finished
    socket.on('teacher:ask', ({ question, options, timeLimit = 60 }) => {
      const room = getRoomFromSocket(socket, nsp, rooms);
      if (!room || !isTeacher(socket, room)) return;

      if (room.current && room.current.status !== 'showing') {
        socket.emit('error_msg', 'Cannot ask a new question until previous is completed.');
        return;
      }

      const q = {
        id: uid(8),
        idx: (room.history?.length || 0) + 1,
        question,
        options: options.map((t, i) => ({ id: String(i), text: t })),
        answers: {}, // studentId -> optionId
        createdAt: Date.now(),
        timeLimit: Math.max(5, Math.min(600, Number(timeLimit) || 60)),
        status: 'asking',
        resultsVisible: false
      };
      room.current = q;
      startTimer(nsp, room, q);
      emitState(room.code);
    });

    // Student submits
    socket.on('student:answer', ({ optionId }) => {
      const room = getRoomFromSocket(socket, nsp, rooms);
      if (!room) return;
      const student = room.students.get(socket.id);
      if (!student || student.kicked) return;
      const q = room.current;
      if (!q || q.status !== 'asking') return;
      // lock per student
      if (q.answers[socket.id]) return;
      q.answers[socket.id] = optionId;
      emitState(room.code);
      // Auto-finish if all active students answered
      if (allAnswered(room)) {
        completeQuestion(room);
        emitState(room.code);
      }
    });

    // Teacher shows results early
    socket.on('teacher:show', () => {
      const room = getRoomFromSocket(socket, nsp, rooms);
      if (!room || !isTeacher(socket, room)) return;
      if (room.current && room.current.status === 'asking') {
        completeQuestion(room);
        emitState(room.code);
      }
    });

    // Teacher kick student
    socket.on('teacher:kick', ({ studentId }) => {
      const room = getRoomFromSocket(socket, nsp, rooms);
      if (!room || !isTeacher(socket, room)) return;
      const student = room.students.get(studentId);
      if (student) {
        student.kicked = true;
        // remove their answer if any
        if (room.current) delete room.current.answers[studentId];
        nsp.to(studentId).emit('kicked');
        emitState(room.code);
      }
    });

    // Optional chat
    socket.on('chat:send', ({ text }) => {
      const room = getRoomFromSocket(socket, nsp, rooms);
      if (!room || !text) return;
      const by = socket.data.role === 'teacher' ? 'teacher' : 'student';
      const name = by === 'teacher' ? 'Teacher' : (room.students.get(socket.id)?.name || 'Student');
      const msg = { id: uid(6), by, name, text, ts: Date.now() };
      room.chat.push(msg);
      nsp.to(room.code).emit('chat:new', msg);
    });

    socket.on('disconnect', () => {
      const { roomCode } = socket.data || {};
      if (!roomCode || !rooms[roomCode]) return;
      const room = rooms[roomCode];
      room.teacherIds.delete(socket.id);
      room.students.delete(socket.id);
      emitState(room.code);
    });
  });

  function makeRoom(code) {
    return {
      code,
      title: 'Untitled Poll',
      teacherIds: new Set(),
      students: new Map(),
      current: null,
      history: [],
      chat: []
    };
  }

  function emitState(code) {
    const room = rooms[code];
    if (!room) return;
    nsp.to(code).emit('state', publicState(room));
  }

  function publicState(room) {
    const activeStudentCount = [...room.students.values()].filter(s => !s.kicked).length;
    const current = room.current ? {
      id: room.current.id,
      idx: room.current.idx,
      question: room.current.question,
      options: room.current.options,
      status: room.current.status,
      endsAt: room.current.endsAt,
      timeLimit: room.current.timeLimit,
      // results only if showing
      results: room.current.status === 'showing' ? computeResults(room) : null
    } : null;

    return {
      code: room.code,
      title: room.title,
      students: [...room.students.values()].map(s => ({ id: s.id, name: s.name, kicked: s.kicked })),
      current,
      history: room.history.map(h => ({
        id: h.id, idx: h.idx, question: h.question,
        options: h.options, results: h.results
      })),
      chat: room.chat.slice(-50),
      activeStudentCount
    };
  }

  function startTimer(nsp, room, q) {
    q.endsAt = Date.now() + q.timeLimit * 1000;
    if (q._timer) clearTimeout(q._timer);
    q._timer = setTimeout(() => {
      // if still asking, finish
      if (room.current && room.current.id === q.id && room.current.status === 'asking') {
        completeQuestion(room);
        emitState(room.code);
      }
    }, q.timeLimit * 1000 + 100); // tiny buffer
  }

  function completeQuestion(room) {
    if (!room.current) return;
    const q = room.current;
    q.status = 'showing';
    const results = computeResults(room);
    room.history.push({
      id: q.id, idx: q.idx, question: q.question, options: q.options, results
    });
    // allow next question; keep current as showing for UI; teacher can ask new
  }

  function computeResults(room) {
    const q = room.current;
    const activeIds = [...room.students.values()].filter(s => !s.kicked).map(s => s.id);
    const total = activeIds.length;
    const counts = {};
    q.options.forEach(o => counts[o.id] = 0);
    Object.entries(q.answers).forEach(([sid, oid]) => {
      if (activeIds.includes(sid) && counts[oid] !== undefined) counts[oid]++;
    });
    const withPct = q.options.map(o => ({
      optionId: o.id,
      text: o.text,
      count: counts[o.id] || 0,
      total,
      pct: total ? Math.round(((counts[o.id] || 0) / total) * 100) : 0
    }));
    return withPct;
  }

  function allAnswered(room) {
    const activeIds = [...room.students.values()].filter(s => !s.kicked).map(s => s.id);
    return activeIds.length > 0 && activeIds.every(id => room.current.answers[id]);
  }

  function getRoomFromSocket(socket, nsp, rooms) {
    const code = socket.data?.roomCode;
    return code ? rooms[code] : null;
  }
  function isTeacher(socket, room) {
    return room.teacherIds.has(socket.id);
  }
}
