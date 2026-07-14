import { useStore } from '../state/store';

const TYPE_LABEL = { san: '散音', fan: '泛音', an: '按音' } as const;

export function NoteInspector() {
  const selectedId = useStore(s => s.selectedId);
  const notes = useStore(s => s.notes);
  const setNoteJianzipu = useStore(s => s.setNoteJianzipu);

  const note = notes.find(n => n.id === selectedId);

  if (!note) {
    return (
      <div className="panel" style={{ padding: '10px 16px' }}>
        <div className="panel-label">音符詳情</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>選中一個音以查看詳情</div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="panel-label">音符詳情</div>
      <div style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span><b>音色：</b>{TYPE_LABEL[note.type]}</span>
        <span><b>弦：</b>{note.string ?? '—'}</span>
        <span><b>位置：</b>{note.huiNotation ?? (note.position !== undefined ? note.position.toFixed(3) : '—')}</span>
        <span><b>時間：</b>{note.startTime.toFixed(3)}s</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 13, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>減字譜：</label>
        <input
          type="text"
          value={note.jianzipu ?? ''}
          onChange={e => setNoteJianzipu(note.id, e.target.value)}
          placeholder="（可選）輸入減字譜記號"
          style={{
            flex: 1, border: '1px solid var(--border)', borderRadius: 4,
            padding: '4px 8px', fontSize: 13, background: 'var(--bg)',
            color: 'var(--ink)', fontFamily: 'var(--serif)',
          }}
        />
      </div>
    </div>
  );
}
