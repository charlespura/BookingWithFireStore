import { serviceSchema, settingsSchema, detailsSchema } from '../schemas';
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { database } from './client';
import {
  defaultServices,
  defaultSettings,
  venues,
  type Booking,
  type Details,
  type Service,
  type Status,
} from '../models';
import { availableTimes, dateKey, slotKey } from '../time';
export async function createBooking(
  service: Service,
  start: Date,
  input: Details,
): Promise<Booking> {
  const details = detailsSchema.parse(input);
  const db = database();
  const bookingRef = doc(collection(db, 'reservations'));
  const slotId = slotKey(service.venueId, start);
  const slotRef = doc(db, 'slots', slotId);
  const end = new Date(start.getTime() + service.duration * 60000);
  const booking: Booking = {
    id: bookingRef.id,
    ...details,
    status: 'pending',
    serviceId: service.id,
    venueId: service.venueId,
    venue: venues.find((v) => v.id === service.venueId)?.name ?? service.name,
    preferredDate: dateKey(start),
    guestCount: details.guestCount,
    startsAt: start,
    endsAt: end,
    slotId,
  };
  await runTransaction(db, async (transaction) => {
    const [slot, catalogDoc, settingsDoc] = await Promise.all([
      transaction.get(slotRef),
      transaction.get(doc(db, 'services', service.id)),
      transaction.get(doc(db, 'settings', 'business')),
    ]);
    if (slot.exists()) throw new Error('SLOT_TAKEN');
    const current = serviceSchema.parse({ ...catalogDoc.data(), id: catalogDoc.id });
    const settings = settingsSchema.parse(settingsDoc.data());
    if (
      !current.active ||
      current.duration !== service.duration ||
      current.venueId !== service.venueId ||
      !availableTimes(current, dateKey(start), settings, []).some(
        (t) => t.getTime() === start.getTime(),
      )
    )
      throw new Error('NOT_AVAILABLE');
    const { id: _id, startsAt: _start, endsAt: _end, ...data } = booking;
    void _id;
    void _start;
    void _end;
    transaction.set(bookingRef, {
      ...data,
      createdAt: serverTimestamp(),
      startsAt: Timestamp.fromDate(start),
      endsAt: Timestamp.fromDate(end),
      timeZone: 'Asia/Manila',
    });
    transaction.set(slotRef, {
      reservationId: bookingRef.id,
      venueId: service.venueId,
      startsAt: Timestamp.fromDate(start),
      endsAt: Timestamp.fromDate(end),
    });
  });
  return booking;
}
export async function changeStatus(booking: Booking, status: Status) {
  const db = database();
  const ref = doc(db, 'reservations', booking.id);
  await runTransaction(db, async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists()) throw new Error('NOT_AVAILABLE');
    const current = fresh.data();
    const state = current.status ?? 'pending';
    if (
      state === 'completed' ||
      state === 'cancelled' ||
      (status === 'confirmed' && (state !== 'pending' || !current.startsAt)) ||
      (status === 'completed' && state !== 'confirmed')
    )
      throw new Error('NOT_AVAILABLE');
    if (status === 'cancelled' && current.slotId) {
      const slotRef = doc(db, 'slots', String(current.slotId));
      const slot = await tx.get(slotRef);
      if (slot.exists() && slot.data().reservationId === booking.id) tx.delete(slotRef);
    }
    if (current.status === 'cancelled' && status !== 'cancelled') throw new Error('NOT_AVAILABLE');
    tx.update(ref, { status, updatedAt: serverTimestamp() });
  });
}
export async function rescheduleBooking(booking: Booking, service: Service, start: Date) {
  const db = database();
  const ref = doc(db, 'reservations', booking.id);
  const newSlotId = slotKey(service.venueId, start);
  const newSlotRef = doc(db, 'slots', newSlotId);
  const end = new Date(start.getTime() + service.duration * 60000);
  await runTransaction(db, async (tx) => {
    const [fresh, target, settingsDoc, serviceDoc] = await Promise.all([
      tx.get(ref),
      tx.get(newSlotRef),
      tx.get(doc(db, 'settings', 'business')),
      tx.get(doc(db, 'services', service.id)),
    ]);
    if (!fresh.exists()) throw new Error('NOT_AVAILABLE');
    const previous = fresh.data();
    if (previous.status === 'completed' || previous.status === 'cancelled')
      throw new Error('NOT_AVAILABLE');
    if (target.exists() && target.data().reservationId !== booking.id)
      throw new Error('SLOT_TAKEN');
    const settings = settingsSchema.parse(settingsDoc.data());
    const currentService = serviceSchema.parse({ ...serviceDoc.data(), id: serviceDoc.id });
    if (
      !currentService.active ||
      currentService.venueId !== service.venueId ||
      currentService.duration !== service.duration ||
      !availableTimes(currentService, dateKey(start), settings, []).some(
        (t) => t.getTime() === start.getTime(),
      )
    )
      throw new Error('NOT_AVAILABLE');
    const previousSlot = previous.slotId ? doc(db, 'slots', String(previous.slotId)) : null;
    const old = previousSlot ? await tx.get(previousSlot) : null;
    if (
      previousSlot &&
      old?.exists() &&
      old.data().reservationId === booking.id &&
      previous.slotId !== newSlotId
    )
      tx.delete(previousSlot);
    tx.set(newSlotRef, {
      reservationId: booking.id,
      venueId: service.venueId,
      startsAt: Timestamp.fromDate(start),
      endsAt: Timestamp.fromDate(end),
    });
    tx.update(ref, {
      serviceId: service.id,
      venueId: service.venueId,
      venue: venues.find((v) => v.id === service.venueId)?.name ?? service.name,
      slotId: newSlotId,
      startsAt: Timestamp.fromDate(start),
      endsAt: Timestamp.fromDate(end),
      preferredDate: dateKey(start),
      timeZone: 'Asia/Manila',
      status: 'pending',
      updatedAt: serverTimestamp(),
    });
  });
}
export async function initializeCatalog() {
  const db = database();
  const settings = await getDoc(doc(db, 'settings', 'business'));
  if (settings.exists()) return;
  const batch = writeBatch(db);
  for (const service of defaultServices) {
    const { id, ...data } = service;
    batch.set(doc(db, 'services', id), data);
  }
  batch.set(doc(db, 'settings', 'business'), { ...defaultSettings, published: true });
  await batch.commit();
}
