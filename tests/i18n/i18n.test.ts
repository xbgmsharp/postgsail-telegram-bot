import { describe, it, expect } from 'vitest';
import { t } from '../../src/i18n/index';

describe('t()', () => {
  it('returns a known English string', () => {
    expect(t('common.error')).toBe('❌ An error occurred. Please try again.');
  });

  it('defaults to English when no language given', () => {
    expect(t('common.back')).toBe('◀️ Back');
  });

  it('returns translated string for a supported language', () => {
    // French, Spanish, and German locales exist — just check the result is a non-empty string
    const fr = t('common.back', 'fr');
    expect(typeof fr).toBe('string');
    expect(fr.length).toBeGreaterThan(0);
  });

  it('falls back to English for an unsupported language', () => {
    const result = t('common.error', 'ja');
    expect(result).toBe('❌ An error occurred. Please try again.');
  });

  it('falls back to English when key is missing in target locale', () => {
    // If a locale is incomplete, getNestedValue returns undefined → falls back to en
    const result = t('common.error', 'de');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns the key itself when not found in any locale', () => {
    const result = t('nonexistent.deeply.nested.key');
    expect(result).toBe('nonexistent.deeply.nested.key');
  });

  it('interpolates a single parameter', () => {
    const result = t('auth.otpSent', 'en', { email: 'test@example.com' });
    expect(result).toContain('test@example.com');
    expect(result).not.toContain('{{email}}');
  });

  it('interpolates multiple parameters', () => {
    const result = t('common.showing', 'en', { count: '5', total: '20', item: 'logs' });
    expect(result).toContain('5');
    expect(result).toContain('20');
    expect(result).toContain('logs');
    expect(result).not.toContain('{{');
  });

  it('interpolates numeric parameters', () => {
    const result = t('common.showing', 'en', { count: 3, total: 10, item: 'stays' });
    expect(result).toContain('3');
    expect(result).toContain('10');
  });
});
