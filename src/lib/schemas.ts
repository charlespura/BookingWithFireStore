import { z } from 'zod';
import { venueIds } from './models';
export const serviceSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(3).max(100),
  venueId: z.enum(venueIds),
  duration: z.number().int().min(15).max(60).multipleOf(15),
  price: z.number().min(0).max(1000000),
  active: z.boolean(),
});

export const hoursSchema = z
  .object({
    open: z.number().int().min(0).max(23),
    close: z.number().int().min(1).max(24),
    closed: z.boolean(),
  })
  .refine((h) => h.open < h.close, { message: 'Closing time must be after opening time.' });
export const settingsSchema = z.object({
  hours: z.array(hoursSchema).length(7),
  blockedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  published: z.boolean(),
});

export const detailsSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(80),
  email: z.email('Enter a valid email address, like maria@example.com.').max(200),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,19}$/, 'Enter a contact number with 7–20 characters.'),
  eventType: z.enum(
    [
      'Wedding',
      'Debut / 18th Birthday',
      'Corporate Event',
      'Birthday Celebration',
      'Christmas Party',
      'Other',
    ],
    { error: 'Choose the type of event you are planning.' },
  ),
  guestCount: z
    .number({ error: 'Enter the expected number of guests.' })
    .int('Use a whole number.')
    .min(1, 'Enter at least one guest.')
    .max(500, 'For more than 500 guests, contact the events team.'),
  message: z.string().trim().max(1500, 'Keep your message under 1,500 characters.'),
  consent: z.literal(true, { error: 'Agree so our team can contact you about your visit.' }),
});
