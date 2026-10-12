export default function DayPicker({ days, selected, onSelect }) {
  return (
    <div className="days" role="listbox" aria-label="Choose a day">
      {days.map((d) => {
        const full = d.availableSlots === 0;
        return (
          <button
            key={d.date}
            type="button"
            role="option"
            aria-selected={selected === d.date}
            className={`day ${selected === d.date ? 'selected' : ''} ${full ? 'full' : ''}`}
            onClick={() => onSelect(d.date)}
          >
            <strong>{d.label}</strong>
            <small>{full ? 'Fully booked' : `${d.availableSlots} slots`}</small>
          </button>
        );
      })}
    </div>
  );
}
