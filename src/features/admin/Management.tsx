import { serviceSchema, settingsSchema } from '@/lib/schemas';
import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useCatalog } from '@/lib/firebase/catalog';
import { database } from '@/lib/firebase/client';
import { initializeCatalog } from '@/lib/firebase/bookings';
import { errorMessage, venues, type Service, type Settings } from '@/lib/models';
import { ErrorState, Loading } from '@/components/ui/State';
export default function Management() {
  const { services, settings, loading, error } = useCatalog();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function initialize() {
    setBusy(true);
    try {
      await initializeCatalog();
      setNotice('Visit schedule published. Review services and opening hours below.');
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading>Loading services and hours…</Loading>;
  return (
    <>
      <div className="admin-title">
        <div>
          <p className="section-kicker">Visit settings</p>
          <h1>Make room in the diary.</h1>
        </div>
      </div>
      <p>
        Appointments start on the hour and reserve the whole hour for one venue. Visit durations can
        be 15, 30, 45 or 60 minutes.
      </p>
      {error && <ErrorState>{error}</ErrorState>}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!settings.published && services.length === 0 && (
        <div className="notice">
          <p>
            Before taking bookings, publish the initial visit catalog. Defaults: complimentary
            60-minute visits, every day from 9 AM to 9 PM. These are assumptions; review them before
            sharing the site.
          </p>
          <button className="button" onClick={() => void initialize()} disabled={busy}>
            {busy ? 'Publishing…' : 'Publish initial visit schedule'}
          </button>
        </div>
      )}
      <section className="management-section">
        <div className="list-heading">
          <h2>Visit services</h2>
          <span>Prices in PHP</span>
        </div>
        {services.map((service) => (
          <ServiceEditor
            key={`${service.id}-${service.name}-${service.duration}-${service.price}-${service.active}`}
            service={service}
          />
        ))}
        <details className="add-service">
          <summary>Add a visit service</summary>
          <ServiceEditor
            service={{
              id: '',
              name: '',
              venueId: 'ballroom',
              duration: 60,
              price: 0,
              active: true,
            }}
          />
        </details>
      </section>
      <HoursEditor key={JSON.stringify(settings)} settings={settings} />
    </>
  );
}
function ServiceEditor({ service }: { service: Service }) {
  const [draft, setDraft] = useState(service);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [optimistic, setOptimistic] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    const id = service.id || crypto.randomUUID();
    const parsed = serviceSchema.safeParse({ ...draft, id });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the service fields.');
      return;
    }
    setBusy(true);
    setOptimistic(true);
    const { id: _id, ...data } = parsed.data;
    void _id;
    try {
      await setDoc(doc(database(), 'services', id), data);
      setMessage('Service saved.');
      if (!service.id) setDraft(service);
    } catch (e) {
      setDraft(service);
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
      setOptimistic(false);
    }
  }
  return (
    <form className="service-editor" onSubmit={save}>
      <label className="field">
        <span>Service name</span>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required
          minLength={3}
          maxLength={100}
        />
      </label>
      <label className="field">
        <span>Space</span>
        <select
          value={draft.venueId}
          onChange={(e) => {
            const venue = venues.find((v) => v.id === e.target.value);
            if (venue) setDraft({ ...draft, venueId: venue.id });
          }}
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Minutes</span>
        <select
          value={draft.duration}
          onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })}
        >
          {[15, 30, 45, 60].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Price (PHP)</span>
        <input
          type="number"
          min="0"
          max="1000000"
          step="0.01"
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
          required
        />
      </label>
      <label className="consent">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        Active
      </label>
      <button className="button small" disabled={busy}>
        {optimistic ? 'Saving…' : 'Save service'}
      </button>
      {message && (
        <p role="status" className="editor-message">
          {message}
        </p>
      )}
    </form>
  );
}
function HoursEditor({ settings }: { settings: Settings }) {
  const [draft, setDraft] = useState(settings);
  const [blocked, setBlocked] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    const parsed = settingsSchema.safeParse(draft);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the opening hours.');
      return;
    }
    setBusy(true);
    try {
      await setDoc(doc(database(), 'settings', 'business'), parsed.data);
      setMessage('Hours and blocked dates saved.');
    } catch (e) {
      setDraft(settings);
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="management-section">
      <h2>Opening hours & blocked dates</h2>
      <p>
        Times use Asia/Manila. Existing bookings are kept when hours change; contact those guests
        separately.
      </p>
      <form onSubmit={save}>
        <div className="hours-editor">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
            (day, i) => (
              <div className="hours-row" key={day}>
                <strong>{day}</strong>
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={!draft.hours[i]?.closed}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hours: draft.hours.map((h, n) =>
                          n === i ? { ...h, closed: !e.target.checked } : h,
                        ),
                      })
                    }
                  />
                  Open
                </label>
                <label className="field compact">
                  <span className="sr-only">{day} opening hour</span>
                  <select
                    disabled={draft.hours[i]?.closed}
                    value={draft.hours[i]?.open}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hours: draft.hours.map((h, n) =>
                          n === i ? { ...h, open: Number(e.target.value) } : h,
                        ),
                      })
                    }
                  >
                    {Array.from({ length: 24 }, (_, n) => (
                      <option value={n} key={n}>
                        {String(n).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </label>
                <span>to</span>
                <label className="field compact">
                  <span className="sr-only">{day} closing hour</span>
                  <select
                    disabled={draft.hours[i]?.closed}
                    value={draft.hours[i]?.close}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hours: draft.hours.map((h, n) =>
                          n === i ? { ...h, close: Number(e.target.value) } : h,
                        ),
                      })
                    }
                  >
                    {Array.from({ length: 24 }, (_, n) => (
                      <option value={n + 1} key={n}>
                        {String(n + 1).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ),
          )}
        </div>
        <div className="blocked-editor">
          <label className="field">
            <span>Block a date</span>
            <input type="date" value={blocked} onChange={(e) => setBlocked(e.target.value)} />
          </label>
          <button
            type="button"
            className="button secondary small"
            disabled={!/^\d{4}-\d{2}-\d{2}$/.test(blocked)}
            onClick={() => {
              setDraft({
                ...draft,
                blockedDates: [...new Set([...draft.blockedDates, blocked])].sort(),
              });
              setBlocked('');
            }}
          >
            Add blocked date
          </button>
        </div>
        <ul className="blocked-dates">
          {draft.blockedDates.map((date) => (
            <li key={date}>
              {date}
              <button
                type="button"
                aria-label={`Unblock ${date}`}
                onClick={() =>
                  setDraft({ ...draft, blockedDates: draft.blockedDates.filter((d) => d !== date) })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <label className="consent">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
          />
          Accept new online visit bookings
        </label>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? 'Saving…' : 'Save hours and blocked dates'}
        </button>
      </form>
    </section>
  );
}
