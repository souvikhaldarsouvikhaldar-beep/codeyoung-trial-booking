import { useEffect, useState } from 'react';
import { api } from './api';
import TimezoneSelect from './components/TimezoneSelect';
import DayPicker from './components/DayPicker';
import SlotPicker from './components/SlotPicker';
import BookingForm from './components/BookingForm';
import Confirmation from './components/Confirmation';

const detectTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

export default function App() {
  const [tz, setTz] = useState(detectTimezone);
  const [days, setDays] = useState(null);
  const [date, setDate] = useState(null);
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState(null);
  const [step, setStep] = useState('choose'); // choose -> details -> done
  const [result, setResult] = useState(null);
  const [email, setEmail] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Load the day strip whenever the time zone changes (or after a booking conflict).
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    api.availability(tz)
      .then((res) => {
        if (cancelled) return;
        setDays(res.days);
        setDate((cur) => cur ?? res.days.find((d) => d.availableSlots > 0)?.date ?? null);
      })
      .catch((e) => !cancelled && setLoadError(e.message));
    return () => { cancelled = true; };
  }, [tz, reloadKey]);

  // Load the slots for the chosen day.
  useEffect(() => {
    if (!date) { setSlots(null); return; }
    let cancelled = false;
    setSlots(null);
    api.slots(date, tz)
      .then((res) => !cancelled && setSlots(res.slots))
      .catch((e) => !cancelled && setLoadError(e.message));
    return () => { cancelled = true; };
  }, [date, tz, reloadKey]);

  function changeTimezone(next) {
    setTz(next);
    setDays(null);
    setDate(null);
    setSlot(null);
  }

  async function submit({ parentName, parentEmail }) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.book({ parentName, parentEmail, startUtc: slot.startUtc, timezone: tz });
      setEmail(parentEmail);
      setResult(res.booking);
      setStep('done');
    } catch (e) {
      setFormError(e.message);
      if (e.code === 'SLOT_UNAVAILABLE' || e.code === 'OUTSIDE_WINDOW') {
        // Someone else got there first: send the parent back to a refreshed list.
        setSlot(null);
        setStep('choose');
        setLoadError(e.message);
        setReloadKey((k) => k + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setSlot(null);
    setDate(null);
    setStep('choose');
    setReloadKey((k) => k + 1);
  }

  const allFull = days && days.every((d) => d.availableSlots === 0);
  const slotLabel = slot && date
    ? `${days?.find((d) => d.date === date)?.label ?? date}, ${slot.localTime} ${slot.abbr}`
    : '';

  return (
    <main className="page">
      <header>
        <h1>Book a free trial class</h1>
        <p className="muted">Meet a Codeyoung mentor for a free 30-minute class. Pick a time that suits you.</p>
      </header>

      {step === 'done' && result ? (
        <Confirmation booking={result} email={email} onReset={reset} />
      ) : (
        <>
          <TimezoneSelect value={tz} onChange={changeTimezone} />
          <p className="muted small">All times below are shown in your time zone and update automatically for daylight saving.</p>

          {loadError && <div className="notice error" role="alert">{loadError}</div>}

          {!days && !loadError && <p className="muted">Loading available times…</p>}

          {allFull && (
            <div className="notice warn" role="status">
              <strong>All mentors are fully booked for the next two weeks.</strong>
              <p>We're sorry about that. New spots open up regularly, so please check back soon.</p>
            </div>
          )}

          {days && !allFull && step === 'choose' && (
            <section>
              <h3>1. Choose a day</h3>
              <DayPicker days={days} selected={date} onSelect={(d) => { setDate(d); setSlot(null); }} />

              <h3>2. Choose a time</h3>
              {!slots && date && <p className="muted">Loading times…</p>}
              {slots && <SlotPicker slots={slots} selected={slot} onSelect={setSlot} />}

              <div className="row end">
                <button className="btn primary" disabled={!slot} onClick={() => { setFormError(null); setStep('details'); }}>
                  Continue
                </button>
              </div>
            </section>
          )}

          {step === 'details' && slot && (
            <BookingForm
              slotLabel={slotLabel}
              submitting={submitting}
              error={formError}
              onSubmit={submit}
              onBack={() => setStep('choose')}
            />
          )}
        </>
      )}
    </main>
  );
}
