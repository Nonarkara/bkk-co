// Trust boundary for POST /api/scores. Pure, so test/check.mjs can import it.
export const FIELDS = ['wifi', 'power', 'quiet', 'laptop'];

export function validateScore(body, knownIds) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'body must be an object' };
  const id = body.place;
  if (typeof id !== 'string' || !/^(?:[nwr]\d{1,12}|o[0-9a-f]{12}|h\d{4})$/.test(id) || !knownIds.has(id)) return { error: 'unknown place' };
  const out = { place: id };
  for (const f of FIELDS) {
    const v = body[f];
    if (!Number.isInteger(v) || v < 1 || v > 3) return { error: `${f} must be 1, 2 or 3` };
    out[f] = v;
  }
  const extra = Object.keys(body).filter(k => k !== 'place' && !FIELDS.includes(k));
  if (extra.length) return { error: `unexpected field ${extra[0]}` };
  return { value: out };
}
