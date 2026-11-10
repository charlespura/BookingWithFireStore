import { SectionLink } from '@/components/ui/SectionLink';
import { Link } from 'react-router-dom';
import { m as motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, CalendarDays, MapPin, Clock3, Check } from 'lucide-react';
import { useCatalog, useSlots } from '@/lib/firebase/catalog';
import { availableTimes, dateKey, dateLabel, localStart, timeLabel } from '@/lib/time';
import { money, venues } from '@/lib/models';
import { configured } from '@/lib/firebase/config';
import { ErrorState, Loading } from '@/components/ui/State';
export default function Landing() {
  const reduce = useReducedMotion();
  const { services, settings, loading, error } = useCatalog();
  const today = dateKey();
  const { slots, loading: slotsLoading, error: slotError } = useSlots(today);
  const available = services
    .filter((s) => s.active)
    .flatMap((s) =>
      availableTimes(s, today, settings, slots)
        .slice(0, 1)
        .map((time) => ({ service: s, time })),
    );
  return (
    <main id="main">
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="location-line">
            <span aria-hidden="true" /> A gathering place in Lipa, Batangas
          </p>
          <h1 id="hero-title">
            Good company.
            <br />A beautiful
            <br />
            place to gather.
          </h1>
          <p className="hero-description">
            From the first look around to the last dance. Find a setting for your celebration at
            Club Victorina.
          </p>
          <div className="hero-actions">
            <Link to="/book" className="button">
              Book a time <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <span>
              Come see the spaces.
              <br />
              Start planning together.
            </span>
          </div>
          <div className="hero-footnote">
            <CalendarDays size={18} aria-hidden="true" />
            <span>Venue visits by appointment</span>
          </div>
        </div>
        <div className="hero-visual">
          <motion.img
            initial={reduce ? false : { scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            src={`${import.meta.env.BASE_URL}images/garden.webp`}
            srcSet={`${import.meta.env.BASE_URL}images/garden-small.webp 600w, ${import.meta.env.BASE_URL}images/garden.webp 1400w`}
            sizes="(max-width: 600px) calc(100vw - 40px), 48vw"
            alt="A celebration table set with flowers, glassware and blue napkins, ready for guests"
            width="1600"
            height="1067"
            fetchPriority="high"
          />
          <motion.div
            className="garden-shutter"
            aria-hidden="true"
            initial={reduce ? false : { scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          />
          <div className="photo-caption">
            <span>Make room for your next chapter.</span>
            <span>Club Victorina</span>
          </div>
        </div>
      </section>
      <div className="venue-note container">
        <p>Weddings, birthdays, family gatherings and everything worth getting together for.</p>
        <SectionLink target="spaces">
          Find your setting <ArrowUpRight size={16} aria-hidden="true" />
        </SectionLink>
      </div>
      <section id="spaces" className="section container" aria-labelledby="spaces-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">The spaces</p>
            <h2 id="spaces-title">A setting that feels right.</h2>
          </div>
          <p>
            A grand guest list or a small circle.
            <br />
            There is a place for both.
          </p>
        </div>
        <div className="spaces-layout">
          {venues.map((venue) => (
            <article className={`space space-${venue.id}`} key={venue.id}>
              <Link
                to={`/book?service=${venue.id}`}
                className="space-image"
                aria-label={`Book a ${venue.name} visit`}
              >
                <img
                  src={`${import.meta.env.BASE_URL}images/${venue.image}`}
                  alt={`${venue.name} inspiration from the original venue collection`}
                  width="900"
                  height="600"
                  loading="lazy"
                />
                <span>
                  <ArrowUpRight size={24} aria-hidden="true" />
                </span>
              </Link>
              <div className="space-title">
                <h3>{venue.name}</h3>
                <span>Up to {venue.capacity} guests</span>
              </div>
              <p className="space-detail">{venue.detail}</p>
              <p>{venue.description}</p>
            </article>
          ))}
        </div>
        <p className="photo-note">
          Photography is illustrative. Explore the actual spaces during your visit.
        </p>
      </section>
      <section id="visit" className="visit-section">
        <div className="container visit-layout">
          <div>
            <p className="section-kicker">A first look, together</p>
            <h2>
              Big plans start
              <br />
              with a small visit.
            </h2>
            <p>
              Walk through your preferred space, talk through your guest list and ask about
              catering, setup and event packages.
            </p>
            <ul className="plain-checks">
              <li>
                <Check size={17} aria-hidden="true" />
                Choose a space and a time
              </li>
              <li>
                <Check size={17} aria-hidden="true" />
                Meet the team and share your plans
              </li>
              <li>
                <Check size={17} aria-hidden="true" />
                Get an event quote tailored to you
              </li>
            </ul>
            <p className="small-print">A visit appointment does not reserve your event date.</p>
          </div>
          <div className="visit-services">
            <div className="list-heading">
              <h3>Book a venue visit</h3>
              <span>Asia/Manila</span>
            </div>
            {loading ? (
              <Loading>Checking visit services…</Loading>
            ) : error ? (
              <ErrorState>{error}</ErrorState>
            ) : services.filter((s) => s.active).length === 0 ? (
              <p className="notice">Visit services are being prepared. Please contact the team.</p>
            ) : (
              <ul>
                {services
                  .filter((s) => s.active)
                  .map((s) => (
                    <li key={s.id}>
                      <Link to={`/book?service=${s.id}`}>
                        <div>
                          <strong>{s.name}</strong>
                          <span>{s.duration} minutes</span>
                        </div>
                        <span>{money(s.price)}</span>
                        <ArrowUpRight size={19} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
            <div className="live-availability">
              <div className="list-heading">
                <h4>
                  <span className="live-dot" />
                  Today's availability
                </h4>
                <span>
                  {dateLabel(localStart(today, 12), { weekday: undefined, month: 'short' })}
                </span>
              </div>
              {!configured || !settings.published ? (
                <p>
                  Online scheduling is being prepared.{' '}
                  <a href="mailto:events@clubvictorina.com">Arrange a visit by email</a>.
                </p>
              ) : slotError ? (
                <ErrorState>{slotError}</ErrorState>
              ) : slotsLoading ? (
                <Loading>Checking available times…</Loading>
              ) : available.length ? (
                <div className="availability-chips">
                  {available.map(({ service, time }) => (
                    <Link to={`/book?service=${service.id}`} key={service.id}>
                      {timeLabel(time)}{' '}
                      <span>{venues.find((v) => v.id === service.venueId)?.name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>
                  No visits left today. <Link to="/book">Choose another date</Link>.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="section container practical-layout">
        <div>
          <p className="section-kicker">Make a day of it</p>
          <h2>See you in Lipa.</h2>
          <p>
            Find us in Lipa City, Batangas. When the team confirms your visit, ask for the entrance
            details and directions.
          </p>
          <div className="contact-line">
            <MapPin size={21} aria-hidden="true" />
            <div>
              <strong>Club Victorina</strong>
              <span>Lipa City, Batangas, Philippines</span>
            </div>
          </div>
          <div className="contact-line">
            <Clock3 size={21} aria-hidden="true" />
            <div>
              <strong>Visit hours</strong>
              <span>
                {settings.published
                  ? 'See the weekly schedule below.'
                  : 'Visit by appointment. Email the team to arrange a time.'}
              </span>
            </div>
          </div>
          {settings.published && (
            <dl className="public-hours">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                (day, i) => (
                  <div key={day}>
                    <dt>{day}</dt>
                    <dd>
                      {settings.hours[i]?.closed
                        ? 'Closed'
                        : `${timeLabel(localStart(today, settings.hours[i]?.open ?? 9))} – ${timeLabel(localStart(today, (settings.hours[i]?.close ?? 21) % 24))}`}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          )}
          <a
            className="text-link"
            href="https://www.google.com/maps/search/?api=1&query=Club+Victorina+Lipa+Batangas"
            target="_blank"
            rel="noreferrer"
          >
            Look up directions <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="faq">
          <h3>Before you visit</h3>
          {[
            [
              'Does this reserve my event date?',
              'No. This reserves a time to visit a space and speak with our team. Event availability, packages and payment terms are agreed separately.',
            ],
            [
              'Can I bring my event planner?',
              'Yes. Include them in your visit plans and tell us in the message field if you would like to discuss styling, catering or technical requirements.',
            ],
            [
              'How much does an event cost?',
              'Event pricing depends on the space, guest count and setup. Discuss your plans during the visit so the team can prepare a specific quote.',
            ],
            [
              'How do I change my visit?',
              'Email events@clubvictorina.com with your booking reference. The team can cancel or reschedule your visit.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
