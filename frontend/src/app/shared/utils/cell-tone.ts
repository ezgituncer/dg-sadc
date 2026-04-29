/** Color tone for a yearly-report cell — mirrors mockup's getCellTone exactly.
 *  target = workingDays * 8
 *  hours == 0     → red (no entries logged)
 *  ratio >  1.0   → green
 *  ratio == 1.0   → none
 *  ratio >= 0.5   → yellow
 *  ratio <  0.5   → red
 */
export type Tone = 'green' | 'yellow' | 'red' | 'none' | 'empty';

export interface ToneStyle {
  bg: string;
  text: string;
  border: string;
}

export function getCellTone(hours: number, workingDays: number): Tone {
  const target = workingDays * 8;
  if (target === 0) return 'none';
  if (hours === 0) return 'red';
  const ratio = hours / target;
  if (ratio > 1) return 'green';
  if (ratio === 1) return 'none';
  if (ratio >= 0.5) return 'yellow';
  return 'red';
}

export const TONE_STYLES: Record<Tone, ToneStyle> = {
  green:  { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  yellow: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  red:    { bg: 'rgba(239, 68, 68, 0.18)',  text: '#EF4444', border: 'rgba(239, 68, 68, 0.35)' },
  none:   { bg: 'transparent',               text: '#CBD5E1', border: 'transparent' },
  empty:  { bg: 'transparent',               text: '#475569', border: 'transparent' },
};

export const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const TR_MONTHS_FULL  = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
