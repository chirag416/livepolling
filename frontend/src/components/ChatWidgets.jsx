import React, { useEffect, useRef, useState } from 'react';
import { pollSocket } from '../socket';
import { useTabId } from '../Store';

export default function ChatWidget({ compact=false }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const tabId = useTabId();

  useEffect(() => {
    const onNew = (m) => setMsgs((x) => [...x, m]);
    const onState = (s) => s?.chat && setMsgs(s.chat);
    pollSocket.on('chat:new', onNew);
    pollSocket.on('state', onState);
    return () => {
      pollSocket.off('chat:new', onNew);
      pollSocket.off('state', onState);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [msgs, open]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    pollSocket.emit('chat:send', { text: text.trim() });
    setText('');
  };

  return (
    <>
      <button className="fab" onClick={() => setOpen(o=>!o)} title="Chat">💬</button>
      {open && (
        <div className="chat">
          <header>Chat</header>
          <div className="messages" ref={listRef}>
            {msgs.map(m => {
              const isMe = m.tabId === tabId;
              return (
                <div key={m.id} style={{
                  display: 'flex', 
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: '10px',
                  width: '100%'
                }}>
                  <div style={{
                    background: isMe ? '#FFF' : '#BBDBFF',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    maxWidth: '75%',
                    border: isMe ? '1px solid #eee' : 'none'
                  }}>
                    <b style={{color: isMe ? '#000' : '#000'}}>{m.name}:</b> {m.text}
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} style={{display:'flex',gap:8,padding:10}}>
            <input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message..." />
            <button className="btn" type="submit">Send</button>
          </form>
        </div>
      )}
    </>
  );
}
