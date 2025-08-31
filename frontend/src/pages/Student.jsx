import React, { useMemo, useState } from 'react';
import { pollSocket } from '../socket';
import { usePoll } from '../Store';
import Countdown from '../components/Countdown';
import PollResults from '../components/PollResults';
import ChatWidget from '../components/ChatWidget';

export default function Student() {
  const { state } = usePoll();
  const [selected, setSelected] = useState(null);

  const asking = state?.current && state.current.status === 'asking';
  const showing = state?.current && state.current.status === 'showing';

  const submit = () => {
    if (selected == null) return;
    pollSocket.emit('student:answer', { optionId: String(selected) });
  };

  const canSubmit = useMemo(()=> asking && selected != null, [asking, selected]);

  if (!state) return null;

  return (
    <div className="container">
      {!state.current && (
        <div className="card" style={{textAlign:'center', padding:'48px'}}>
          <div style={{fontSize:32}}>🌀</div>
          <h3>Wait for the teacher to ask questions..</h3>
        </div>
      )}

      {asking && (
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
