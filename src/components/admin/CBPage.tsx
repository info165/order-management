import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { UserProfile } from '../../types';

interface CBPageProps {
  currentUser: UserProfile;
  onBack: () => void;
}

// Reachable only at the /cb URL, typed directly - there is no link, button,
// or menu entry anywhere in the app that points here (aside from a
// deliberately plain, Super-Admin-only entry tucked into the 3-dots menu),
// and it is not part of the normal Navbar/section shell. Content to be
// added next.
export const CBPage: React.FC<CBPageProps> = ({ currentUser, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="p-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-sm font-mono text-slate-400">/cb</p>
          <p className="text-xs text-slate-500">Signed in as {currentUser.name}</p>
        </div>
      </div>
    </div>
  );
};
