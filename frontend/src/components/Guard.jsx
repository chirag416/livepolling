import React from 'react';
import { usePoll } from '../Store';

export default function Guard({ children }) {
  const { state } = usePoll();
  if (!state) return null;
  return children;
}
