// Shared TradingView-style timezone list + live (DST-aware) offset helpers.
// Used by both the TopBar picker and the StatusBar clock so they stay in sync.
// Values are IANA zone names; 'local' = browser zone, 'UTC' = exchange/UTC.

export const TZ_ZONES: string[] = [
  'local', 'UTC',
  'Pacific/Midway', 'Pacific/Honolulu', 'America/Anchorage',
  'America/Los_Angeles', 'America/Vancouver', 'America/Tijuana',
  'America/Phoenix', 'America/Denver',
  'America/Chicago', 'America/Mexico_City',
  'America/New_York', 'America/Toronto', 'America/Bogota', 'America/Lima',
  'America/Caracas', 'America/Santiago',
  'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
  'Atlantic/Azores',
  'Europe/London', 'Africa/Casablanca', 'Atlantic/Reykjavik',
  'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Europe/Lisbon', 'Africa/Lagos',
  'Europe/Athens', 'Europe/Bucharest', 'Africa/Cairo', 'Africa/Johannesburg',
  'Europe/Moscow', 'Asia/Riyadh', 'Asia/Qatar',
  'Asia/Tehran', 'Asia/Dubai',
  'Asia/Karachi', 'Asia/Tashkent', 'Asia/Kolkata', 'Asia/Dhaka',
  'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh',
  'Asia/Shanghai', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Taipei', 'Australia/Perth',
  'Asia/Tokyo', 'Asia/Seoul', 'Australia/Adelaide',
  'Australia/Sydney', 'Australia/Brisbane',
  'Pacific/Noumea', 'Pacific/Auckland', 'Pacific/Tongatapu',
];

/** City label for a zone, e.g. 'Asia/Jakarta' → 'Jakarta'. */
export const tzCity = (tz: string): string =>
  tz === 'local' ? 'Local (Exchange)'
  : tz === 'UTC' ? 'UTC'
  : (tz.split('/').pop() || tz).replace(/_/g, ' ');

/** Live "(UTC±X)" offset label (DST-aware) for a zone. 'Local' for browser-local. */
export const tzOffset = (tz: string): string => {
  if (tz === 'local') return 'Local';
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || '';
    const s = part.replace('GMT', 'UTC');
    return s === 'UTC' ? 'UTC±0' : s;
  } catch { return ''; }
};

/** Compact label for the status bar / button face. */
export const tzShort = (tz: string): string =>
  !tz || tz === 'local' ? 'Local'
  : tz === 'UTC' ? 'UTC' : (tz.split('/').pop() || tz).replace(/_/g, ' ');
