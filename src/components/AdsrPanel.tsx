import { useStore } from '../state/store';
import { CurveEditor, CurvePoint } from './CurveEditor';
import { EnvelopePoint } from '../model/types';

function toCurve(adsr: EnvelopePoint[]): CurvePoint[] {
  return adsr.map(p => ({ t: p.t, value: p.level }));
}
function fromCurve(pts: CurvePoint[]): EnvelopePoint[] {
  return pts.map(p => ({ t: p.t, level: p.value }));
}

export function AdsrPanel() {
  const selectedId = useStore(s => s.selectedId);
  const notes = useStore(s => s.notes);
  const setNoteAdsr = useStore(s => s.setNoteAdsr);

  const note = notes.find(n => n.id === selectedId);

  if (!note) {
    return (
      <div className="panel" style={{ flex: 1 }}>
        <div className="panel-label">包絡(ADSR)</div>
        <div style={{ padding: '12px 16px', color: 'var(--ink-soft)', fontSize: 13 }}>選中一個音以編輯包絡</div>
      </div>
    );
  }

  const lastAdsr = note.adsr[note.adsr.length - 1];
  const xEnd = Math.max(2, (lastAdsr?.t ?? 2) + 0.3);

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-label">包絡(ADSR) — {note.type === 'san' ? '散音' : note.type === 'fan' ? '泛音' : '按音'}</div>
      <CurveEditor
        points={toCurve(note.adsr)}
        onChange={pts => setNoteAdsr(note.id, fromCurve(pts))}
        yLabel="亮度"
        xRange={[0, xEnd]}
        yRange={[0, 1]}
      />
    </div>
  );
}
