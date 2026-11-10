import { detailsSchema } from '../src/lib/schemas';
import { describe, expect, it } from 'vitest';
import { availableTimes, calendarText, dateKey, localStart, slotKey } from '../src/lib/time';
import { defaultServices, defaultSettings } from '../src/lib/models';
describe('Manila visit scheduling', () => {
  it('uses Manila calendar dates across UTC midnight', () => {
    expect(dateKey(new Date('2026-11-10T17:30:00Z'))).toBe('2026-11-11');
    expect(localStart('2026-11-11', 9).toISOString()).toBe('2026-11-11T01:00:00.000Z');
  });
  it('excludes occupied hours, past hours and blocked days', () => {
    const service = defaultServices[0]!;
    const start = localStart('2026-11-11', 10);
    const settings = { ...defaultSettings, published: true };
    const slot = {
      id: slotKey('ballroom', start),
      venueId: 'ballroom',
      startsAt: start,
      endsAt: localStart('2026-11-11', 11),
      reservationId: 'test',
    };
    const times = availableTimes(
      service,
      '2026-11-11',
      settings,
      [slot],
      localStart('2026-11-11', 9),
    );
    expect(times[0]?.toISOString()).toBe(localStart('2026-11-11', 11).toISOString());
    expect(times).toHaveLength(10);
    expect(
      availableTimes(
        service,
        '2026-11-11',
        { ...settings, blockedDates: ['2026-11-11'] },
        [],
        new Date('2026-11-10'),
      ),
    ).toEqual([]);
  });
  it('does not offer unconfigured schedules', () => {
    expect(availableTimes(defaultServices[0]!, '2026-11-11', defaultSettings, [])).toEqual([]);
  });
  it('creates UTC calendar events with escaped user-facing titles', () => {
    const text = calendarText(
      'ref',
      'Garden, visit; plans',
      localStart('2026-11-11', 9),
      localStart('2026-11-11', 10),
    );
    expect(text).toContain('DTSTART:20261111T010000Z');
    expect(text).toContain('SUMMARY:Garden\\, visit\\; plans');
    expect(text).toContain('STATUS:TENTATIVE');
  });
  it('rejects invalid contact details and missing consent', () => {
    const result = detailsSchema.safeParse({
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'invalid',
      phone: '123',
      eventType: 'Wedding',
      guestCount: 0,
      message: '',
      consent: false,
    });
    expect(result.success).toBe(false);
  });
});
