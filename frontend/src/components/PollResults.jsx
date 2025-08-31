import React from 'react';

export default function PollResults({ results }) {
  return (
    <div className="stack">
      {results.map(r => (
        <div key={r.optionId} className="stack">
          <div className="row" style={{justifyContent:'space-between'}}>
            <div>{r.text}</div>
            <div><b>{r.count}</b> / {r.total} — {r.pct}%</div>
          </div>
          <div className="progress"><div style={{width:`${r.pct}%`}}/></div>
        </div>
      ))}
    </div>
  );
}
