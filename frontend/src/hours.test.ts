import { describe, expect, it } from 'vitest';
import { HOUR_PRESETS, parseCustomHours } from './hours';

describe('HOUR_PRESETS', () => {
  it('are the quick choices', () => {
    expect([...HOUR_PRESETS]).toEqual([1, 2, 4, 8, 12]);
  });
});

describe('parseCustomHours', () => {
  it('accepts numbers from 0.01 to 24, with a dot or a comma', () => {
    expect(parseCustomHours('6.5')).toBe(6.5);
    expect(parseCustomHours('6,5')).toBe(6.5);
    expect(parseCustomHours(' 8 ')).toBe(8);
    expect(parseCustomHours('0.01')).toBe(0.01);
    expect(parseCustomHours('24')).toBe(24);
  });

  it('rejects everything else', () => {
    for (const text of ['', '  ', 'abc', '0', '-1', '24.01', '25', 'Infinity', 'NaN']) {
      expect(parseCustomHours(text), text).toBeNull();
    }
  });
});
