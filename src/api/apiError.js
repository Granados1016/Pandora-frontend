export const apiError = (e, fallback) => {
  const d = e.response?.data;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  return d.title || d.detail || fallback;
};
