

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

/**
 * Convert LLM-generated standard Markdown to Telegram Markdown v1.
 * Telegram v1 supports: *bold*, _italic_, `code`, ```pre```, [text](url)
 * It does NOT support: ### headers, --- rules, **bold**, __italic__
 */
function toTelegramMarkdown(text: string): string {
  return text
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Convert ### / ## / # headings → *bold*
    .replace(/^#{1,3}\s+(.+)$/gm, '*$1*')
    // Convert **bold** → *bold*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // Convert __italic__ → _italic_
    .replace(/__(.+?)__/g, '_$1_')
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export { formatDuration, toTelegramMarkdown };

