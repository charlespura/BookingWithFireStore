import { TIME_ZONE, type Service, type Settings, type Slot } from './models';
export function dateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (key: string) => parts.find((p) => p.type === key)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const localStart = (date: string, hour: number): Date =>
  new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+08:00`);
export const slotKey = (venueId: string, start: Date): string =>
  `${venueId}_${Math.floor(start.getTime() / 1000)}`;
export function dateLabel(date: Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(date);
}
export const timeLabel = (date: Date): string =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
export function nextDates(count = 14, now = new Date()): string[] {
  const today = localStart(dateKey(now), 12);
  return Array.from({ length: count }, (_, i) => dateKey(new Date(today.getTime() + i * 86400000)));
}
export function availableTimes(
  service: Service,
  date: string,
  settings: Settings,
  slots: Slot[],
  now = new Date(),
): Date[] {
  if (!settings.published || settings.blockedDates.includes(date)) return [];
  const day = settings.hours[localStart(date, 12).getUTCDay()];
  if (!day || day.closed) return [];
  return Array.from({ length: day.close - day.open }, (_, i) =>
    localStart(date, day.open + i),
  ).filter(
    (start) =>
      start.getTime() > now.getTime() &&
      !slots.some((slot) => slot.id === slotKey(service.venueId, start)),
  );
}
function escapeICS(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}
export function calendarText(id: string, title: string, start: Date, end: Date): string {
  const utc = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Club Victorina//Venue visits//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${id}@clubvictorina.com`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeICS(title)}`,
    'LOCATION:Club Victorina\\, Lipa City\\, Batangas\\, Philippines',
    'DESCRIPTION:Venue visit request. The events team will confirm details. This does not reserve an event date.',
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
export function downloadCalendar(id: string, title: string, start: Date, end: Date) {
  const url = URL.createObjectURL(
    new Blob([calendarText(id, title, start, end)], { type: 'text/calendar;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'club-victorina-visit.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
