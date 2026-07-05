import { Note } from './types';
import { EditingField } from '../state/store';
import { positionToHuiNotation } from './guqin';

/**
 * 選中音的弦號/徽位顯示邏輯,供 StatusBar 與 Timeline 共用:
 * 若這個音正在被編輯且緩衝字串非空,顯示緩衝字串(即時反映打字中的內容,不等 Enter 確認);
 * 否則顯示已確認的值。
 */
export function displayStringField(
  note: Note,
  selectedId: string | null,
  editingField: EditingField,
  editBuffer: string,
): string {
  if (note.id === selectedId && editingField === 'string' && editBuffer !== '') return editBuffer;
  return String(note.string ?? '?');
}

export function displayPositionField(
  note: Note,
  selectedId: string | null,
  editingField: EditingField,
  editBuffer: string,
): string {
  if (note.id === selectedId && editingField === 'position' && editBuffer !== '') return editBuffer;
  // 按音在 PositionStrip 上點擊設定位置時走 setNotePosition,不會有 huiNotation 原文
  // (見 store.ts setNotePosition)。沒有原文時一律把 position 換算回徽分記法顯示,
  // 而不是顯示正規化弦長小數,讓點擊設定與鍵盤打徽分記法看起來是同一套記譜方式。
  if (note.huiNotation !== undefined) return note.huiNotation;
  return note.position !== undefined ? positionToHuiNotation(note.position) : '?';
}
