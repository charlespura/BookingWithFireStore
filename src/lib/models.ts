import type { z } from 'zod';
import type { serviceSchema, settingsSchema, detailsSchema } from './schemas';
export const TIME_ZONE = 'Asia/Manila';
export const venueIds = ['ballroom', 'garden', 'salon'] as const;
export const venues = [
  {
    id: 'ballroom',
    name: 'Grand Ballroom',
    capacity: 500,
    description:
      'A generous indoor setting for weddings, family celebrations and a full dance floor.',
    image: 'ballroom.webp',
    detail: 'For the whole guest list',
  },
  {
    id: 'garden',
    name: 'Garden Pavilion',
    capacity: 300,
    description: 'An open-air setting for ceremonies, long lunches and evenings around the table.',
    image: 'garden.webp',
    detail: 'A little closer to nature',
  },
  {
    id: 'salon',
    name: 'Salon Privé',
    capacity: 80,
    description: 'A more intimate room for private dinners, meetings and your closest people.',
    image: 'salon.webp',
    detail: 'Keep good company',
  },
] as const;
export type Service = z.infer<typeof serviceSchema>;
export const defaultServices: Service[] = venues.map((v) => ({
  id: v.id,
  name: `${v.name} visit`,
  venueId: v.id,
  duration: 60,
  price: 0,
  active: true,
}));
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = {
  hours: Array.from({ length: 7 }, () => ({ open: 9, close: 21, closed: false })),
  blockedDates: [],
  published: false,
};
export type Details = z.infer<typeof detailsSchema>;
export const statuses = ['pending', 'confirmed', 'cancelled', 'completed'] as const;
export type Status = (typeof statuses)[number];
export interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  eventType: string;
  venue: string;
  preferredDate: string;
  guestCount: number;
  message: string;
  status: Status;
  serviceId?: string;
  venueId?: string;
  slotId?: string;
  startsAt?: Date;
  endsAt?: Date;
  createdAt?: Date;
}
export interface Slot {
  id: string;
  startsAt: Date;
  endsAt: Date;
  venueId: string;
  reservationId: string;
}
export const money = (price: number) =>
  price === 0
    ? 'Complimentary'
    : new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
      }).format(price);
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'SLOT_TAKEN')
    return 'Someone just booked that time. Choose another available time.';
  if (error instanceof Error && error.message === 'NOT_AVAILABLE')
    return 'That time is no longer available. Choose a new date or time.';
  if (error instanceof Error && error.message === 'NOT_CONFIGURED')
    return 'Online booking is not connected yet. Contact the events team to arrange your visit.';
  return 'We could not save your changes. Check your connection and try again.';
}
