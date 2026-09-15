import React from 'react';
import { UserProfile } from '../../types';

interface CBPageProps {
  currentUser: UserProfile;
}

// Reachable only at the /cb URL, typed directly - there is no link, button,
// or menu entry anywhere in the app that points here, and it is not part of
// the normal Navbar/section shell. Content to be added next.
export const CBPage: React.FC<CBPageProps> = ({ currentUser }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <p className="text-sm font-mono text-slate-400">/cb</p>
        <p className="text-xs text-slate-500">Signed in as {currentUser.name}</p>
      </div>
    </div>
  );
};
