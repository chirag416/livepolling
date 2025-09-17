import React, { useState, useMemo } from 'react';
import { pollSocket } from '../socket';
import { useTabId } from '../Store';
import './Landing.css';

export default function Landing({ onRole }) {
  const [roomCode, setRoom] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const tabId = useTabId();

  const canJoin = useMemo(() => {
    if (!roomCode || !role) return false;
    if (role === 'student' && !name.trim()) return false;
    return true;
  }, [roomCode, role, name]);

  const join = () => {
    pollSocket.connect();
    pollSocket.emit('join', { roomCode, role, name, tabId });
  try { sessionStorage.setItem('roomCode', roomCode); } catch {}
    onRole(role);
  };

  return (
    <div className="container landing-shell">
      <div className="card landing-card stack" role="form" aria-labelledby="lp-title">
        <div className="header landing-header">
          <h2 id="lp-title" className="landing-title">Live Polling</h2>
          <span className="badge" aria-hidden="true">Room</span>
        </div>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="roomCode">Room code <span className="req" aria-hidden="true">*</span></label>
            <input id="roomCode" className="input" placeholder="e.g. math101" value={roomCode} onChange={e=>setRoom(e.target.value)} aria-required="true" />
          </div>
          <div className="field">
            <label htmlFor="roleSelect">Role <span className="req" aria-hidden="true">*</span></label>
            <select id="roleSelect" className="select" value={role} onChange={e=>setRole(e.target.value)} aria-required="true">
              <option value="" disabled hidden>Select role</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          {role === 'student' && (
            <div className="field">
              <label htmlFor="displayName">Name <span className="req" aria-hidden="true">*</span></label>
              <input id="displayName" className="input" placeholder="Your display name" value={name} onChange={e=>setName(e.target.value)} aria-required="true" />
            </div>
          )}
        </div>

        <button className="btn primary wide" onClick={join} disabled={!canJoin} aria-disabled={!canJoin}>
          Enter
        </button>
        <div className="helper-text" aria-live="polite">
          {!canJoin && (<span>Fill required fields to continue.</span>)}
          {canJoin && (<span>Ready to join.</span>)}
        </div>
        <small className="foot-note">Names are unique per tab (session only).</small>
      </div>
    </div>
  );
}
