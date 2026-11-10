import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { defaultServices, defaultSettings } from '../src/lib/models';
import { dateKey, localStart, slotKey } from '../src/lib/time';
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
let env: RulesTestEnvironment;
const start = localStart(dateKey(new Date(Date.now() + 86400000)), 10);
const end = new Date(start.getTime() + 3600000);
const slotId = slotKey('ballroom', start);
const reservation = () => ({
  firstName: 'Maria',
  lastName: 'Santos',
  email: 'maria@example.com',
  phone: '+639171234567',
  eventType: 'Wedding',
  venue: 'Grand Ballroom',
  preferredDate: dateKey(start),
  guestCount: 100,
  message: '',
  consent: true,
  status: 'pending',
  serviceId: 'ballroom',
  venueId: 'ballroom',
  slotId,
  startsAt: Timestamp.fromDate(start),
  endsAt: Timestamp.fromDate(end),
  createdAt: serverTimestamp(),
  timeZone: 'Asia/Manila',
});
const slot = (id: string) => ({
  reservationId: id,
  venueId: 'ballroom',
  startsAt: Timestamp.fromDate(start),
  endsAt: Timestamp.fromDate(end),
});
describe.skipIf(!enabled)('Firestore access and atomic slot locks', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-victorina',
      firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    });
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'settings', 'business'), { ...defaultSettings, published: true });
      for (const s of defaultServices) {
        const { id, ...data } = s;
        await setDoc(doc(db, 'services', id), data);
      }
      await setDoc(doc(db, 'admins', 'owner'), { role: 'admin' });
    });
  });
  afterAll(async () => {
    await env?.cleanup();
  });
  it('allows a public atomic booking and availability read, but hides guest details', async () => {
    const db = env.unauthenticatedContext().firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'reservations', 'guest'), reservation());
    batch.set(doc(db, 'slots', slotId), slot('guest'));
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDocs(collection(db, 'slots')));
    await assertFails(getDoc(doc(db, 'reservations', 'guest')));
    await assertFails(getDocs(collection(db, 'reservations')));
  });
  it('rejects orphan reservations, orphan locks and public mutations', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'reservations', 'orphan'), reservation()));
    await assertFails(setDoc(doc(db, 'slots', slotId), slot('orphan')));
    await assertFails(setDoc(doc(db, 'settings', 'business'), defaultSettings));
    await assertFails(setDoc(doc(db, 'admins', 'attacker'), {}));
  });
  it('permits exactly one winner when two visitors compete for the same slot', async () => {
    const book = (id: string) => {
      const db = env.unauthenticatedContext().firestore();
      return runTransaction(db, async (tx) => {
        const target = doc(db, 'slots', slotId);
        const taken = await tx.get(target);
        if (taken.exists()) throw new Error('taken');
        tx.set(target, slot(id));
        tx.set(doc(db, 'reservations', id), reservation());
      });
    };
    const results = await Promise.allSettled([book('one'), book('two')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('rejects blocked dates and forged dates that try to bypass the block', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'settings', 'business'), {
        ...defaultSettings,
        published: true,
        blockedDates: [dateKey(start)],
      });
    });
    const db = env.unauthenticatedContext().firestore();
    for (const preferredDate of [dateKey(start), '2030-01-01']) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'reservations', 'blocked'), { ...reservation(), preferredDate });
      batch.set(doc(db, 'slots', slotId), slot('blocked'));
      await assertFails(batch.commit());
    }
  });
  it('uses the same Sunday-first weekday mapping as the client', async () => {
    const index = localStart(dateKey(start), 12).getUTCDay();
    const hours = defaultSettings.hours.map((h, i) => ({ ...h, closed: i !== index }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'settings', 'business'), {
        ...defaultSettings,
        published: true,
        hours,
      });
    });
    const db = env.unauthenticatedContext().firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'reservations', 'weekday'), reservation());
    batch.set(doc(db, 'slots', slotId), slot('weekday'));
    await assertSucceeds(batch.commit());
  });
  it('enforces UID based admin access', async () => {
    await assertFails(
      getDocs(collection(env.authenticatedContext('stranger').firestore(), 'reservations')),
    );
    await assertSucceeds(
      getDocs(collection(env.authenticatedContext('owner').firestore(), 'reservations')),
    );
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('owner').firestore(), 'admins', 'owner')),
    );
  });
});
