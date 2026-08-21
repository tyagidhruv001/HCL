export function formatDuration(hoursStr) {
  const h = parseInt(hoursStr) || 0;
  if (h >= 24) {
    const days = Math.round(h / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  return `${h}h`;
}

export function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString();
}
