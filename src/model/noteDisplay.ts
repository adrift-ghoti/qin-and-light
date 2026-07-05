import { Note } from './types';
import { EditingField } from '../state/store';

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
  return note.huiNotation ?? (note.position !== undefined ? note.position.toFixed(2) : '?');
}
