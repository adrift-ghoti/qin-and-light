import { describe, it, expect } from 'vitest';
import { displayStringField, displayPositionField } from './noteDisplay';
import { createPlaceholderNote } from './notes';

describe('displayStringField', () => {
  it('shows the committed string when the note is not selected', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'san' });
    n.string = 3;
    expect(displayStringField(n, 'other-id', 'string', '5')).toBe('3');
  });

  it('shows the committed string when selected but editing a different field', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'an' });
    n.string = 3;
    expect(displayStringField(n, n.id, 'position', '5')).toBe('3');
  });

  it('shows the committed string when selected and editing this field but buffer is empty', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'san' });
    n.string = 3;
    expect(displayStringField(n, n.id, 'string', '')).toBe('3');
  });

  it('shows the live buffer when selected and editing this field with a non-empty buffer', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'san' });
    n.string = 3;
    expect(displayStringField(n, n.id, 'string', '5')).toBe('5');
  });

  it('falls back to "?" when string is unset and not being edited', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'san' });
    expect(displayStringField(n, 'other-id', 'string', '')).toBe('?');
  });
});

describe('displayPositionField', () => {
  it('shows the committed hui notation when the note is not selected', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'an' });
    n.huiNotation = '7.6';
    n.position = 0.55;
    expect(displayPositionField(n, 'other-id', 'position', '3')).toBe('7.6');
  });

  it('shows the live buffer when selected and editing the position field with a non-empty buffer', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'an' });
    n.huiNotation = '7.6';
    n.position = 0.55;
    expect(displayPositionField(n, n.id, 'position', '9.')).toBe('9.');
  });

  it('falls back to numeric position when no hui notation is set', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'an' });
    n.position = 0.5;
    expect(displayPositionField(n, 'other-id', 'position', '')).toBe('0.50');
  });

  it('falls back to "?" when position is unset and not being edited', () => {
    const n = createPlaceholderNote({ startTime: 0, type: 'an' });
    expect(displayPositionField(n, 'other-id', 'position', '')).toBe('?');
  });
});
