import { useStore } from '../state/store';
import { isNoteComplete } from '../model/types';
import { displayStringField, displayPositionField } from '../model/noteDisplay';

const TYPE_LABEL: Record<string, string> = { san: '散音', fan: '泛音', an: '按音' };

export function Timeline() {
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const editingField = useStore((s) => s.editingField);
  const editBuffer = useStore((s) => s.editBuffer);
  const selectNote = useStore((s) => s.selectNote);
  const removeNote = useStore((s) => s.removeNote);

  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="panel list-panel timeline">
      <div className="panel-label">音清單({notes.length})</div>
      <ul>
        {sorted.map((n) => {
          const classNames = [
            n.id === selectedId ? 'selected' : '',
            isNoteComplete(n) ? '' : 'incomplete',
          ].filter(Boolean).join(' ');
          return (
            <li key={n.id} onClick={() => selectNote(n.id)} className={classNames || undefined}>
              {n.startTime.toFixed(2)}s — 第{displayStringField(n, selectedId, editingField, editBuffer)}弦 — {TYPE_LABEL[n.type]}
              {n.type !== 'san' && ` @ ${displayPositionField(n, selectedId, editingField, editBuffer)}`}
              {!isNoteComplete(n) && ' (未完成)'}
              <button className="btn" onClick={(e) => { e.stopPropagation(); removeNote(n.id); }}>刪除</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
