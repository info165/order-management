import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { School, UserProfile } from '../../types';
import { subscribeToRealtimeSchools } from '../../services/dataService';

interface CBPageProps {
  currentUser: UserProfile;
  onBack: () => void;
}

// Reachable only at the /cb URL, typed directly - there is no link, button,
// or menu entry anywhere in the app that points here (aside from a
// deliberately plain, Super-Admin-only entry tucked into the 3-dots menu),
// and it is not part of the normal Navbar/section shell. More content to be
// added next.
export const CBPage: React.FC<CBPageProps> = ({ currentUser, onBack }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  // Same live Firestore subscription the School Registry page uses, so this
  // dropdown is never a stale snapshot - a school added, renamed, or removed
  // anywhere in the app shows up here immediately, with no refresh needed.
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSchools((data) => {
      setSchools(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sortedSchools = [...schools].sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  const selectedSchool = schools.find(s => s.schoolId === selectedSchoolId) || null;

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
      <div className="flex-1 flex items-start justify-center p-6 pt-16">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-mono text-slate-500">/cb</p>
            <p className="text-xs text-slate-500">Signed in as {currentUser.name}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Which school do you want to select?</span>
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              <option value="">{loading ? 'Loading schools…' : `Select a school... (${schools.length})`}</option>
              {sortedSchools.map((s) => (
                <option key={s.schoolId} value={s.schoolId}>
                  {s.schoolName}{s.state ? ` — ${s.state}` : ''}
                </option>
              ))}
            </select>

            {selectedSchool && (
              <div className="mt-1 p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-300 space-y-0.5">
                <div><span className="text-slate-500">School ID:</span> {selectedSchool.schoolId}</div>
                <div><span className="text-slate-500">Type:</span> {selectedSchool.schoolType}</div>
                {selectedSchool.state && <div><span className="text-slate-500">State:</span> {selectedSchool.state}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
