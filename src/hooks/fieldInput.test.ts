import { describe, it, expect } from 'vitest';
import { appendDigit } from './fieldInput';

describe('appendDigit', () => {
  it('string field keeps only the latest single digit 1-7', () => {
    expect(appendDigit('', '4', 'string')).toBe('4');
    expect(appendDigit('4', '9', 'string')).toBe('4'); // 9 不合法,維持原值
  });

  it('position field accumulates digits and a decimal point', () => {
    expect(appendDigit('', '7', 'position')).toBe('7');
    expect(appendDigit('7', '.', 'position')).toBe('7.');
    expect(appendDigit('7.', '6', 'position')).toBe('7.6');
  });
});
