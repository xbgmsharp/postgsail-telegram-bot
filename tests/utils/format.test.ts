import { describe, it, expect } from 'vitest';
import { formatDuration } from '../../src/utils/format';

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration('PT2H30M')).toBe('2h 30m');
  });

  it('formats days, hours, and minutes', () => {
    expect(formatDuration('P1DT2H30M')).toBe('1d 2h 30m');
  });

  it('formats hours only', () => {
    expect(formatDuration('PT5H')).toBe('5h');
  });

  it('formats minutes only', () => {
    expect(formatDuration('PT45M')).toBe('45m');
  });

  it('formats days only', () => {
    expect(formatDuration('P3D')).toBe('3d');
  });

  it('ignores seconds', () => {
    expect(formatDuration('PT1H30M15S')).toBe('1h 30m');
  });

  it('returns "< 1m" for zero duration', () => {
    expect(formatDuration('PT0S')).toBe('< 1m');
  });

  it('returns original string when format is unrecognized', () => {
    expect(formatDuration('not-an-interval')).toBe('not-an-interval');
  });

  it('formats days without time component', () => {
    expect(formatDuration('P2D')).toBe('2d');
  });
});
