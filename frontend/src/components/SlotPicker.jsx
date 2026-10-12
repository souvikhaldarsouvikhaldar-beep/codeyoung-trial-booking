const GROUPS = [
  { name: 'Morning', test: (h) => h >= 5 && h < 12 },
  { name: 'Afternoon', test: (h) => h >= 12 && h < 17 },
  { name: 'Evening', test: (h) => h >= 17 && h < 21 },
  { name: 'Night', test: (h) => h >= 21 || h < 5 },
];

export default function SlotPicker({ slots, selected, onSelect }) {
  const open = slots.filter((s) => s.available);
  if (open.length === 0) {
    return (
      <div className="notice warn" role="status">
        <strong>No mentors are free on this day.</strong>
        <p>All of our mentors are fully booked for this date. Please pick another day, or check back later as spots open up.</p>
      </div>
    );
  }
  return (
    <div>
      {GROUPS.map((g) => {
        const inGroup = slots.filter((s) => g.test(s.localHour));
        if (inGroup.length === 0) return null;
        return (
          <div key={g.name} className="slot-group">
            <h4>{g.name}</h4>
            <div className="slots">
              {inGroup.map((s) => (
                <button
                  key={s.startUtc}
                  type="button"
                  disabled={!s.available}
                  className={`slot ${selected?.startUtc === s.startUtc ? 'selected' : ''}`}
                  onClick={() => onSelect(s)}
                  title={s.available ? '' : 'Already booked'}
                >
                  {s.localTime}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
