import { useState } from 'react';

export default function BookingForm({ slotLabel, onSubmit, onBack, submitting, error }) {
  const [parentName, setName] = useState('');
  const [parentEmail, setEmail] = useState('');

  function handle(e) {
    e.preventDefault();
    onSubmit({ parentName, parentEmail });
  }

  return (
    <form onSubmit={handle} className="card">
      <h3>Almost done</h3>
      <p className="muted">Trial class on <strong>{slotLabel}</strong></p>

      <label className="field">
        <span>Parent's name</span>
        <input value={parentName} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
      </label>
      <label className="field">
        <span>Email (we'll send the class link here)</span>
        <input type="email" value={parentEmail} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>

      {error && <div className="notice error" role="alert">{error}</div>}

      <div className="row">
        <button type="button" className="btn ghost" onClick={onBack} disabled={submitting}>Change time</button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </form>
  );
}
