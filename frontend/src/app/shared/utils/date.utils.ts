/** Date helpers shared by entry/list/report features. */

export function isoToday(): string {
  const d = new Date();
  return formatIso(d);
}

export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatIso(d);
}

export function formatIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const EDIT_WINDOW_DAYS = 32;

export function isWithinEditWindow(workDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(workDate);
  if (Number.isNaN(target.getTime())) return false;
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= EDIT_WINDOW_DAYS;
}
