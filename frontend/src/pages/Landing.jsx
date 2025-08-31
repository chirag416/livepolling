import React, { useState } from 'react';
import { pollSocket } from '../socket';
import { useTabId } from '../Store';

export default function Landing({ onRole }) {
  const [roomCode, setRoom] = useState('demo');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const tabId = useTabId();

  const join = () => {
    pollSocket.connect();
    pollSocket.emit('join', { roomCode, role, name, tabId });
    onRole(role);
  };

  return (
    <div className="container">
      <div className="card stack">
        <div className="header">
          <h2>Live Polling</h2>
          <span className="badge">Room</span>
        </div>
        <div className="row wrap">
          <input className="input" style={{flex:1}} placeholder="Room code" value={roomCode} onChange={e=>setRoom(e.target.value)} />
          <select className="select" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>

        {role==='student' && (
          <input className="input" placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)} />
        )}

        <button className="btn" onClick={join}>Enter</button>
        <small style={{color:'var(--muted)'}}>Names are unique per tab (session only).</small>
      </div>
    </div>
  );
}
