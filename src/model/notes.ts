import { Note, NoteType, EnvelopePoint } from './types';

// 預設 ADSR:快起音、衰減到延音、結束釋放(相對秒數, 亮度 0..1)
export const DEFAULT_ADSR: EnvelopePoint[] = [
  { t: 0,    level: 0 },
  { t: 0.05, level: 1 },
  { t: 0.3,  level: 0.6 },
  { t: 1.0,  level: 0.5 },
  { t: 1.5,  level: 0 },
];

let counter = 0;
export function uid(): string {
  counter += 1;
  return `n_${Date.now().toString(36)}_${counter}`;
}

/** 鍵盤快捷鍵(S/F/A)建立的占位音:只帶時間與音色型別,其餘欄位待補 */
export function createPlaceholderNote(input: { startTime: number; type: NoteType }): Note {
  return {
    id: uid(),
    startTime: input.startTime,
    type: input.type,
    adsr: DEFAULT_ADSR.map((p) => ({ ...p })),
  };
}
