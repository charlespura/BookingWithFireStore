import { serviceSchema, settingsSchema } from '../schemas';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { database } from './client';
import { defaultSettings, type Service, type Settings, type Slot } from '../models';
import { localStart } from '../time';
export function subscribeCatalog(
  onServices: (services: Service[]) => void,
  onSettings: (settings: Settings) => void,
  fail: () => void,
) {
  const db = database();
  const offServices = onSnapshot(
    collection(db, 'services'),
    (snapshot) =>
      onServices(
        snapshot.docs.flatMap((item) => {
          const parsed = serviceSchema.safeParse({ ...item.data(), id: item.id });
          return parsed.success ? [parsed.data] : [];
        }),
      ),
    fail,
  );
  const offSettings = onSnapshot(
    doc(db, 'settings', 'business'),
    (snapshot) => {
      const parsed = settingsSchema.safeParse(snapshot.data());
      onSettings(parsed.success ? parsed.data : defaultSettings);
    },
    fail,
  );
  return () => {
    offServices();
    offSettings();
  };
}
export function subscribeSlots(date: string, onSlots: (slots: Slot[]) => void, fail: () => void) {
  const start = localStart(date, 0);
  const availability = query(
    collection(database(), 'slots'),
    where('startsAt', '>=', start),
    where('startsAt', '<', new Date(start.getTime() + 86400000)),
  );
  return onSnapshot(
    availability,
    (snapshot) =>
      onSlots(
        snapshot.docs.flatMap((item) => {
          const d = item.data();
          if (!d.startsAt?.toDate || !d.endsAt?.toDate) return [];
          return [
            {
              id: item.id,
              startsAt: d.startsAt.toDate() as Date,
              endsAt: d.endsAt.toDate() as Date,
              venueId: String(d.venueId),
              reservationId: String(d.reservationId),
            },
          ];
        }),
      ),
    fail,
  );
}
