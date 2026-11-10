import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { CalendarDays, LayoutList, LogOut, Search, Settings2, X } from 'lucide-react';
import { AnimatePresence, m as motion, useReducedMotion } from 'motion/react';
import { db } from '@/lib/firebase/client';
import { auth } from '@/lib/firebase/auth';
import { useCatalog, useSlots } from '@/lib/firebase/catalog';
import { changeStatus, rescheduleBooking } from '@/lib/firebase/bookings';
import { errorMessage, statuses, type Booking, type Status } from '@/lib/models';
import { availableTimes, dateKey, dateLabel, timeLabel } from '@/lib/time';
import { ErrorState, Loading } from '@/components/ui/State';
import Management from './Management';
function readBooking(id: string, d: Record<string, unknown>): Booking {
  const text = (key: string) => (typeof d[key] === 'string' ? (d[key] as string) : '');
  return {
    id,
    firstName: text('firstName'),
    lastName: text('lastName'),
    email: text('email'),
    phone: text('phone'),
    eventType: text('eventType'),
    venue: text('venue'),
    preferredDate: text('preferredDate'),
    message: text('message'),
    guestCount: typeof d.guestCount === 'number' ? d.guestCount : 0,
    status: statuses.includes(d.status as Status) ? (d.status as Status) : 'pending',
    serviceId: text('serviceId') || undefined,
    venueId: text('venueId') || undefined,
    slotId: text('slotId') || undefined,
    startsAt: d.startsAt instanceof Timestamp ? d.startsAt.toDate() : undefined,
    endsAt: d.endsAt instanceof Timestamp ? d.endsAt.toDate() : undefined,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : undefined,
  };
}
export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dataError, setDataError] = useState('');
  const [tab, setTab] = useState<'bookings' | 'manage'>('bookings');
  const [view, setView] = useState<'day' | 'table'>('day');
  const [day, setDay] = useState(dateKey());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [optimistic, setOptimistic] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [reschedule, setReschedule] = useState<Booking | null>(null);
  useEffect(() => {
    if (!auth || !db) return;
    let generation = 0;
    const database = db;
    const off = onAuthStateChanged(auth, (current) => {
      const version = ++generation;
      setUser(current);
      setIsAdmin(false);
      setReady(false);
      setBookings([]);
      setLoaded(false);
      if (!current) {
        setReady(true);
        return;
      }
      void getDoc(doc(database, 'admins', current.uid))
        .then((result) => {
          if (version === generation) {
            setIsAdmin(result.exists());
            setReady(true);
            if (!result.exists())
              setAuthError(
                'This account has no admin access. Ask the owner to add your UID to the admins collection.',
              );
          }
        })
        .catch(() => {
          if (version === generation) {
            setAuthError(
              'Unable to verify admin access. Check your connection and published rules.',
            );
            setReady(true);
          }
        });
    });
    return () => {
      generation++;
      off();
    };
  }, []);
  useEffect(() => {
    if (!db || !isAdmin) return;
    return onSnapshot(
      collection(db, 'reservations'),
      (snapshot) => {
        setBookings(
          snapshot.docs
            .map((item) => readBooking(item.id, item.data()))
            .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)),
        );
        setLoaded(true);
        setDataError('');
      },
      () => {
        setDataError('Unable to load bookings. Check your connection and admin access.');
        setLoaded(true);
      },
    );
  }, [isAdmin]);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth) return;
    const data = new FormData(e.currentTarget);
    setSigningIn(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(
        auth,
        String(data.get('email')),
        String(data.get('password')),
      );
    } catch {
      setAuthError('Sign-in failed. Check your email and password, then try again.');
    } finally {
      setSigningIn(false);
    }
  }
  async function logout() {
    if (!auth) return;
    try {
      await signOut(auth);
      setAuthError('');
    } catch {
      setAuthError('Could not sign out. Please try again.');
    }
  }
  async function act(booking: Booking, status: Status) {
    setOptimistic((current) => ({ ...current, [booking.id]: status }));
    setBusy((current) => [...current, booking.id]);
    setNotice('');
    try {
      await changeStatus(booking, status);
      setNotice(`Booking ${status}.`);
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setOptimistic((current) => {
        const next = { ...current };
        delete next[booking.id];
        return next;
      });
      setBusy((current) => current.filter((id) => id !== booking.id));
    }
  }
  if (!ready)
    return (
      <main id="main" className="admin-signin">
        <Loading>Checking staff access…</Loading>
      </main>
    );
  if (!user || !isAdmin)
    return (
      <main id="main" className="admin-signin">
        <Link className="back-link" to="/">
          Back to the venue
        </Link>
        <div className="signin-panel">
          <span className="brand-mark" aria-hidden="true">
            V
          </span>
          <p className="section-kicker">Club Victorina</p>
          <h1>The visit desk.</h1>
          <p>Staff access for appointments, services and visit hours.</p>
          {!auth ? (
            <div className="notice">
              Firebase is not configured. Add the values in .env.example to your .env file to enable
              staff sign-in.
            </div>
          ) : user ? (
            <>
              <ErrorState>{authError || 'This account does not have admin access.'}</ErrorState>
              <button className="button" onClick={() => void logout()}>
                Use another account
              </button>
            </>
          ) : (
            <form onSubmit={login}>
              <label className="field">
                <span>Email address</span>
                <input name="email" type="email" autoComplete="username" required />
              </label>
              <label className="field">
                <span>Password</span>
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              {authError && <ErrorState>{authError}</ErrorState>}
              <button className="button" disabled={signingIn}>
                {signingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </main>
    );
  const shown = bookings
    .map((b) => ({ ...b, status: optimistic[b.id] ?? b.status }))
    .filter(
      (b) =>
        (view !== 'day' || b.preferredDate === day) &&
        (filter === 'all' || b.status === filter) &&
        `${b.firstName} ${b.lastName} ${b.email} ${b.venue} ${b.id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            V
          </span>
          <span>
            Club Victorina<small>The visit desk</small>
          </span>
        </Link>
        <div>
          <span className="staff-email">{user.email}</span>
          <button className="button secondary small" onClick={() => void logout()}>
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>
      <div className="admin-body">
        <nav className="admin-nav" aria-label="Admin navigation">
          <button
            aria-current={tab === 'bookings' ? 'page' : undefined}
            onClick={() => setTab('bookings')}
          >
            <CalendarDays size={18} aria-hidden="true" />
            Bookings
          </button>
          <button
            aria-current={tab === 'manage' ? 'page' : undefined}
            onClick={() => setTab('manage')}
          >
            <Settings2 size={18} aria-hidden="true" />
            Services & hours
          </button>
          <Link to="/">View public site</Link>
        </nav>
        <main id="main" className="admin-main">
          {tab === 'manage' ? (
            <Management />
          ) : (
            <>
              <div className="admin-title">
                <div>
                  <p className="section-kicker">Appointments</p>
                  <h1>Keep the day in view.</h1>
                </div>
                <span className="realtime">
                  <span className="live-dot" />
                  Realtime updates
                </span>
              </div>
              <div className="admin-stats">
                <div>
                  <strong>
                    {
                      bookings.filter((b) => b.preferredDate === day && b.status !== 'cancelled')
                        .length
                    }
                  </strong>
                  <span>Visits on selected day</span>
                </div>
                <div>
                  <strong>{bookings.filter((b) => b.status === 'pending').length}</strong>
                  <span>Awaiting confirmation</span>
                </div>
                <div>
                  <strong>{bookings.filter((b) => b.status === 'confirmed').length}</strong>
                  <span>Confirmed visits</span>
                </div>
              </div>
              <div className="admin-toolbar">
                <div className="segmented">
                  <button aria-pressed={view === 'day'} onClick={() => setView('day')}>
                    <CalendarDays size={16} aria-hidden="true" />
                    Day view
                  </button>
                  <button aria-pressed={view === 'table'} onClick={() => setView('table')}>
                    <LayoutList size={16} aria-hidden="true" />
                    All bookings
                  </button>
                </div>
                <label className="field compact">
                  <span>{view === 'day' ? 'Visit date' : 'Filter by status'}</span>
                  {view === 'day' ? (
                    <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
                  ) : (
                    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                      <option value="all">All statuses</option>
                      {statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </label>
                <label className="search-field">
                  <Search size={17} aria-hidden="true" />
                  <span className="sr-only">
                    Search bookings by name, email, venue or reference
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search bookings"
                  />
                </label>
              </div>
              {view === 'day' && (
                <label className="inline-filter">
                  Status
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="all">All statuses</option>
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              {notice && (
                <div className="toast" role="status">
                  {notice}
                  <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
                    <X size={16} />
                  </button>
                </div>
              )}
              {dataError ? (
                <ErrorState>{dataError}</ErrorState>
              ) : !loaded ? (
                <Loading>Loading the visit desk…</Loading>
              ) : !shown.length ? (
                <div className="admin-empty">
                  <CalendarDays size={30} aria-hidden="true" />
                  <h2>No visits to show.</h2>
                  <p>
                    {search || filter !== 'all'
                      ? 'Try another search or status filter.'
                      : view === 'day'
                        ? 'Choose another date or open all bookings to see previous inquiries.'
                        : 'New visit requests will appear here as they arrive.'}
                  </p>
                </div>
              ) : view === 'table' ? (
                <div className="table-scroll">
                  <table>
                    <caption className="sr-only">Club Victorina bookings</caption>
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>Visit</th>
                        <th>Space & event</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>
                              {b.firstName} {b.lastName}
                            </strong>
                            <a href={`mailto:${b.email}`}>{b.email}</a>
                            <span>{b.phone}</span>
                            <small>{b.id}</small>
                          </td>
                          <td>
                            {b.startsAt ? (
                              <>
                                {dateLabel(b.startsAt)}
                                <span>{timeLabel(b.startsAt)}</span>
                              </>
                            ) : (
                              <>
                                {b.preferredDate}
                                <span>Legacy inquiry / no time set</span>
                              </>
                            )}
                          </td>
                          <td>
                            {b.venue}
                            <span>
                              {b.eventType}, {b.guestCount} guests
                            </span>
                            {b.message && (
                              <details>
                                <summary>Guest message</summary>
                                <p>{b.message}</p>
                              </details>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill ${b.status}`}>{b.status}</span>
                          </td>
                          <td>
                            <BookingActions
                              booking={b}
                              busy={busy.includes(b.id)}
                              act={act}
                              reschedule={setReschedule}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="day-list">
                  {shown
                    .sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0))
                    .map((b) => (
                      <article className="day-booking" key={b.id}>
                        <div className="day-time">
                          {b.startsAt ? timeLabel(b.startsAt) : 'No time'}
                          <span>{b.endsAt ? `to ${timeLabel(b.endsAt)}` : 'Legacy inquiry'}</span>
                        </div>
                        <div>
                          <div className="day-booking-title">
                            <h2>
                              {b.firstName} {b.lastName}
                            </h2>
                            <span className={`status-pill ${b.status}`}>{b.status}</span>
                          </div>
                          <p>
                            {b.venue} / {b.eventType} / {b.guestCount} guests
                          </p>
                          <a href={`mailto:${b.email}`}>{b.email}</a>
                          <p>{b.phone}</p>
                          {b.message && <p className="guest-message">{b.message}</p>}
                          <small>Reference: {b.id}</small>
                        </div>
                        <BookingActions
                          booking={b}
                          busy={busy.includes(b.id)}
                          act={act}
                          reschedule={setReschedule}
                        />
                      </article>
                    ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <AnimatePresence>
        {reschedule && (
          <Reschedule
            key={reschedule.id}
            booking={reschedule}
            close={() => setReschedule(null)}
            saved={() => {
              setNotice('Visit rescheduled. Contact the guest to confirm the new time.');
              setReschedule(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
function BookingActions({
  booking,
  busy,
  act,
  reschedule,
}: {
  booking: Booking;
  busy: boolean;
  act: (b: Booking, s: Status) => Promise<void>;
  reschedule: (b: Booking) => void;
}) {
  if (booking.status === 'cancelled' || booking.status === 'completed')
    return <span className="muted">No further actions</span>;
  return (
    <div className="booking-actions">
      {booking.status === 'pending' && (
        <button disabled={busy || !booking.startsAt} onClick={() => void act(booking, 'confirmed')}>
          Confirm
        </button>
      )}
      {booking.status === 'confirmed' && (
        <button disabled={busy} onClick={() => void act(booking, 'completed')}>
          Mark complete
        </button>
      )}
      <button disabled={busy} onClick={() => reschedule(booking)}>
        {booking.startsAt ? 'Reschedule' : 'Schedule visit'}
      </button>
      <button
        className="danger-text"
        disabled={busy}
        onClick={() => void act(booking, 'cancelled')}
      >
        Cancel
      </button>
      {!booking.startsAt && <small>Schedule a visit before confirming.</small>}
    </div>
  );
}
function Reschedule({
  booking,
  close,
  saved,
}: {
  booking: Booking;
  close: () => void;
  saved: () => void;
}) {
  const { services, settings } = useCatalog();
  const [serviceId, setServiceId] = useState(booking.serviceId ?? '');
  const [day, setDay] = useState(
    booking.preferredDate >= dateKey() ? booking.preferredDate : dateKey(),
  );
  const [start, setStart] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { slots, loading, error: slotError } = useSlots(day);
  const reduce = useReducedMotion();
  const service = services.find((s) => s.id === serviceId && s.active);
  const available = service
    ? availableTimes(
        service,
        day,
        settings,
        slots.filter((s) => s.reservationId !== booking.id),
      )
    : [];
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!service || !start) return;
    setBusy(true);
    setError('');
    try {
      await rescheduleBooking(booking, service, new Date(start));
      saved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.15 }}
    >
      <dialog
        open
        aria-modal="true"
        aria-labelledby="reschedule-title"
        className="reschedule-dialog"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) close();
          if (e.key === 'Tab') {
            const items = e.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input,select',
            );
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="list-heading">
          <h2 id="reschedule-title">Reschedule visit</h2>
          <button onClick={close} disabled={busy} aria-label="Close reschedule">
            <X size={20} />
          </button>
        </div>
        <p>
          {booking.firstName} {booking.lastName}. Save the new time, then contact the guest.
        </p>
        <form onSubmit={save}>
          <label className="field">
            <span>Visit service</span>
            <select
              autoFocus
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setStart('');
              }}
              required
            >
              <option value="">Choose a service</option>
              {services
                .filter((s) => s.active)
                .map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Date (Asia/Manila)</span>
            <input
              type="date"
              value={day}
              min={dateKey()}
              onChange={(e) => {
                setDay(e.target.value);
                setStart('');
              }}
              required
            />
          </label>
          {loading ? (
            <Loading>Checking available times…</Loading>
          ) : slotError ? (
            <ErrorState>{slotError}</ErrorState>
          ) : (
            <label className="field">
              <span>Available time</span>
              <select value={start} onChange={(e) => setStart(e.target.value)} required>
                <option value="">
                  {available.length ? 'Choose a time' : 'No times available'}
                </option>
                {available.map((t) => (
                  <option key={t.toISOString()} value={t.toISOString()}>
                    {timeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && <ErrorState>{error}</ErrorState>}
          <button className="button" disabled={!start || busy || loading || Boolean(slotError)}>
            {busy ? 'Saving…' : 'Save new time'}
          </button>
        </form>
      </dialog>
    </motion.div>
  );
}
