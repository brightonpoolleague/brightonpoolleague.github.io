/**
 * Formats PostgreSQL interval text (e.g. "8 days 20:14:32.342234" or "04:12:00")
 * into a clean, human-readable duration (e.g. "8 days, 20h 14m" or "4h 12m").
 */
export function formatUptimeDuration(raw?: string): string {
  if (!raw || raw === 'Online' || raw === 'Unknown') return raw || 'Online';

  const match = raw.trim().match(
    /^(?:(\d+)\s+days?[\s,]*)?(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.\d+)?$/i
  );

  if (match) {
    const days = match[1] ? parseInt(match[1], 10) : 0;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    else if (days === 0 && hours === 0) parts.push('< 1m');

    if (parts.length > 0) {
      if (days > 0 && (hours > 0 || minutes > 0)) {
        return `${parts[0]}, ${parts.slice(1).join(' ')}`;
      }
      return parts.join(' ');
    }
  }

  return raw.replace(/\.\d+.*$/, '');
}
