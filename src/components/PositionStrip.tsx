import { useRef } from 'react';
import { HUI_POSITIONS, nearestHui } from '../model/guqin';
import { useStore } from '../state/store';

const W = 800;
const H = 60;
const PAD_X = 20;

// position=0(岳山)畫在右邊、position=1(龍齦)畫在左邊,與 GuqinDisplay 的方向一致
// (GuqinDisplay 裡 X1=363/岳山 在較大的 x 座標、視覺上偏右,X2=-22/龍齦偏左)。
function positionX(pos: number): number {
  return W - PAD_X - (W - PAD_X * 2) * pos;
}

export function PositionStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const editingField = useStore((s) => s.editingField);
  const setNoteHuiNotation = useStore((s) => s.setNoteHuiNotation);
  const setNotePosition = useStore((s) => s.setNotePosition);

  const selected = notes.find((n) => n.id === selectedId);
  const active = !!selected && selected.type !== 'san' && editingField === 'position';

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!active || !selected) return;
    const rect = ref.current!.getBoundingClientRect();
    // 畫面上左右已反轉(position=0/岳山在右、position=1/龍齦在左),換算滑鼠位置時要對應反過來。
    const raw = 1 - (e.clientX - rect.left - PAD_X) / (rect.width - PAD_X * 2);
    const pos = Math.min(1, Math.max(0, raw));
    if (selected.type === 'fan') {
      // 泛音限整數徽位,走徽分記法解析(nearestHui 保證是合法整數,parseHuiNotation 不會 throw)。
      setNoteHuiNotation(selected.id, String(nearestHui(pos)));
    } else {
      // 按音:pos 是像 0.523 這種連續值,不是合法的徽分記法字串("N.f"),
      // 若丟給 setNoteHuiNotation/parseHuiNotation 會必定 throw。改走 setNotePosition
      // 直接寫入正規化位置,不經徽分解析(見 Task 5 的 setNotePosition)。
      setNotePosition(selected.id, pos);
    }
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        position: 'relative', width: W, height: H,
        background: active ? '#222' : '#111', opacity: active ? 1 : 0.5,
        cursor: active ? 'pointer' : 'default',
      }}
    >
      <div style={{ position: 'absolute', top: H / 2, left: PAD_X, right: PAD_X, height: 2, background: '#c8a96a' }} />
      {HUI_POSITIONS.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: positionX(p) - 3, top: H / 2 - 3,
          width: 6, height: 6, borderRadius: '50%', background: '#eee',
        }} title={`第${i + 1}徽`} />
      ))}
      {selected?.position !== undefined && (
        <div style={{
          position: 'absolute', left: positionX(selected.position) - 5, top: H / 2 - 5,
          width: 10, height: 10, borderRadius: '50%', background: '#ff5',
        }} />
      )}
    </div>
  );
}
