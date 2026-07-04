import { useStore } from '../state/store';
import { isNoteComplete } from '../model/types';
import { HUI_POSITIONS } from '../model/guqin';

// 散音無按點,光點固定放在岳山(position=0)與一徽的中點,示意「整弦振動」而非某個具體按點。
const SAN_MARKER_POSITION = HUI_POSITIONS[0] / 2;

const STRING_ENDPOINTS = [
  { y1: -21.6, y2: -9 },
  { y1: -14.4, y2: -6 },
  { y1: -7.2, y2: -3 },
  { y1: 0, y2: 0 },
  { y1: 7.2, y2: 3 },
  { y1: 14.4, y2: 6 },
  { y1: 21.6, y2: 9 },
] as const;
const X1 = 363; // position 0(岳山木塊內緣,徽位換算基準——非弦線段本身端點 x=379)
const X2 = -22;  // position 1(龍齦端)

function markerPoint(stringIndex: number, position: number): { x: number; y: number } {
  const { y1, y2 } = STRING_ENDPOINTS[stringIndex];
  return { x: X1 + (X2 - X1) * position, y: y1 + (y2 - y1) * position };
}

export function GuqinDisplay() {
  const notes = useStore((s) => s.notes);
  const complete = notes.filter(isNoteComplete);

  return (
    <div style={{ position: 'relative', width: 480, height: 160 }}>
      <img src="/guqin-vector.svg" width={480} height={160} alt="古琴" />
      <svg
        viewBox="0 0 480 160" width={480} height={160}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <g transform="translate(45.5,80)">
          {complete.map((n) => {
            const pos = n.type === 'san' ? SAN_MARKER_POSITION : (n.position ?? 0.5);
            const { x, y } = markerPoint(n.string! - 1, pos);
            return <circle key={n.id} cx={x} cy={y} r={4} fill="#ffe066" opacity={0.9} />;
          })}
        </g>
      </svg>
    </div>
  );
}
