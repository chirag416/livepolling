import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pollSocket } from '../socket';
import { usePoll, useRoomCode } from '../Store';
import Countdown from '../components/Countdown';
import PollResults from '../components/PollResults';
import ChatWidget from '../components/chatWidget';


export default function Teacher() {
  const { state } = usePoll();
  const [title, setTitle] = useState('');
  const [dirty, setDirty] = useState(false);
  const saveTimeout = useRef(null);
  const [question, setQ] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [timeLimit, setTL] = useState(60);
  const { roomCode } = useRoomCode();
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  const copyRoom = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode)
      .then(() => {
        setShowCopyNotification(true);
        setTimeout(() => setShowCopyNotification(false), 1500);
      })
      .catch(()=>{});
  };

  const canAsk = useMemo(() => {
    if (!state) return false;
    if (!state.current) return true;
    return state.current.status === 'showing';
  }, [state]);

  const ask = () => {
    const options = opts.map(s => s.trim()).filter(Boolean);
    if (!question.trim() || options.length < 2) return alert('Provide a question and at least 2 options.');
    pollSocket.emit('teacher:ask', { question: question.trim(), options, timeLimit });
    setQ('');
    setOpts(['', '', '', '']);
  };

  const createPoll = () => pollSocket.emit('teacher:createPoll', { title: title.trim() });

  // Initialize / sync title from state.title when arrives (unless local editing in progress)
  useEffect(() => {
    if (state?.title && !dirty) {
      setTitle(state.title);
    }
  }, [state?.title, dirty]);

  const requestSave = () => {
    const t = title.trim();
    if (!t) return; // don't save empty
    pollSocket.emit('teacher:updateTitle', { title: t });
    setDirty(false);
  };

  // Debounced auto-save after typing stops (1.2s)
  useEffect(() => {
    if (!dirty) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => requestSave(), 1200);
    return () => saveTimeout.current && clearTimeout(saveTimeout.current);
  }, [title, dirty]);

  const showNow = () => pollSocket.emit('teacher:show');

  const kick = (id) => pollSocket.emit('teacher:kick', { studentId: id });

  if (!state) return null;

  return (
    <div className="container">
      <div className="header" style={{flexWrap:'wrap', gap:16}}>
        <h2 style={{margin:0}}>{state.title}</h2>
        {state.current && state.current.status==='showing' && (
          <div className="highlight" style={{background:'var(--primary-2)',color:'#fff',padding:'8px 16px',borderRadius:'12px',marginBottom:'8px',fontWeight:600}}>
            You may ask a new question now.
          </div>
        )}
        <div className="row" style={{flexWrap:'wrap', gap:8}}>
          <input className="input" value={title} onChange={e=>{setTitle(e.target.value); setDirty(true);}} placeholder="Poll title (e.g. Algebra Quiz)"/>
          <button className="btn ghost" onClick={createPoll} title="Start a new poll and clear previous questions/results">Start New Poll</button>
          {dirty && <span style={{fontSize:12,color:'var(--muted)'}}>Saving…</span>}
          {!dirty && state.title && <span style={{fontSize:12,color:'var(--muted)'}}>Saved</span>}
        </div>
        {roomCode && (
          <div className="row" style={{gap:6}}>
            <span className="badge" style={{background:'var(--primary-2)'}}>Room: {roomCode}</span>
            <button className="btn" style={{padding:'6px 10px'}} onClick={copyRoom} title="Copy room code">Copy</button>
          </div>
        )}
      </div>

      <div className="row" style={{alignItems:'flex-start'}}>
        <div className="card" style={{flex:2}}>
          <div className="stack">
            <div className="row" style={{justifyContent:'space-between'}}>
              <h3>Question</h3>
              {state.current?.status==='asking' && <Countdown endsAt={state.current.endsAt} />}
            </div>

            {(!state.current || state.current.status==='showing') && (
              <>
                <input className="input" placeholder="Type a question..." value={question} onChange={e=>setQ(e.target.value)} />
                {opts.map((o, i)=>(
                  <input key={i} className="input" placeholder={`Option ${i+1}`} value={o} onChange={e=>{
                    const arr=[...opts]; arr[i]=e.target.value; setOpts(arr);
                  }}/>
                ))}
                <div className="row">
                  <input className="input" style={{maxWidth:160}} type="number" min="5" max="600" value={timeLimit} onChange={e=>setTL(e.target.value)} />
                  <span>seconds</span>
                  <button className="btn" onClick={ask} disabled={!canAsk}>Ask</button>
                </div>
              </>
            )}

            {state.current && state.current.status==='asking' && (
              <div className="stack">
                <div className="badge">Live — waiting for answers</div>
                <button className="btn secondary" onClick={showNow}>Show results now</button>
              </div>
            )}

            {state.current && state.current.status==='showing' && (
              <>
                <h4>{state.current.question}</h4>
                <PollResults results={state.current.results} />
                
              </>
            )}
          </div>
        </div>

        <div className="card" style={{flex:1}}>
          <h3>Participants</h3>
          <div className="list">
            {state.students.map(s=>(
              <div className="item" key={s.id}>
                <span>{s.name}{s.kicked ? ' (removed)':''}</span>
                {!s.kicked && <span className="kick" onClick={()=>kick(s.id)}>kick</span>}
              </div>
            ))}
          </div>
          <div style={{marginTop:12}}>
            <div><b>Active:</b> {state.students.filter(s=>!s.kicked).length}</div>
          </div>
          <h4 style={{marginTop:16}}>History</h4>
          <div className="list">
            {state.history.map(h=>(
              <div className="item" key={h.id}>
                <span>Q{h.idx}: {h.question}</span>
                <span>{h.results.reduce((a,b)=>a+b.count,0)} votes</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ChatWidget />
      {showCopyNotification && (
        <div className="copy-notification">Code Copied!</div>
      )}
    </div>
  );
}
