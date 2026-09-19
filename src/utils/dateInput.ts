// Helpers for <input type="date">, which only understands YYYY-MM-DD.

// Today's date in the user's own timezone. (new Date().toISOString() is UTC,
// which shows yesterday's date for anyone in India before ~5:30 AM.)
export function todayLocalISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function validISO(y: number, m: number, d: number): string {
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Turns a stored date into YYYY-MM-DD for a date box. Older orders were
// imported with dates like "13-08-2026", "22-8-2026" or "29/07/26"
// (day first), which a date box can't display - it would show blank.
// Returns '' when the value isn't a single recognisable date.
export function toDateInputValue(raw?: string | null): string {
  if (!raw) return '';
  const s = String(raw).trim();

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (iso) return validISO(+iso[1], +iso[2], +iso[3]);

  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + +dmy[3] : +dmy[3];
    return validISO(year, +dmy[2], +dmy[1]);
  }
  return '';
}
