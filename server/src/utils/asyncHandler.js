export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res) => res.status(404).json({ ok: false, error: 'Not found' });

export function errorHandler(err, req, res, _next) {
  // eslint-disable-next-line no-console
  console.error('[MAUSAM] unhandled route error:', err?.message);
  res.status(500).json({ ok: false, error: 'Internal server error', detail: err?.message });
}