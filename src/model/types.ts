export type NoteType = 'san' | 'fan' | 'an'; // 散音 / 泛音 / 按音

export interface EnvelopePoint { t: number; level: number; }   // t: 相對音起點秒數, level: 0..1
export interface SlidePoint    { t: number; position: number; } // t: 相對秒數, position: 0..1

export interface Note {
  id: string;
  startTime: number;            // 音樂中的絕對時間(秒)
  string?: 1|2|3|4|5|6|7;        // 哪一條弦;快捷鍵插入的占位音尚未指定時為 undefined
  type: NoteType;
  huiNotation?: string;          // 使用者輸入的徽分記法原文,如 "7.6"(泛音/按音用)
  position?: number;             // 弦上彈奏點,正規化 0..1;按音由 huiNotation 換算而來
  hui?: number;                  // 泛音專用整數徽位,由 huiNotation 換算而來
  adsr: EnvelopePoint[];
  slide?: SlidePoint[];          // 走手音(僅按音)
  jianzipu?: string;             // 預留減字譜欄位
  color?: string;
}

/** 一個音是否已可在展示區渲染:散音只需弦號,泛音/按音還需位置資訊 */
export function isNoteComplete(note: Note): boolean {
  if (note.string === undefined) return false;
  if (note.type === 'san') return true;
  return note.position !== undefined;
}

export interface Project {
  version: string;
  audio: { fileName: string; durationSec: number; sampleRate: number };
  notes: Note[];
  meta?: { title?: string; tuning?: number[] };
}

export const PROJECT_VERSION = '1';
