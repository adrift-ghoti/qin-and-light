import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';
import { createPlaceholderNote } from '../model/notes';

describe('store', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('adds and removes notes', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'san' });
    useStore.getState().addNote(n);
    expect(useStore.getState().notes).toHaveLength(1);
    useStore.getState().removeNote(n.id);
    expect(useStore.getState().notes).toHaveLength(0);
  });

  it('selects a note and defaults editing field to string', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'san' });
    useStore.getState().addNote(n);
    useStore.getState().selectNote(n.id);
    expect(useStore.getState().selectedId).toBe(n.id);
    expect(useStore.getState().editingField).toBe('string');
  });

  it('updates the string field of a note', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'san' });
    useStore.getState().addNote(n);
    useStore.getState().setNoteString(n.id, 4);
    expect(useStore.getState().notes[0].string).toBe(4);
  });

  it('sets position/hui from a hui-fen notation string', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'an' });
    useStore.getState().addNote(n);
    useStore.getState().setNoteHuiNotation(n.id, '7.6');
    const updated = useStore.getState().notes[0];
    expect(updated.huiNotation).toBe('7.6');
    expect(updated.position).toBeGreaterThan(0);
  });

  it('setNotePosition writes position directly and clears huiNotation, bypassing hui-fen parsing', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'an' });
    useStore.getState().addNote(n);
    useStore.getState().setNoteHuiNotation(n.id, '7.6'); // 先給一個徽分記法
    useStore.getState().setNotePosition(n.id, 0.42);      // 按音點擊路徑改走這裡
    const updated = useStore.getState().notes[0];
    expect(updated.position).toBe(0.42);
    expect(updated.huiNotation).toBeUndefined();
  });

  it('rejects a fan note given a hui-fen notation with a nonzero decimal', () => {
    // 泛音只能落在整數徽位;帶小數(如 "7.6")會讓 position 與 hui 互相矛盾。
    const n = createPlaceholderNote({ startTime: 1, type: 'fan' });
    useStore.getState().addNote(n);
    expect(() => useStore.getState().setNoteHuiNotation(n.id, '7.6')).toThrow();
    expect(useStore.getState().notes[0]).toEqual(n); // 失敗時 note 不變
  });

  it('tracks the in-progress keyboard edit buffer for StatusBar display', () => {
    // 2026-07-04 定案(施作注意事項 B7):快捷鍵打字的緩衝字串要能被 UI 訂閱顯示,
    // 不能只存在 useGlobalShortcuts 的 ref 裡。
    useStore.getState().setEditBuffer('7.');
    expect(useStore.getState().editBuffer).toBe('7.');
    useStore.getState().reset();
    expect(useStore.getState().editBuffer).toBe('');
  });
});
