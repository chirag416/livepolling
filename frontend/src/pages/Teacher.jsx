import React, { useMemo, useState } from 'react';
import { pollSocket } from '../socket';
import { usePoll } from '../Store';
import Countdown from '../components/Countdown';
import PollResults from '../components/PollResults';
import ChatWidget from '../components/ChatWidget';


export default function Teacher() {
  const { state } = usePoll();
  const [title, setTitle] = useState('My Class Poll');
  const [question, setQ] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [timeLimit, setTL] = useState(60);

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
  };

  const createPoll = () => pollSocket.emit('teacher:createPoll', { title });

  const showNow = () => pollSocket.emit('teacher:show');

  const kick = (id) => pollSocket.emit('teacher:kick', { studentId: id });

  if (!state) return null;

  return (
    <div className="container">
      <div className="header">
        <h2>{state.title}</h2>
        <div className="row">
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Poll title"/>
          <button className="btn ghost" onClick={createPoll}>Create / Reset</button>
        </div>
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
                <small style={{color:'var(--muted)'}}>You may ask a new question now.</small>
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
    </div>
  );
}
