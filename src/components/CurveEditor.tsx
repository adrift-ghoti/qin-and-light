import { useRef, useState } from 'react';

export interface CurvePoint { t: number; value: number; }

interface Props {
  points: CurvePoint[];
  onChange: (pts: CurvePoint[]) => void;
  yLabel?: string;
  xRange?: [number, number];
  yRange?: [number, number];
  /** 永遠顯示但不可刪除的參考點（如走手音的隱含原點） */
  anchorPoint?: CurvePoint;
  selectedAnchor?: boolean;
  onSelectAnchor?: () => void;
  selectedIdx?: number | null;
  onSelectIdx?: (i: number | null) => void;
}

const W = 480, H = 130;
const PL = 30, PR = 12, PT = 12, PB = 26;

export function CurveEditor({
  points,
  onChange,
  yLabel = '亮度',
  xRange = [0, 2],
  yRange = [0, 1],
  anchorPoint,
  selectedAnchor = false,
  onSelectAnchor,
  selectedIdx: extSelIdx,
  onSelectIdx: extOnSelIdx,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [internalSelIdx, setInternalSelIdx] = useState<number | null>(null);
  const selIdx = extSelIdx !== undefined ? extSelIdx : internalSelIdx;
  const setSelIdx = (i: number | null) => {
    setInternalSelIdx(i);
    extOnSelIdx?.(i);
  };

  const dragRef = useRef<{ idx: number; pts: CurvePoint[] } | null>(null);
  const [draggingPts, setDraggingPts] = useState<CurvePoint[] | null>(null);
  const justDragged = useRef(false);

  const display = draggingPts ?? points;

  const IW = W - PL - PR, IH = H - PT - PB;
  const toX = (t: number) => PL + ((t - xRange[0]) / (xRange[1] - xRange[0])) * IW;
  const toY = (v: number) => H - PB - ((v - yRange[0]) / (yRange[1] - yRange[0])) * IH;
  const fromX = (x: number) => xRange[0] + ((x - PL) / IW) * (xRange[1] - xRange[0]);
  const fromY = (y: number) => yRange[0] + ((H - PB - y) / IH) * (yRange[1] - yRange[0]);

  function svgXY(e: React.MouseEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }

  const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  function onPtDown(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    setSelIdx(idx);
    onSelectAnchor && onSelectAnchor(); // deselect anchor if any
    dragRef.current = { idx, pts: display.slice() };
  }

  function onMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const { x, y } = svgXY(e);
    const updated = {
      t: cl(fromX(x), xRange[0], xRange[1]),
      value: cl(fromY(y), yRange[0], yRange[1]),
    };
    const next = dragRef.current.pts.slice();
    next[dragRef.current.idx] = updated;
    dragRef.current.pts = next;
    setDraggingPts(next);
  }

  function onUp() {
    if (dragRef.current) {
      const movedPt = dragRef.current.pts[dragRef.current.idx];
      const sorted = dragRef.current.pts.slice().sort((a, b) => a.t - b.t);
      const newIdx = sorted.indexOf(movedPt);
      setSelIdx(newIdx >= 0 ? newIdx : null);
      onChange(sorted);
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 50);
    }
    dragRef.current = null;
    setDraggingPts(null);
  }

  function onSvgClick(e: React.MouseEvent) {
    if (justDragged.current) return;
    const { x, y } = svgXY(e);
    const t = fromX(x), v = fromY(y);
    if (t < xRange[0] || t > xRange[1]) return;
    const newPt: CurvePoint = { t: cl(t, xRange[0], xRange[1]), value: cl(v, yRange[0], yRange[1]) };
    const next = [...display, newPt].sort((a, b) => a.t - b.t);
    onChange(next);
    setSelIdx(next.indexOf(newPt));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Delete' && selIdx !== null && display.length > 2) {
      e.preventDefault();
      onChange(display.filter((_, i) => i !== selIdx));
      setSelIdx(null);
    }
  }

  const linePoints = display.map(p => `${toX(p.t)},${toY(p.value)}`).join(' ');
  const zeroX = toX(0);
  const inBounds = (x: number) => x >= PL && x <= W - PR;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ cursor: 'crosshair', userSelect: 'none', display: 'block' }}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onClick={onSvgClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* 坐標軸 */}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="var(--border)" strokeWidth={1} />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--border)" strokeWidth={1} />
      {/* t=0 參考線 */}
      {inBounds(zeroX) && (
        <line x1={zeroX} y1={PT} x2={zeroX} y2={H - PB}
          stroke="var(--border-soft)" strokeWidth={1} strokeDasharray="3,3" />
      )}
      {/* 曲線填充 */}
      {display.length >= 2 && (
        <polyline
          points={`${toX(display[0].t)},${toY(yRange[0])} ${linePoints} ${toX(display[display.length - 1].t)},${toY(yRange[0])}`}
          fill="var(--gold)" fillOpacity={0.12} stroke="none"
        />
      )}
      {/* 曲線 */}
      <polyline points={linePoints} fill="none" stroke="var(--gold)" strokeWidth={2} />
      {/* 隱含原點（anchorPoint） */}
      {anchorPoint && (
        <circle
          cx={toX(anchorPoint.t)} cy={toY(anchorPoint.value)}
          r={6}
          fill="none"
          stroke={selectedAnchor ? 'var(--red)' : 'var(--border)'}
          strokeWidth={2}
          strokeDasharray="3,2"
          style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onSelectAnchor?.(); setSelIdx(null); }}
        />
      )}
      {/* 控制點 */}
      {display.map((p, i) => (
        <circle
          key={i}
          cx={toX(p.t)} cy={toY(p.value)}
          r={6}
          fill={selIdx === i ? 'var(--red)' : 'var(--gold)'}
          stroke="var(--panel)" strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onMouseDown={(e) => onPtDown(e, i)}
          onClick={(e) => { e.stopPropagation(); setSelIdx(i); onSelectAnchor && onSelectAnchor(); }}
        />
      ))}
      {/* 標籤 */}
      <text x={PL - 4} y={PT + 8} fontSize={9} fill="var(--ink-soft)" textAnchor="end">{yLabel}</text>
      {inBounds(zeroX) && (
        <text x={zeroX} y={H - 6} fontSize={9} fill="var(--ink-soft)" textAnchor="middle">0s</text>
      )}
      <text x={W - PR} y={PT + 8} fontSize={9} fill="var(--ink-soft)" textAnchor="end">點擊加點・Del刪</text>
    </svg>
  );
}
