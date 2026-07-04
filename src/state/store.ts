import { create } from 'zustand';
import { Note, Project } from '../model/types';
import { parseHuiNotation, nearestHui } from '../model/guqin';

interface AudioMeta { fileName: string; durationSec: number; sampleRate: number; }
export type EditingField = 'string' | 'position';

interface AppState {
  notes: Note[];
  selectedId: string | null;
  editingField: EditingField;
  audio: AudioMeta | null;
  currentTime: number;
  // 快捷鍵輸入緩衝字串的鏡射(2026-07-04 定案,見 施作注意事項 B7):
  // useGlobalShortcuts 仍以 ref 為即時邏輯來源(避免每個按鍵都觸發 React 重繪的邏輯判斷延遲),
  // 但每次變動都同步寫回這裡,好讓 StatusBar 能訂閱顯示「編輯中:欄位 = 已輸入字串」。
  editBuffer: string;
  addNote: (n: Note) => void;
  removeNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  cycleEditingField: () => void;
  setNoteString: (id: string, string: number) => void;
  setNoteHuiNotation: (id: string, notation: string) => void;
  setNotePosition: (id: string, position: number) => void;
  nudgeNoteTime: (id: string, deltaSec: number) => void;
  setAudio: (a: AudioMeta) => void;
  setCurrentTime: (t: number) => void;
  setEditBuffer: (buffer: string) => void;
  loadProject: (p: Project) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  notes: [],
  selectedId: null,
  editingField: 'string',
  audio: null,
  currentTime: 0,
  editBuffer: '',
  addNote: (n) => set((s) => ({ notes: [...s.notes, n] })),
  removeNote: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  selectNote: (id) => set({ selectedId: id, editingField: 'string' }),
  cycleEditingField: () =>
    set((s) => ({ editingField: s.editingField === 'string' ? 'position' : 'string' })),
  setNoteString: (id, string) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, string: string as Note['string'] } : n)),
    })),
  setNoteHuiNotation: (id, notation) =>
    set((s) => ({
      notes: s.notes.map((n) => {
        if (n.id !== id) return n;
        // 泛音只能落在整數徽位:帶非零小數(如 "7.6")會讓 position 與 hui 互相矛盾,直接拒絕。
        if (n.type === 'fan' && !/^\d{1,2}$/.test(notation.trim())) {
          throw new Error(`泛音只能使用整數徽位,不可帶小數: "${notation}"`);
        }
        const position = parseHuiNotation(notation);
        return {
          ...n,
          huiNotation: notation,
          position,
          hui: n.type === 'fan' ? nearestHui(position) : n.hui,
        };
      }),
    })),
  // 按音在 PositionStrip 上點擊時直接寫入正規化 position,不經過徽分記法解析,
  // 避免把 "0.523" 這種字串塞給 parseHuiNotation 導致丟例外(見 Task 9)。
  setNotePosition: (id, position) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        (n.id === id ? { ...n, position, huiNotation: undefined } : n)),
    })),
  nudgeNoteTime: (id, deltaSec) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, startTime: Math.max(0, n.startTime + deltaSec) } : n),
    })),
  setAudio: (a) => set({ audio: a }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setEditBuffer: (buffer) => set({ editBuffer: buffer }),
  loadProject: (p) => set({ notes: p.notes, audio: p.audio, selectedId: null, editingField: 'string', editBuffer: '' }),
  reset: () => set({ notes: [], selectedId: null, editingField: 'string', audio: null, currentTime: 0, editBuffer: '' }),
}));
