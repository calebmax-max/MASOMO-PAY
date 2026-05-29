export function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function calculateBalance(student = {}) {
  return Number(student.balance || 0);
}
