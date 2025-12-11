
import { PeriodFilter } from '../types';

export const getDateRange = (period: PeriodFilter, customStart?: string, customEnd?: string) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  // Reset time boundaries by default
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'this_month':
      start.setDate(1);
      break;
    case 'last_month':
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_quarter':
      start.setMonth(Math.floor(start.getMonth() / 3) * 3);
      start.setDate(1);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      break;
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all_time':
      start = new Date(2020, 0, 1);
      break;
    case 'custom':
      if (customStart) {
        // Fix: Parse YYYY-MM-DD manually to ensure local time is used
        const [y, m, d] = customStart.split('-').map(Number);
        start = new Date(y, m - 1, d);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        // Fix: Parse YYYY-MM-DD manually to ensure local time is used
        const [y, m, d] = customEnd.split('-').map(Number);
        end = new Date(y, m - 1, d);
        end.setHours(23, 59, 59, 999);
      }
      break;
  }
  return { start, end };
};
