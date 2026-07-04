import { useStore } from '../state/store';
import { isNoteComplete } from '../model/types';

const TYPE_LABEL: Record<string, string> = { san: '散音', fan: '泛音', an: '按音' };

export function Timeline() {
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const selectNote = useStore((s) => s.selectNote);
  const removeNote = useStore((s) => s.removeNote);

  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="timeline">
      <h3>音清單({notes.length})</h3>
      <ul>
        {sorted.map((n) => (
          <li
            key={n.id}
            onClick={() => selectNote(n.id)}
            style={{
              fontWeight: n.id === selectedId ? 'bold' : 'normal',
              color: isNoteComplete(n) ? undefined : '#e08',
            }}
          >
            {n.startTime.toFixed(2)}s — 第{n.string ?? '?'}弦 — {TYPE_LABEL[n.type]}
            {n.position !== undefined && ` @ ${n.huiNotation ?? n.position.toFixed(2)}`}
            {!isNoteComplete(n) && ' (未完成)'}
            <button onClick={(e) => { e.stopPropagation(); removeNote(n.id); }}>刪除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
