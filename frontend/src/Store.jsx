import { pollSocket } from './socket';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const PollContext = createContext(null);

export function PollProvider({ children }) {
  const [state, setState] = useState(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const onState = (s) => setState(s);
    const onJoined = () => setJoined(true);
    const onKick = () => alert('You were removed by teacher.');
    pollSocket.on('state', onState);
    pollSocket.on('joined', onJoined);
    pollSocket.on('kicked', onKick);
    return () => {
      pollSocket.off('state', onState);
      pollSocket.off('joined', onJoined);
      pollSocket.off('kicked', onKick);
    };
  }, []);

  return (
    <PollContext.Provider value={{ state, setState, joined }}>
      {children}
    </PollContext.Provider>
  );
}
export const usePoll = () => useContext(PollContext);

export function useTabId() {
  const ref = useRef(sessionStorage.getItem('tabId'));
  if (!ref.current) {
    ref.current = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('tabId', ref.current);
  }
  return ref.current;
}
