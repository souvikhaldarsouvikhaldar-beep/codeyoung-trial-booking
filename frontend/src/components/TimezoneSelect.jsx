import { useMemo } from 'react';

const COMMON = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Dublin', 'Asia/Kolkata', 'Asia/Dubai',
  'Asia/Singapore', 'Australia/Sydney',
];

export default function TimezoneSelect({ value, onChange }) {
  const zones = useMemo(() => {
    const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : COMMON;
    const rest = all.filter((z) => !COMMON.includes(z) && z !== value);
    return { common: [...new Set([value, ...COMMON])], rest };
  }, [value]);

  return (
    <label className="field">
      <span>Your time zone</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <optgroup label="Common">
          {zones.common.map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
          ))}
        </optgroup>
        <optgroup label="All time zones">
          {zones.rest.map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
