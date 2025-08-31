import React, { useState } from 'react';
import Landing from './pages/Landing';
import Teacher from './pages/Teacher';
import Student from './pages/Student';
import { PollProvider } from './Store';

export default function App() {
  const [role, setRole] = useState(null);

  return (
    <PollProvider>
      {!role && <Landing onRole={setRole} />}
      {role==='teacher' && <Teacher />}
      {role==='student' && <Student />}
    </PollProvider>
  );
}
