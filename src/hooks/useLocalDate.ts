// 로컬 타임존 기준 날짜 문자열 반환 (YYYY-MM-DD)
export function getLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 날짜 문자열을 로컬 Date 객체로 변환
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 한국어 날짜 포맷 ("오늘", "어제", "3일 전", "4월 1일 (화)")
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
export function formatDateKr(dateStr: string): string {
  const today = getLocalDate();
  if (dateStr === today) return '오늘';
  const yesterday = getLocalDate(new Date(Date.now() - 86400000));
  if (dateStr === yesterday) return '어제';

  const target = parseLocalDate(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - target.getTime()) / 86400000);

  if (diffDays > 0 && diffDays <= 7) return `${diffDays}일 전`;

  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = DAY_NAMES[target.getDay()];
  if (y === now.getFullYear()) return `${m}월 ${d}일 (${dayOfWeek})`;
  return `${y}.${m}.${d} (${dayOfWeek})`;
}
