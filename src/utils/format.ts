

// Helper function to format PostgreSQL interval duration
function formatDuration(interval: string): string {
  try {
    // PostgreSQL interval format: PT2H30M15S or P1DT2H30M
    const match = interval.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!match) return interval;
    
    const days = parseInt(match[1] || '0');
    const hours = parseInt(match[2] || '0');
    const minutes = parseInt(match[3] || '0');
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : '< 1m';
  } catch {
    return interval;
  }
}

export { formatDuration };

