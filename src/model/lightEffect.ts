import { Note, EnvelopePoint, SlidePoint } from './types';
import { isNoteComplete } from './types';

/** 在 EnvelopePoint[] 中對時間 t 做線性插值，超出範圍回傳 0 */
export function sampleAdsr(adsr: EnvelopePoint[], t: number): number {
  if (adsr.length === 0) return 0;
  if (t < adsr[0].t) return 0;
  if (t >= adsr[adsr.length - 1].t) return 0;
  for (let i = 1; i < adsr.length; i++) {
    if (t <= adsr[i].t) {
      const a = adsr[i - 1], b = adsr[i];
      const ratio = (t - a.t) / (b.t - a.t);
      return a.level + (b.level - a.level) * ratio;
    }
  }
  return 0;
}

export interface ActiveNote { note: Note; elapsed: number; brightness: number; }

/**
 * 給定所有 notes 與 currentTime，回傳每條弦「當前作用中音」(Map key=弦號 1-7)。
 * 同弦取 startTime <= currentTime 中最晚的那個（同弦新音切斷前音）。
 * 若 ADSR 已結束（elapsed > 最後一個控制點的 t）則不渲染。
 */
export function activeNotePerString(
  notes: Note[],
  currentTime: number,
): Map<number, ActiveNote> {
  const result = new Map<number, ActiveNote>();
  for (const note of notes) {
    if (!isNoteComplete(note)) continue;
    if (note.string === undefined) continue;
    if (note.startTime > currentTime) continue;
    const elapsed = currentTime - note.startTime;
    const prev = result.get(note.string);
    if (!prev || note.startTime > prev.note.startTime) {
      const brightness = sampleAdsr(note.adsr, elapsed);
      if (brightness > 0) {
        result.set(note.string, { note, elapsed, brightness });
      } else {
        // ADSR 結束，確保不顯示舊的
        result.delete(note.string);
      }
    }
  }
  return result;
}

/** 依 SlidePoint[] 線性插值取得 t 時刻的 position；超出範圍夾邊 */
export function sampleSlide(slide: SlidePoint[], t: number): number {
  if (slide.length === 0) return 0;
  if (t <= slide[0].t) return slide[0].position;
  if (t >= slide[slide.length - 1].t) return slide[slide.length - 1].position;
  for (let i = 1; i < slide.length; i++) {
    if (t <= slide[i].t) {
      const a = slide[i - 1], b = slide[i];
      const ratio = (t - a.t) / (b.t - a.t);
      return a.position + (b.position - a.position) * ratio;
    }
  }
  return slide[slide.length - 1].position;
}

/** 取得 elapsed 之前 trailSec 秒的拖尾樣本（每 25ms 一點），用於虛音渲染 */
export function slideTrail(
  slide: SlidePoint[],
  elapsed: number,
  trailSec: number,
): { position: number; opacity: number }[] {
  if (slide.length === 0) return [];
  const result: { position: number; opacity: number }[] = [];
  const step = 0.025;
  for (let age = step; age <= trailSec; age += step) {
    const t = elapsed - age;
    const position = sampleSlide(slide, t);
    const opacity = 1 - age / trailSec;
    result.push({ position, opacity });
  }
  return result;
}
