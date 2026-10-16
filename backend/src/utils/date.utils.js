/**
 * Date utility functions
 */

const isValidISODate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // Match YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
};

const getMonthRange = (year, month) => {
  // month is 1-indexed (1 = Jan, 12 = Dec)
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  return { startStr, endStr };
};

const getCurrentMonthKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

module.exports = {
  isValidISODate,
  getMonthRange,
  getCurrentMonthKey,
};
