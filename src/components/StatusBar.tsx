import { useStore } from '../state/store';

const TYPE_LABEL: Record<string, string> = { san: '散音', fan: '泛音', an: '按音' };
const FIELD_LABEL: Record<string, string> = { string: '弦號', position: '按點/徽位' };

export function StatusBar() {
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const editingField = useStore((s) => s.editingField);
  const editBuffer = useStore((s) => s.editBuffer);

  const selected = notes.find((n) => n.id === selectedId);

  if (!selected) {
    return <div className="status-bar">未選中音 — 按 S/F/A 插入散音/泛音/按音</div>;
  }

  return (
    <div className="status-bar">
      選中:{selected.startTime.toFixed(2)}s {TYPE_LABEL[selected.type]} 第{selected.string ?? '?'}弦
      {editBuffer !== '' && (
        <span> — 編輯中:{FIELD_LABEL[editingField]} = {editBuffer}_</span>
      )}
    </div>
  );
}
