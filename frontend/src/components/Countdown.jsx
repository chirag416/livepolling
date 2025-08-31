import React, { useEffect, useState } from 'react';

export default function Countdown({ endsAt }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now())/1000)));
  useEffect(() => {
    const t = setInterval(() => {
      setLeft(Math.max(0, Math.ceil((endsAt - Date.now())/1000)));
    }, 250);
    return () => clearInterval(t);
  }, [endsAt]);
  return (
    <div className="timer">
      <span className="badge">⏳ {left}s</span>
    </div>
  );
}
