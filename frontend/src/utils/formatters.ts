const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

export function formatDate(date: Date | string | number, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    if (IS_DEV) {
      console.warn('[formatters] Invalid date provided to formatDate');
    }
    return '';
  }

  switch (format) {
    case 'short': {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
    }
    case 'long': {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
    case 'relative': {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    }
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 0) {
    if (IS_DEV) {
      console.warn('[formatters] Negative duration provided to formatDuration');
    }
    return '0 min';
  }

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    if (IS_DEV) {
      console.warn('[formatters] Failed to format currency');
    }
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatPercentage(value: number, decimals = 0): string {
  if (value < 0 || value > 100) {
    if (IS_DEV) {
      console.warn('[formatters] Percentage out of range in formatPercentage');
    }
  }
  return `${value.toFixed(decimals)}%`;
}
