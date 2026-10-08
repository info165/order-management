import type { CommissionPayment } from '../types';

export interface SchoolCommissionSummary {
  rows: CommissionPayment[];
  totalPaid: number;
  draftCount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// A real (non-draft) payment - the same rule TransactionDetailsPage uses for
// its per-school totals, so the two screens always agree.
const isPaid = (p: CommissionPayment) => p.status !== 'DRAFT';

// Every commission payment recorded for one school, newest first, with the
// total of the real ones. Drafts are counted separately and never added.
// Matched by schoolId, and by name as a fallback for older records that
// may carry a different id.
export function summarizeSchoolCommission(
  payments: CommissionPayment[],
  schoolId: string | undefined,
  schoolName: string | undefined
): SchoolCommissionSummary {
  const name = (schoolName || '').trim().toLowerCase();
  const mine = payments.filter(p =>
    (schoolId && p.schoolId === schoolId) ||
    (name && (p.schoolName || '').trim().toLowerCase() === name)
  );
  const rows = mine
    .filter(isPaid)
    .sort((a, b) => String(b.paymentDate || b.createdAt || '').localeCompare(String(a.paymentDate || a.createdAt || '')));
  return {
    rows,
    totalPaid: round2(rows.reduce((s, p) => s + (p.commissionAmount || 0), 0)),
    draftCount: mine.length - rows.length
  };
}
