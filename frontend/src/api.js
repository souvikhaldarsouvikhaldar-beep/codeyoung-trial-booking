export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new ApiError('NETWORK', 'We cannot reach the server right now. Please check your connection and try again.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error?.code || 'UNKNOWN', body.error?.message || 'Something went wrong. Please try again.', res.status);
  }
  return body;
}

export const api = {
  availability: (tz) => request(`/api/availability?tz=${encodeURIComponent(tz)}`),
  slots: (date, tz) => request(`/api/slots?date=${date}&tz=${encodeURIComponent(tz)}`),
  book: (payload) =>
    request('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
