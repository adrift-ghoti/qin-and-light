import { useState } from 'react';
import { useStore } from '../state/store';
import { CurveEditor, CurvePoint } from './CurveEditor';
import { SlidePoint } from '../model/types';

function toCurve(slide: SlidePoint[]): CurvePoint[] {
  return slide.map(p => ({ t: p.t, value: p.position }));
}

export function SlidePathPanel() {
  const selectedId = useStore(s => s.selectedId);
  const notes = useStore(s => s.notes);
  const setNoteSlide = useStore(s => s.setNoteSlide);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [anchorSel, setAnchorSel] = useState(false);

  const note = notes.find(n => n.id === selectedId);

  if (!note) {
    return (
      <div className="panel" style={{ flex: 1 }}>
        <div className="panel-label">走手音路徑(僅按音)</div>
        <div style={{ padding: '12px 16px', color: 'var(--ink-soft)', fontSize: 13 }}>選中一個按音以編輯走手音</div>
      </div>
    );
  }

  if (note.type !== 'an') {
    return (
      <div className="panel" style={{ flex: 1 }}>
        <div className="panel-label">走手音路徑(僅按音)</div>
        <div style={{ padding: '12px 16px', color: 'var(--ink-soft)', fontSize: 13 }}>
          {note.type === 'san' ? '散音無走手音' : '泛音無走手音'}
        </div>
      </div>
    );
  }

  const slide = note.slide ?? [];
  const anchor: CurvePoint | undefined = note.position !== undefined
    ? { t: 0, value: note.position }
    : undefined;

  // xRange 基於現有點的範圍
  const allT = slide.map(p => p.t);
  const minT = Math.min(-0.5, ...(allT.length ? allT : [0]));
  const maxT = Math.max(3, ...(allT.length ? allT : [0]));

  function onChange(pts: CurvePoint[]) {
    // 手動拖曳時清空 techniqueId
    const next: SlidePoint[] = pts.map(p => ({ t: p.t, position: p.value }));
    setNoteSlide(note!.id, next);
  }

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-label">走手音路徑(按音) — 弦 {note.string ?? '?'}</div>
      {slide.length === 0 && (
        <div style={{ padding: '4px 16px 0', color: 'var(--ink-soft)', fontSize: 12 }}>
          在下方圖表點擊以加入控制點（空心圓為當前按音位置）
        </div>
      )}
      <CurveEditor
        points={toCurve(slide)}
        onChange={onChange}
        yLabel="位置"
        xRange={[minT, maxT]}
        yRange={[0, 1]}
        anchorPoint={anchor}
        selectedAnchor={anchorSel}
        onSelectAnchor={() => { setAnchorSel(true); setSelIdx(null); }}
        selectedIdx={selIdx}
        onSelectIdx={(i) => { setSelIdx(i); if (i !== null) setAnchorSel(false); }}
      />
    </div>
  );
}
