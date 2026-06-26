// Compact relative time: "now", "5m", "3h", "2d", or a date.
export function timeAgo(input) {
  if (!input) return '';
  const d = new Date(input);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 45) return 'now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Clock time for message bubbles.
export function clockTime(input) {
  if (!input) return '';
  return new Date(input).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// 1234 -> "1.2k".
export function formatCount(n = 0) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}
