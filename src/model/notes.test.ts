import { describe, it, expect } from 'vitest';
import { createPlaceholderNote, DEFAULT_ADSR } from './notes';
import { isNoteComplete } from './types';

describe('createPlaceholderNote', () => {
  it('creates a note with only startTime/type set, string/position left undefined', () => {
    const a = createPlaceholderNote({ startTime: 1.5, type: 'san' });
    const b = createPlaceholderNote({ startTime: 1.5, type: 'san' });
    expect(a.id).not.toBe(b.id);
    expect(a.startTime).toBe(1.5);
    expect(a.type).toBe('san');
    expect(a.string).toBeUndefined();
    expect(a.position).toBeUndefined();
    expect(a.adsr).toEqual(DEFAULT_ADSR);
    expect(isNoteComplete(a)).toBe(false); // 未指定弦號,視為未完成
  });

  it('a san note is complete once a string is assigned', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'san' });
    n.string = 3;
    expect(isNoteComplete(n)).toBe(true); // 散音不需要 position
  });

  it('an an/fan note additionally needs a position to be complete', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'an' });
    n.string = 3;
    expect(isNoteComplete(n)).toBe(false);
    n.position = 0.5;
    expect(isNoteComplete(n)).toBe(true);
  });
});
