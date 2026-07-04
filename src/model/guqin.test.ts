import { describe, it, expect } from 'vitest';
import {
  STRING_COUNT, HUI_POSITIONS, huiToPosition, nearestHui, parseHuiNotation,
} from './guqin';

describe('guqin constants', () => {
  it('has seven strings and thirteen hui', () => {
    expect(STRING_COUNT).toBe(7);
    expect(HUI_POSITIONS).toHaveLength(13);
  });

  it('matches theoretical hui ratios (岳山到龍齦的簡單整數比)', () => {
    expect(HUI_POSITIONS[0]).toBeCloseTo(1 / 8, 5);   // 一徽
    expect(HUI_POSITIONS[6]).toBeCloseTo(1 / 2, 5);   // 七徽,弦正中點
    expect(HUI_POSITIONS[12]).toBeCloseTo(7 / 8, 5);  // 十三徽
  });

  it('huiToPosition maps hui number (1-13) to normalized position', () => {
    expect(huiToPosition(7)).toBeCloseTo(0.5, 5);
    expect(huiToPosition(1)).toBeCloseTo(0.125, 5);
  });

  it('nearestHui finds the closest hui to a normalized position', () => {
    expect(nearestHui(0.52)).toBe(7);
    // 0.15 與二徽(1/6≈0.1667,距離≈0.0167)比一徽(1/8=0.125,距離0.025)更近,故最近徽位是 2。
    expect(nearestHui(0.15)).toBe(2);
  });

  it('parseHuiNotation converts "N.f" hui-fen notation to normalized position', () => {
    // 7.6 = 第七徽往第八徽方向走十分之六
    const expected = HUI_POSITIONS[6] + 0.6 * (HUI_POSITIONS[7] - HUI_POSITIONS[6]);
    expect(parseHuiNotation('7.6')).toBeCloseTo(expected, 5);
    expect(parseHuiNotation('7')).toBeCloseTo(HUI_POSITIONS[6], 5);
    expect(parseHuiNotation('7.0')).toBeCloseTo(HUI_POSITIONS[6], 5);
  });

  it('parseHuiNotation extends beyond the 13th hui towards 龍齦(position=1),供徽外按音使用', () => {
    // 13.5 = 十三徽往龍齦(position=1,視為虛擬的「第十四徽」)方向走十分之五
    const expected13 = HUI_POSITIONS[12] + 0.5 * (1 - HUI_POSITIONS[12]);
    expect(parseHuiNotation('13.5')).toBeCloseTo(expected13, 5);
    expect(parseHuiNotation('13.9')).toBeLessThan(1);
    expect(parseHuiNotation('13.9')).toBeGreaterThan(HUI_POSITIONS[12]);
  });

  it('parseHuiNotation throws on out-of-range hui', () => {
    expect(() => parseHuiNotation('14.5')).toThrow();
    expect(() => parseHuiNotation('0.5')).toThrow();
  });
});
