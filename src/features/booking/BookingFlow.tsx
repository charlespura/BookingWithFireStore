import { detailsSchema } from '@/lib/schemas';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, m as motion, useReducedMotion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Download,
  MapPin,
} from 'lucide-react';
import { useCatalog, useSlots } from '@/lib/firebase/catalog';
import { configured } from '@/lib/firebase/config';
import { createBooking } from '@/lib/firebase/bookings';
import { errorMessage, money, venues, type Booking, type Details } from '@/lib/models';
import {
  availableTimes,
  dateKey,
  dateLabel,
  downloadCalendar,
  localStart,
  nextDates,
  timeLabel,
} from '@/lib/time';
import { ErrorState, Loading } from '@/components/ui/State';
const steps = ['Service', 'Date', 'Time', 'Details', 'Confirmation'];
export default function BookingFlow() {
  const [params] = useSearchParams();
  const { services, settings, loading, error: catalogError } = useCatalog();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(params.get('service') ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState<Date | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const { slots, loading: slotsLoading, error: slotsError } = useSlots(date);
  const service = services.find((s) => s.id === serviceId && s.active);
  const times = service && date ? availableTimes(service, date, settings, slots) : [];
  const connected = configured && settings.published && !catalogError;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      guestCount: 50,
      message: '',
    },
  });
  useEffect(() => {
    if (step > 0) titleRef.current?.focus();
  }, [step]);
  function go(next: number) {
    setError('');
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  async function confirm(details: Details) {
    if (!service || !time || !times.some((t) => t.getTime() === time.getTime())) {
      setError('Your selected time is no longer available. Go back and choose another time.');
      return;
    }
    if (details.guestCount > (venues.find((v) => v.id === service.venueId)?.capacity ?? 500)) {
      setError('Your guest list exceeds this space’s capacity. Go back and choose a larger space.');
      return;
    }
    setError('');
    try {
      setBooking(await createBooking(service, time, details));
      go(4);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <main id="main" className="booking-page container">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the venue
      </Link>
      <ol className="booking-steps" aria-label="Booking progress">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? 'step' : undefined}
            className={i <= step ? 'current' : ''}
          >
            <span>{i < step ? <Check size={14} aria-hidden="true" /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="booking-layout">
        <aside className="booking-summary">
          <p className="section-kicker">Your first look</p>
          <h1>
            Come picture
            <br />
            your day here.
          </h1>
          <p>
            Reserve a visit to Club Victorina. Event dates and packages are discussed with the team.
          </p>
          <dl>
            <div>
              <dt>
                <MapPin size={17} aria-hidden="true" />
                Space
              </dt>
              <dd>
                {service
                  ? venues.find((v) => v.id === service.venueId)?.name
                  : 'Choose your setting'}
              </dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={17} aria-hidden="true" />
                Date
              </dt>
              <dd>{date ? dateLabel(localStart(date, 12)) : 'Choose a date'}</dd>
            </div>
            <div>
              <dt>
                <Clock3 size={17} aria-hidden="true" />
                Time
              </dt>
              <dd>
                {time ? timeLabel(time) : 'Choose a time'}
                {service && ` / ${service.duration} min`}
              </dd>
            </div>
          </dl>
          <p className="small-print">
            All times in Asia/Manila (UTC+8).
            <br />
            {service ? money(service.price) : 'Visit pricing shown with each service.'}
          </p>
        </aside>
        <div className="booking-panel">
          {loading ? (
            <Loading>Loading visit services…</Loading>
          ) : catalogError ? (
            <ErrorState>{catalogError}</ErrorState>
          ) : (
            <>
              {!connected && step < 4 && (
                <div className="notice">
                  Online scheduling is being prepared. You can explore the visit options below. To
                  arrange a visit now,{' '}
                  <a href="mailto:events@clubvictorina.com">email the events team</a>.
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={reduce ? false : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduce ? 0 : -10 }}
                  transition={{ duration: reduce ? 0 : 0.2 }}
                >
                  <h2 ref={titleRef} tabIndex={-1} className="step-title">
                    {
                      [
                        'Which space would you like to see?',
                        'Choose a day to come by.',
                        'Find a time that suits you.',
                        'Tell us a little about your plans.',
                        'Your visit request is in.',
                      ][step]
                    }
                  </h2>
                  {step === 0 && (
                    <>
                      <p>
                        Each appointment is a chance to see the space and discuss your event with
                        our team.
                      </p>
                      <fieldset className="service-options">
                        <legend className="sr-only">Visit service</legend>
                        {services
                          .filter((s) => s.active)
                          .map((s) => (
                            <label
                              className={`service-option ${serviceId === s.id ? 'selected' : ''}`}
                              key={s.id}
                            >
                              <input
                                type="radio"
                                name="service"
                                value={s.id}
                                checked={serviceId === s.id}
                                onChange={() => {
                                  setServiceId(s.id);
                                  setTime(null);
                                }}
                              />
                              <div>
                                <strong>{s.name}</strong>
                                <span>
                                  {s.duration} minutes / {money(s.price)}
                                </span>
                              </div>
                              <span className="radio-mark" aria-hidden="true">
                                {serviceId === s.id && <Check size={15} />}
                              </span>
                            </label>
                          ))}
                      </fieldset>
                      {!services.some((s) => s.active) && (
                        <p className="notice">No visit services are currently available.</p>
                      )}
                      <button
                        className="button"
                        disabled={!service || !connected}
                        onClick={() => go(1)}
                      >
                        Choose a date <ArrowUpRight size={17} aria-hidden="true" />
                      </button>
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <p>Select a date below, or choose another date within the next 90 days.</p>
                      <div className="date-options" role="group" aria-label="Suggested visit dates">
                        {nextDates().map((day) => {
                          const hours = settings.hours[localStart(day, 12).getUTCDay()];
                          const closed = hours?.closed || settings.blockedDates.includes(day);
                          return (
                            <button
                              key={day}
                              aria-pressed={date === day}
                              disabled={closed}
                              className={date === day ? 'selected' : ''}
                              onClick={() => {
                                setDate(day);
                                setTime(null);
                              }}
                            >
                              <span>
                                {dateLabel(localStart(day, 12), {
                                  weekday: 'short',
                                  month: undefined,
                                  day: undefined,
                                })}
                              </span>
                              <strong>
                                {dateLabel(localStart(day, 12), {
                                  weekday: undefined,
                                  month: undefined,
                                  day: 'numeric',
                                })}
                              </strong>
                              <span>
                                {closed
                                  ? 'Closed'
                                  : dateLabel(localStart(day, 12), {
                                      weekday: undefined,
                                      month: 'short',
                                      day: undefined,
                                    })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <label className="field">
                        <span>Another date</span>
                        <input
                          type="date"
                          min={dateKey()}
                          max={nextDates(91)[90]}
                          value={date}
                          onChange={(e) => {
                            setDate(e.target.value);
                            setTime(null);
                          }}
                        />
                      </label>
                      <div className="flow-actions">
                        <button className="button secondary" onClick={() => go(0)}>
                          Back
                        </button>
                        <button
                          className="button"
                          disabled={
                            !date ||
                            date < dateKey() ||
                            date > (nextDates(91)[90] ?? '') ||
                            settings.blockedDates.includes(date) ||
                            settings.hours[localStart(date, 12).getUTCDay()]?.closed
                          }
                          onClick={() => go(2)}
                        >
                          Choose a time
                        </button>
                      </div>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <p>{dateLabel(localStart(date, 12))}. All times shown in Asia/Manila.</p>
                      {slotsLoading ? (
                        <Loading>Checking available times…</Loading>
                      ) : slotsError ? (
                        <ErrorState>{slotsError}</ErrorState>
                      ) : times.length ? (
                        <fieldset className="time-options">
                          <legend className="sr-only">Available visit times</legend>
                          {times.map((start) => (
                            <label
                              className={time?.getTime() === start.getTime() ? 'selected' : ''}
                              key={start.toISOString()}
                            >
                              <input
                                type="radio"
                                name="time"
                                checked={time?.getTime() === start.getTime()}
                                onChange={() => setTime(start)}
                              />
                              <motion.span
                                animate={{
                                  scale: time?.getTime() === start.getTime() ? [1, 1.05, 1] : 1,
                                }}
                                transition={{ duration: reduce ? 0 : 0.2 }}
                              >
                                {timeLabel(start)}
                              </motion.span>
                            </label>
                          ))}
                        </fieldset>
                      ) : (
                        <p className="notice">
                          No visits available on this date. Choose another day to see more times.
                        </p>
                      )}
                      <div className="flow-actions">
                        <button className="button secondary" onClick={() => go(1)}>
                          Change date
                        </button>
                        <button
                          className="button"
                          disabled={
                            !time ||
                            slotsLoading ||
                            Boolean(slotsError) ||
                            !times.some((t) => t.getTime() === time.getTime())
                          }
                          onClick={() => go(3)}
                        >
                          Your details
                        </button>
                      </div>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <p>
                        We use these details to arrange your visit and discuss your event. No
                        payment is taken here.
                      </p>
                      <form noValidate onSubmit={handleSubmit(confirm)}>
                        <div className="form-grid">
                          {(
                            [
                              {
                                name: 'firstName',
                                label: 'First name',
                                autoComplete: 'given-name',
                                type: 'text',
                              },
                              {
                                name: 'lastName',
                                label: 'Last name',
                                autoComplete: 'family-name',
                                type: 'text',
                              },
                              {
                                name: 'email',
                                label: 'Email address',
                                autoComplete: 'email',
                                type: 'email',
                              },
                              {
                                name: 'phone',
                                label: 'Contact number',
                                autoComplete: 'tel',
                                type: 'tel',
                              },
                            ] as const
                          ).map((field) => (
                            <label className="field" key={field.name}>
                              <span>{field.label}</span>
                              <input
                                {...register(field.name)}
                                type={field.type}
                                autoComplete={field.autoComplete}
                                aria-label={field.label}
                                aria-invalid={Boolean(errors[field.name])}
                                aria-describedby={
                                  errors[field.name] ? `${field.name}-error` : undefined
                                }
                              />
                              {errors[field.name] && (
                                <span className="field-error" id={`${field.name}-error`}>
                                  {errors[field.name]?.message}
                                </span>
                              )}
                            </label>
                          ))}
                          <label className="field">
                            <span>Event type</span>
                            <select
                              {...register('eventType')}
                              aria-label="Event type"
                              aria-invalid={Boolean(errors.eventType)}
                              aria-describedby="event-error"
                            >
                              <option value="">Choose an event</option>
                              {detailsSchema.shape.eventType.options.map((event) => (
                                <option key={event}>{event}</option>
                              ))}
                            </select>
                            {errors.eventType && (
                              <span id="event-error" className="field-error">
                                {errors.eventType.message}
                              </span>
                            )}
                          </label>
                          <label className="field">
                            <span>Expected event guests</span>
                            <input
                              type="number"
                              min="1"
                              max={venues.find((v) => v.id === service?.venueId)?.capacity}
                              {...register('guestCount', { valueAsNumber: true })}
                              aria-label="Expected event guests"
                              aria-invalid={Boolean(errors.guestCount)}
                              aria-describedby="guest-error"
                            />
                            {errors.guestCount && (
                              <span id="guest-error" className="field-error">
                                {errors.guestCount.message}
                              </span>
                            )}
                          </label>
                        </div>
                        <label className="field">
                          <span>
                            Anything you would like to discuss? <small>(optional)</small>
                          </span>
                          <textarea
                            {...register('message')}
                            rows={3}
                            maxLength={1500}
                            aria-describedby="message-error"
                          />
                          {errors.message && (
                            <span id="message-error" className="field-error">
                              {errors.message.message}
                            </span>
                          )}
                        </label>
                        <label className="consent">
                          <input
                            type="checkbox"
                            {...register('consent')}
                            aria-invalid={Boolean(errors.consent)}
                            aria-describedby="consent-error"
                          />
                          <span>
                            I agree that Club Victorina may use my details to contact me about this
                            visit and my event plans.
                          </span>
                        </label>
                        {errors.consent && (
                          <p id="consent-error" className="field-error">
                            {errors.consent.message}
                          </p>
                        )}
                        <div className="flow-actions">
                          <button
                            type="button"
                            className="button secondary"
                            disabled={isSubmitting}
                            onClick={() => go(2)}
                          >
                            Back
                          </button>
                          <button className="button" disabled={isSubmitting}>
                            {isSubmitting ? 'Reserving your time…' : 'Confirm booking'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                  {step === 4 && booking && (
                    <div className="confirmation">
                      <motion.div
                        className="confirmation-mark"
                        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: reduce ? 0 : 0.35 }}
                      >
                        <Check size={30} aria-hidden="true" />
                      </motion.div>
                      <p>
                        Thank you, {booking.firstName}. Your chosen time is held. The events team
                        will contact you using the details you provided to confirm the visit.
                      </p>
                      <div className="confirmation-ticket">
                        <strong>{service?.name}</strong>
                        <span>{time && dateLabel(time, { year: 'numeric' })}</span>
                        <span>{time && timeLabel(time)} / Asia/Manila</span>
                        <small>Reference: {booking.id}</small>
                      </div>
                      <p className="small-print">
                        This is a venue visit request. Your event date is not reserved.
                      </p>
                      <button
                        className="button"
                        onClick={() => {
                          if (booking.startsAt && booking.endsAt)
                            downloadCalendar(
                              booking.id,
                              `${booking.venue} visit at Club Victorina`,
                              booking.startsAt,
                              booking.endsAt,
                            );
                        }}
                      >
                        <Download size={17} aria-hidden="true" />
                        Add to calendar
                      </button>
                      <Link to="/" className="text-link">
                        Back to the venue
                      </Link>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              {error && (
                <div className="mt-6">
                  <ErrorState>{error}</ErrorState>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
