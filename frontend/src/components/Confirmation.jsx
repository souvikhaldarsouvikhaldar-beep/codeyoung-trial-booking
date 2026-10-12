export default function Confirmation({ booking, email, onReset }) {
  return (
    <div className="card success">
      <div className="tick" aria-hidden="true">✓</div>
      <h2>Your trial class is booked!</h2>
      <p className="big">{booking.parent.date}<br />{booking.parent.time} {booking.parent.abbr}</p>
      <p className="muted">Shown in your local time ({booking.parent.timezone.replace(/_/g, ' ')}, {booking.parent.offset})</p>

      <dl>
        <dt>Your mentor</dt>
        <dd>{booking.mentor.name} <span className="muted">(their time: {booking.mentor.time} {booking.mentor.abbr})</span></dd>
        <dt>Length</dt>
        <dd>{booking.durationMinutes} minutes</dd>
        <dt>Class link</dt>
        <dd><a href={booking.meetingLink} target="_blank" rel="noreferrer">{booking.meetingLink}</a></dd>
      </dl>

      <p className="muted">We've emailed the details to {email}, and to your mentor.</p>
      <button className="btn ghost" onClick={onReset}>Book for another child</button>
    </div>
  );
}
