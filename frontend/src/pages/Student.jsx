import React, { useMemo, useState } from 'react';
import { pollSocket } from '../socket';
import { usePoll, useRoomCode } from '../Store';
import Countdown from '../components/Countdown';
import PollResults from '../components/PollResults';
import ChatWidget from '../components/chatWidget';

export default function Student() {
  const { state } = usePoll();
  const { roomCode } = useRoomCode();
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const asking = state?.current && state.current.status === 'asking';
  const showing = state?.current && state.current.status === 'showing';

  const submit = () => {
    if (selected == null) return;
    pollSocket.emit('student:answer', { optionId: String(selected) });
    setSubmitted(true);
  };

  const canSubmit = useMemo(()=> asking && selected != null, [asking, selected]);

  // Reset submitted and selected state when a new question is asked
  React.useEffect(() => {
    if (state?.current && state.current.status === 'asking') {
      setSubmitted(false);
      setSelected(null);
    }
  }, [state?.current?.id, state?.current?.status]);

  if (!state) return null;

  return (
    <div className="container">
      {state.title && (
        <div className="header" style={{marginBottom:12}}>
          <h2 style={{margin:0}}>{state.title}</h2>
          {roomCode && <span className="badge" title="Room code">{roomCode}</span>}
        </div>
      )}
      {!state.current && (
        <div className="card" style={{textAlign:'center', padding:'48px'}}>
          <div style={{fontSize:32}}>🌀</div>
          <h3>Wait for the teacher to ask questions..</h3>
        </div>
      )}

      {asking && !submitted && (
        <div className="card stack">
          <div className="row" style={{justifyContent:'space-between'}}>
            <h3>Question {state.current.idx}</h3>
            <Countdown endsAt={state.current.endsAt} />
          </div>
          <h2>{state.current.question}</h2>
          <div className="stack">
            {state.current.options.map((o,i)=>(
              <div key={o.id} className={`option ${String(selected)===o.id ? 'selected':''}`} onClick={()=>setSelected(o.id)}>
                <input type="radio" checked={String(selected)===o.id} readOnly />
                {o.text}
              </div>
            ))}
          </div>
          <div className="row" style={{justifyContent:'flex-end'}}>
            <button className="btn" onClick={submit} disabled={!canSubmit}>Submit</button>
          </div>
        </div>
      )}

      {asking && submitted && (
        <div className="card stack waiting-card" style={{textAlign:'center', padding:'48px'}}>
          <div style={{fontSize:32}}>⏳</div>
          <h3>Waiting for results...</h3>
          <p className="muted">Your answer is submitted.<br/>Please wait for the teacher or other students to finish.</p>
        </div>
      )}

      {showing && (
        <div className="card stack">
          <div className="row" style={{justifyContent:'space-between'}}>
            <h3>Results</h3>
            <span className="badge">Live</span>
          </div>
          <h2>{state.current.question}</h2>
          <PollResults results={state.current.results}/>
        </div>
      )}

      <ChatWidget/>
    </div>
  );
}
