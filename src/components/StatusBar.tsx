import { useStore } from '../state/store';
import { displayStringField, displayPositionField } from '../model/noteDisplay';

const TYPE_LABEL: Record<string, string> = { san: '散音', fan: '泛音', an: '按音' };

export function StatusBar() {
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const editingField = useStore((s) => s.editingField);
  const editBuffer = useStore((s) => s.editBuffer);

  const selected = notes.find((n) => n.id === selectedId);

  if (!selected) {
    return <div className="status-bar">未選中音 — 按 S/F/A 插入散音/泛音/按音</div>;
  }

  const stringDisplay = displayStringField(selected, selectedId, editingField, editBuffer);
  const positionDisplay = displayPositionField(selected, selectedId, editingField, editBuffer);

  return (
    <div className="status-bar">
      選中:{selected.startTime.toFixed(2)}s {TYPE_LABEL[selected.type]}{' '}
      <span style={{ textDecoration: editingField === 'string' ? 'underline' : undefined }}>
        {stringDisplay}
      </span>
      弦
      {selected.type !== 'san' && (
        <>
          {' '}
          <span style={{ textDecoration: editingField === 'position' ? 'underline' : undefined }}>
            {positionDisplay}
          </span>
          徽
        </>
      )}
    </div>
  );
}
