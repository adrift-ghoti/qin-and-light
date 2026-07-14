import { useStore } from '../state/store';
import { HUI_POSITIONS } from '../model/guqin';
import { activeNotePerString, sampleSlide, slideTrail } from '../model/lightEffect';

const STRING_ENDPOINTS = [
  { y1: -21.6, y2: -9 },
  { y1: -14.4, y2: -6 },
  { y1: -7.2, y2: -3 },
  { y1: 0, y2: 0 },
  { y1: 7.2, y2: 3 },
  { y1: 14.4, y2: 6 },
  { y1: 21.6, y2: 9 },
] as const;
// X1=岳山端(position=0), X2=龍齦端(position=1)
const X1 = 363, X2 = -22;

function pt(stringIdx: number, position: number) {
  const { y1, y2 } = STRING_ENDPOINTS[stringIdx];
  return { x: X1 + (X2 - X1) * position, y: y1 + (y2 - y1) * position };
}

const TRAIL_SEC = 0.3;
const GHOST_BRIGHTNESS = 0.4;

export function GuqinDisplay() {
  const notes = useStore(s => s.notes);
  const currentTime = useStore(s => s.currentTime);

  const active = activeNotePerString(notes, currentTime);

  return (
    <div className="panel display-panel">
      <div className="panel-label">展示區</div>
      <div className="display-stage">
        <img src="/guqin-vector.svg" width={480} height={160} alt="古琴" />
        <svg viewBox="0 0 480 160" width={480} height={160} className="display-overlay">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g transform="translate(45.5,80)">
            {Array.from(active.entries()).map(([stringNum, { note, elapsed, brightness }]) => {
              const si = stringNum - 1;
              const { y1, y2 } = STRING_ENDPOINTS[si];
              const x1s = X1 + (X2 - X1) * 0;
              const x2s = X2;

              if (note.type === 'san') {
                return (
                  <line
                    key={note.id}
                    x1={x1s} y1={y1} x2={x2s} y2={y2}
                    stroke="#ffe066"
                    strokeWidth={3}
                    strokeOpacity={brightness}
                    filter="url(#glow)"
                  />
                );
              }

              if (note.type === 'fan') {
                const huiPos = HUI_POSITIONS[(note.hui ?? 7) - 1];
                const { x, y } = pt(si, huiPos);
                return (
                  <circle key={note.id} cx={x} cy={y} r={7}
                    fill="#ffe066" opacity={brightness} filter="url(#glow)" />
                );
              }

              // 按音
              const slide = note.slide ?? [];
              const position = slide.length > 0
                ? sampleSlide(slide, elapsed)
                : (note.position ?? 0.5);
              const { x, y } = pt(si, position);

              const trail = slide.length > 0 ? slideTrail(slide, elapsed, TRAIL_SEC) : [];

              return (
                <g key={note.id}>
                  {trail.map((tp, i) => {
                    const tp2 = pt(si, tp.position);
                    return (
                      <circle key={i} cx={tp2.x} cy={tp2.y} r={3}
                        fill="#ffe066"
                        opacity={tp.opacity * brightness * GHOST_BRIGHTNESS}
                      />
                    );
                  })}
                  <circle cx={x} cy={y} r={6}
                    fill="#ffe066" opacity={brightness} filter="url(#glow)" />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
